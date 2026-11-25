/* OPL3 PLAYER: the tracker's engine (firmware/engine/eng.c, web/engine.js in C) driving DBOPL (specialised per
 * synth mode: firmware/opl3bench/emu/db_spec.c) in the audio interrupt at 44.1 kHz, a song from songs.h
 * (tools/song2c.cjs). The engine and the chip belong to the render; the UI sends it messages through a ring.
 *   PLAY      play from the start / stop
 *   PRESET    song
 *   keys      notes on track 9 (instrument K1, octave OCT- / OCT+), as the prototype's preview
 *   HOME      peak cleared
 *   MASTER    volume
 * The screen: position, the render's time per block (engine + chip) against its budget, the platform's audio load
 * (plat_cpu_pct), xruns. Part of fm1-base's unity build (device/unity.c, host/plat_host.c): gfx.c is in scope. */
#include "eng.h"
#include "songmem.h"

#define SR 44100u
void dbs_init(uint32_t rate);            /* firmware/opl3bench/emu/db_spec.c */
void dbs_write(uint16_t reg, uint8_t v);
void dbs_render(int16_t *lr, uint32_t n);

/* ------------------------------------------------------------- the songs --- */
#include "psong.h"
#include "songs.h"

/* the song playing: its patterns and macro steps in the arena (firmware/engine/songmem.c), its instruments, header
 * and tables in RAM, as an editor will want them */
#define ARENA_BYTES (192u * 1024u)
static uint32_t arena_mem[ARENA_BYTES / 4] PLAT_POOL;
static SmArena arena PLAT_POOL;
static EngFmm fmm[SM_FMMS] PLAT_POOL;
static EngIns inst[255] PLAT_POOL;
static EngSong song PLAT_POOL;
static volatile uint32_t arena_used, load_fail;

static void song_load(const PSong *P)   /* (the main loop's, with the engine off the song: M_DETACH) */
{
    uint32_t i, r;
    int p, k;
    sm_init(&arena, arena_mem, ARENA_BYTES, P->h.rows, fmm);
    load_fail = 0;
    for (p = 0; p < P->npat; p++) {
        const uint16_t *ix = P->rows[p];
        if (!ix) continue;
        if (sm_new(&arena, p)) load_fail++;
        for (r = 0; r < P->h.rows; r++)
            for (i = ix[r]; i < ix[r + 1]; i++)
                if (sm_set(&arena, p, (int)r, P->cells[i].track, &P->cells[i].c)) load_fail++;
    }
    song.ninst = P->h.ninst < 255 ? P->h.ninst : 255;
    for (k = 0; k < song.ninst; k++) {
        inst[k] = P->h.inst[k];
        if (inst[k].fmm) {
            fmm[k] = *inst[k].fmm;
            if (sm_fmm(&arena, k + 1, inst[k].fmm->steps, inst[k].fmm->len)) { load_fail++; inst[k].fmm = 0; }
            else inst[k].fmm = &fmm[k];   /* (its steps pointer kept by the arena) */
        }
    }
    song.rows = P->h.rows; song.bpm = P->h.bpm; song.speed = P->h.speed; song.lfo = P->h.lfo; song.opl = P->h.opl;
    song.perc = P->h.perc; song.four = P->h.four; song.gvol = P->h.gvol; song.vtab = P->h.vtab; song.mspd = P->h.mspd; song.vdir = 0;
    song.norder = P->h.norder; song.order = P->h.order; song.inst = inst;
    for (i = 0; i < 16; i++) { song.arp[i] = P->arp[i]; song.vib[i] = P->vib[i]; }
    song.cell = sm_cell; song.user = &arena;
    arena_used = ARENA_BYTES - sm_free(&arena);
}

/* ------------------------------------------------------------ the render --- */
static Eng eng PLAT_POOL;                /* ~5 KB */
static int16_t s16[2 * APP_BLOCK];
enum { M_PLAY, M_STOP, M_DETACH, M_ATTACH, M_ON, M_OFF };
typedef struct { uint8_t t; int16_t a, b; } Msg;
static Msg q[32];
static volatile uint8_t q_in, q_out;     /* the UI writes q_in, the render q_out */
static volatile int32_t pos_ord, pos_row, playing, cur_song = -1, detached, want_song = -1;
static volatile uint32_t blk_us, peak_us, blk_n, budget_us, blk_cyc, master_now;

#ifdef PLAT_HOST
static uint32_t perf_cyc(void) { return 0; }
#else
static uint32_t perf_cyc(void) { return fm1_perf_cycles(); }
#endif

static void send(uint8_t t, int a, int b)
{
    uint8_t i = q_in, n = (uint8_t)((i + 1u) & 31u);
    if (n == q_out) return;              /* full: dropped */
    q[i].t = t; q[i].a = (int16_t)a; q[i].b = (int16_t)b;
    q_in = n;
}

static void w_chip(void *u, uint16_t reg, uint8_t v) { (void)u; dbs_write(reg, v); }
static void r_chip(void *u, int16_t *lr, uint32_t n) { (void)u; dbs_render(lr, n); }
static void at_row(void *u, int ord, int row, uint32_t trig) { (void)u; (void)trig; pos_ord = ord; pos_row = row; }

static void take(void)                   /* the render: the UI's messages */
{
    while (q_out != q_in) {
        const Msg *m = &q[q_out];
        switch (m->t) {
        case M_DETACH: eng_stop(&eng); eng.song = 0; playing = 0; detached = 1; break;   /* the arena the main loop's */
        case M_ATTACH: eng_song(&eng, &song); cur_song = m->a; detached = 0; pos_ord = pos_row = 0; break;
        case M_PLAY: eng_play(&eng, 0, 0, 0); playing = 1; peak_us = 0; break;
        case M_STOP: eng_stop(&eng); playing = 0; break;
        case M_ON: eng_on(&eng, 8, m->a, m->b, 0); break;
        case M_OFF: eng_off(&eng, 8); break;
        }
        q_out = (uint8_t)((q_out + 1u) & 31u);
    }
}

void app_init(void)
{
    dbs_init(SR);
    eng_init(&eng, SR, w_chip, 0);
    eng.chip = r_chip; eng.pos = at_row;
    song_load(SONGS[0]);                 /* (before the audio starts) */
    eng_song(&eng, &song);
    cur_song = 0;
#ifndef PLAT_HOST
    fm1_perf_stalls_enable(1);           /* the cycle counter runs (off at boot) */
#endif
}

void app_render(int32_t *lr, uint32_t n, uint32_t master_q12)
{
    uint32_t i, t0, c0, us;
    int32_t g = (int32_t)master_q12;     /* 0..4096 */
    master_now = master_q12;
    c0 = perf_cyc();
    t0 = plat_ticks24();
    take();
    eng_render(&eng, s16, n);
    for (i = 0; i < 2 * n; i++) {        /* 16-bit at 4096 -> 4x the 24-bit range, clipped (a song is quiet in DBOPL) */
        int32_t v = (int32_t)s16[i] * g >> 3;
        lr[i] = v > 8388607 ? 8388607 : v < -8388607 ? -8388607 : v;
    }
    us = (plat_ticks24() - t0) / PLAT_TICKS_PER_US;
    blk_cyc = perf_cyc() - c0;
    blk_us = us;
    if (us > peak_us)
        peak_us = us;
    budget_us = n * 1000000u / SR;
    blk_n++;
}

void app_panic(void)
{
    eng_stop(&eng);
    playing = 0;
}

/* --------------------------------------------------------------------- UI --- */
static struct {
    char msg[2][24];
    uint32_t msg_until, btn, keys;
    int32_t ins, oct, song, key;
    uint8_t redraw;
} ui = {{{0}}, 0, 0, 0, 7, 0, 0, -1, 1};

static void scopy(char *d, const char *s, uint32_t max)
{
    uint32_t i = 0;
    while (s && s[i] && i + 1u < max) {
        d[i] = s[i];
        i++;
    }
    d[i] = 0;
}

static char *num(char *d, uint32_t v)    /* v in decimal at d; returns the end */
{
    char t[12];
    int k = 0;
    do
        t[k++] = (char)('0' + v % 10u);
    while ((v /= 10u) && k < 11);
    while (k)
        *d++ = t[--k];
    *d = 0;
    return d;
}

static char *hex2(char *d, uint32_t v)
{
    static const char H[] = "0123456789ABCDEF";
    *d++ = H[v >> 4 & 15];
    *d++ = H[v & 15];
    *d = 0;
    return d;
}

static char *put(char *d, const char *s)
{
    while (*s)
        *d++ = *s++;
    *d = 0;
    return d;
}

void app_say(const char *a, const char *b)
{
    scopy(ui.msg[0], a, sizeof ui.msg[0]);
    scopy(ui.msg[1], b, sizeof ui.msg[1]);
    ui.msg_until = plat_ms() + 1500u;
    ui.redraw = 1;
}

static int pressed(uint32_t btn, int b) { return (btn & (1u << b)) && !(ui.btn & (1u << b)); }

static void input(void)
{
    uint32_t btn = plat_buttons(), keys = plat_keys(), dn = keys & ~ui.keys;
    int32_t pe = plat_enc(EN_PRESET), ke = plat_enc(EN_K1), k;
    const PSong *P = SONGS[ui.song];
    if (pe) {
        int32_t ns = clamp(ui.song + pe, 0, NSONGS - 1);
        if (ns != ui.song) {             /* (the encoder's jitter at an end: nothing) */
            ui.song = ns;
            want_song = ns;
            send(M_DETACH, 0, 0);
            ui.ins = 7;
            ui.redraw = 1;
        }
    }
    if (want_song >= 0 && detached) {    /* the engine let go: the song into the arena here, then back to it */
        song_load(SONGS[want_song]);
        send(M_ATTACH, want_song, 0);
        want_song = -1;
    }
    if (ke) {
        ui.ins = clamp(ui.ins + ke, 1, P->h.ninst);
        ui.redraw = 1;
    }
    if (pressed(btn, B_PLAY)) {
        send(playing ? M_STOP : M_PLAY, 0, 0);
        ui.redraw = 1;
    }
    if (pressed(btn, B_OCTDN)) { ui.oct = clamp(ui.oct - 1, -3, 3); ui.redraw = 1; }
    if (pressed(btn, B_OCTUP)) { ui.oct = clamp(ui.oct + 1, -3, 3); ui.redraw = 1; }
    if (pressed(btn, B_HOME)) { peak_us = 0; ui.redraw = 1; }
    if (dn) {                            /* the lowest new key: a note (F3 = MIDI 53) */
        for (k = 0; !(dn >> k & 1u); k++) ;
        ui.key = k;
        send(M_ON, ui.ins, 53 + k + 12 * ui.oct);
    } else if (ui.key >= 0 && !(keys >> ui.key & 1u)) {
        ui.key = -1;
        send(M_OFF, 0, 0);
    }
    ui.btn = btn;
    ui.keys = keys;
}

void app_input_only(void) { input(); }

static void row(int32_t y, const char *label, const char *value, uint16_t col)
{
    cv_text(10, y, &FONT_XS, label, C_GRAY);
    cv_text(110, y - 4, &FONT_B, value, col);
}

static char *pct(char *p, uint32_t pm)
{
    p = num(p, pm / 10u);
    p = put(p, ".");
    p = num(p, pm % 10u);
    return put(p, " %");
}

static void draw(void)
{
    char t[32], *p;
    uint32_t now = plat_ms(), us = blk_us, pk = peak_us, bud = budget_us ? budget_us : 1u;
    const PSong *P = SONGS[ui.song];
    cv_begin(240, 32, C_BLACK);
    if (now < ui.msg_until) {
        int32_t x = cv_text(10, 6, &FONT_B, ui.msg[0], C_WHITE);
        cv_text(x + 8, 6, &FONT_B, ui.msg[1], C_HI);
    } else {
        int32_t x = cv_text(10, 6, &FONT_B, APP_NAME, C_WHITE);
        cv_text(x + 10, 6, &FONT_B, P->name, C_HI);
    }
    cv_blit(0, 0);

    cv_begin(240, 60, C_BLACK);
    row(8, "PLAY", playing ? "PLAYING" : "STOPPED", playing ? C_HI : C_DIM);
    p = put(t, "ORD ");
    p = hex2(p, (uint32_t)pos_ord);
    p = put(p, "  ROW ");
    hex2(p, (uint32_t)pos_row);
    row(36, "POSITION", t, C_HI);
    cv_blit(0, 40);

    cv_begin(240, 60, C_BLACK);
    pct(t, us * 1000u / bud);
    row(8, "RENDER LOAD", t, us * 2u > bud ? C_WHITE : C_HI);
    pct(t, pk * 1000u / bud);
    row(36, "PEAK (HOME)", t, C_AMB);
    cv_blit(0, 100);

    cv_begin(240, 80, C_BLACK);
    p = num(t, plat_cpu_pct());
    p = put(p, " %   XR ");
    num(p, plat_xruns());
    row(8, "AUDIO LOAD", t, plat_xruns() ? C_WHITE : C_HI);
    {
        int hp = plat_headphones();
        p = num(t, master_now * 100u / 4096u);
        p = put(p, hp > 0 ? " %  PHONES" : hp == 0 ? " %  SPEAKER" : " %  ?");
        row(36, "MASTER / JACK", t, C_AMB);
    }
    {
        uint32_t khz = plat_cpu_khz();
        p = khz ? num(t, khz / 1000u) : put(t, "?");
        put(p, " MHZ");
        cv_text(10, 64, &FONT_XS, "CPU", C_GRAY);
        cv_text(40, 64, &FONT_XS, t, C_DIM);
        num(t, blk_n);
        cv_text(120, 64, &FONT_XS, "BLOCKS", C_GRAY);
        cv_text(170, 64, &FONT_XS, t, C_DIM);
    }
    cv_blit(0, 160);
}

void app_ui_init(void)
{
    lcd_fill(0, 0, 240, 240, C_BLACK);
    ui.redraw = 1;
}

void app_frame(void)
{
    static uint32_t last;
    uint32_t now = plat_ms();
    input();
    if (ui.redraw || now - last >= 250u) {   /* four times a second: the numbers move */
        ui.redraw = 0;
        last = now;
        draw();
    }
}

/* ------------------------------------------------------------ USB readout --- */
/* tools/fm1_remote.py log: the numbers (each line 40 characters at most) */
static char *kv(char *p, const char *k, uint32_t v)
{
    p = put(p, k);
    return num(p, v);
}
static uint32_t permille(uint32_t a, uint32_t b) { return b ? a * 1000u / b : 0u; }   /* (a: microseconds, small) */

void app_log(void (*line)(const char *t))
{
    char t[48], *p;
    uint32_t bud = budget_us;
    p = put(t, "ply ");
    p = put(p, cur_song >= 0 ? SONGS[cur_song]->name : "-");
    p = put(p, playing ? " play" : " stop");
    p = kv(p, " ord ", (uint32_t)pos_ord);
    kv(p, " row ", (uint32_t)pos_row);
    line(t);
    p = kv(t, "ply us ", blk_us);
    p = kv(p, " bud ", bud);
    p = kv(p, " pm ", permille(blk_us, bud));
    kv(p, " pk ", permille(peak_us, bud));
    line(t);
    p = kv(t, "ply cpu% ", plat_cpu_pct());
    p = kv(p, " xr ", plat_xruns());
    p = kv(p, " mhz ", plat_cpu_khz() / 1000u);
    kv(p, " cyc/smp ", blk_cyc / APP_BLOCK);
    line(t);
    p = kv(t, "ply master ", master_now);
    p = put(p, " jack ");
    p = put(p, plat_headphones() > 0 ? "phones" : plat_headphones() == 0 ? "none" : "?");
    line(t);
    p = kv(t, "ply arena ", arena_used);
    p = kv(p, " of ", ARENA_BYTES);
    kv(p, " fail ", load_fail);
    line(t);
}
