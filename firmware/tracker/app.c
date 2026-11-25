/* FMY262: the OPL3 tracker on the FM-1.
 *   the render (audio interrupt): the engine (firmware/engine/eng.c) driving DBOPL (opl3bench/emu/db_spec.c)
 *   the main loop: the screen and the controls (firmware/ui/ui.c, web/template.html in C) over the song being edited
 *     (firmware/ui/uisong.c: its patterns and macro steps in the arena, firmware/engine/songmem.c)
 * The UI calls the engine (UiHost) and edits the song only inside plat_lock (the audio interrupt held off: a lock
 * nests), so the render never sees half an edit; the engine's row callback (in the render) leaves the position for
 * the main loop, which hands it to the UI. The screen is drawn in strips of 40 rows, two buffers: one is drawn while
 * the other goes out by DMA. The four song slots are in the flash (firmware/ui/slots.c); a save or a load lets the lock
 * go meanwhile (the engine let go of the song first, for a load), so the sound goes on. The settings and the user
 * presets are store objects (OBJ_PREFS, OBJ_PRESETS), saved when the UI says they changed. Part of fm1-base's unity
 * build (device/unity.c, host/plat_host.c). */
#include "eng.h"
#include "ui.h"
#include "slots.h"

#define SR 44100u
void dbs_init(uint32_t rate);            /* firmware/opl3bench/emu/db_spec.c */
void dbs_write(uint16_t reg, uint8_t v);
void dbs_render(int16_t *lr, uint32_t n);
void dbs_scope_on(int on);              /* (DBOPL_SCOPE: the waveform screen) */
void dbs_scope_read(int opl_ch, int16_t *dst, uint32_t n);
void dbs_split(int (*run)(void (*)(uint32_t), uint32_t), int (*wait)(void));   /* (the second core) */

#include "songs.h"                       /* firmware/player/songs.h (tools/song2c.cjs): the demo song */

#define ARENA_BYTES (192u * 1024u)
static uint32_t arena_mem[ARENA_BYTES / 4] PLAT_POOL;
static UiSong song PLAT_POOL;
static Eng eng PLAT_POOL;
static int16_t s16[2 * APP_BLOCK];
static volatile uint32_t blk_us, peak_us, budget_us, blk_cyc, load_fail, win_us;
static volatile int32_t pos_ord = -1, pos_row = -1;
static volatile uint32_t pos_n, pos_trig;   /* rows played (the render counts, the main loop compares), tracks hit */

#ifdef PLAT_HOST
static uint32_t perf_cyc(void) { return 0; }
#else
static uint32_t perf_cyc(void) { return fm1_perf_cycles(); }
#endif

static void w_chip(void *u, uint16_t reg, uint8_t v) { (void)u; dbs_write(reg, v); }
static void r_chip(void *u, int16_t *lr, uint32_t n) { (void)u; dbs_render(lr, n); }
/* the settings' sound (HOME menu): SPEAKER EQ and the CLICK / COUNT-IN blips, in the render after the engine. The
 * filters are the web page's (Web Audio's biquads: highpass 150 Hz Q 0.7 dB, lowshelf 140 Hz +6 dB), at 44.1 kHz.
 * A blip: a sine, 1760 Hz on the bar's beat or 1320, from LOW/MID/HIGH (.08/.18/.35 of full scale, as the page's)
 * falling to 1/1000 in 50 ms, 60 ms long; it starts at the next block (within 5.8 ms) and follows MASTER */
static const float EQ_B[3][3] = {{1, 0, 0}, {0.99012560f, -1.98025119f, 0.99012560f}, {1.00490740f, -1.97612761f, 0.97177562f}};
static const float EQ_A[3][2] = {{0, 0}, {-1.98002506f, 0.98047732f}, {-1.97626613f, 0.97654450f}};
static volatile int eq_mode, clk_on, clk_lv, bl_req;   /* bl_req: 0 none, 1 a beat, 2 the bar's beat (+ level * 4) */
static float eq_z[2][4];                 /* per channel: x1 x2 y1 y2 */
static struct { int n; float a, k, c, s1, s2; } bl;
static const float BL_LV[3] = {0.08f * 16384, 0.18f * 16384, 0.35f * 16384};   /* (s16 16384 = full scale at MASTER up) */
static void bl_start(int accent, int lv)
{
    bl.n = 2646; bl.a = BL_LV[lv < 0 ? 0 : lv > 2 ? 2 : lv]; bl.k = 0.99687213f;
    bl.c = accent ? 0.96872473f : 0.98236725f;
    bl.s2 = 0; bl.s1 = accent ? 0.24813785f : 0.18696144f;   /* sin(w): the recurrence's first step */
}
static void sound_after(int16_t *v, uint32_t n)
{
    uint32_t i;
    int m = eq_mode, c;
    if (bl_req) { int r = bl_req; bl_req = 0; bl_start(r & 3, r >> 2); }
    if (m > 0 && m < 3) {
        const float *b = EQ_B[m], *a = EQ_A[m];
        for (c = 0; c < 2; c++) {
            float *z = eq_z[c];
            for (i = 0; i < n; i++) {
                float x = v[2 * i + c], y = b[0] * x + b[1] * z[0] + b[2] * z[1] - a[0] * z[2] - a[1] * z[3];
                z[1] = z[0]; z[0] = x; z[3] = z[2]; z[2] = y;
                v[2 * i + c] = (int16_t)(y > 32767.f ? 32767 : y < -32768.f ? -32768 : (int)y);
            }
        }
    }
    for (i = 0; i < n && bl.n > 0; i++, bl.n--) {
        float s = bl.s1, t = s * bl.a;
        int32_t l = v[2 * i] + (int32_t)t, r = v[2 * i + 1] + (int32_t)t;
        v[2 * i] = (int16_t)(l > 32767 ? 32767 : l < -32768 ? -32768 : l);
        v[2 * i + 1] = (int16_t)(r > 32767 ? 32767 : r < -32768 ? -32768 : r);
        bl.s1 = 2 * bl.c * s - bl.s2; bl.s2 = s;
        if (bl.n > 2646 - 2205) bl.a *= bl.k;   /* (the last 10 ms stay at 1/1000) */
    }
}
static void at_row(void *u, int ord, int row, uint32_t trig)
{
    (void)u;
    pos_ord = ord; pos_row = row; pos_trig |= trig; pos_n++;
    if (clk_on && row % 4 == 0) bl_req = (row % 16 == 0 ? 2 : 1) | clk_lv << 2;   /* CLICK (in the render) */
}

/* the UI's calls to the engine: always inside the main loop's lock (lk) */
static void h_play(void *u, int o, int r, int l) { (void)u; eng_play(&eng, o, r, l); }
static void h_stop(void *u) { (void)u; eng_stop(&eng); }
static void h_on(void *u, int c, int i, int n, const EngIns *p) { (void)u; eng_on(&eng, c, i, n, p); }
static void h_off(void *u, int c) { (void)u; eng_off(&eng, c); }
static void h_mute(void *u, uint32_t m) { (void)u; eng_mute(&eng, m); }
static void h_tune(void *u, int c) { (void)u; eng_tune(&eng, c); }
static void h_eq(void *u, int m) { (void)u; if (m != eq_mode) { memset(eq_z, 0, sizeof eq_z); eq_mode = m; } }
static void h_click(void *u, int on, int lv) { (void)u; clk_lv = lv; clk_on = on; }
static void h_blip(void *u, int accent, int lv) { (void)u; bl_req = (accent ? 2 : 1) | lv << 2; }

/* the UI calls these inside input()'s lock: a slot's flash work lets it go meanwhile (held: input() has it) */
static uint32_t held_lk;
static int held;
static void unhold(void) { if (held) plat_unlock(held_lk); }
static void rehold(void) { if (held) held_lk = plat_lock(); }

static SlStore slt;
static int slf_erase(void *u, uint32_t off) { (void)u; return plat_data_erase(off); }
static int slf_write(void *u, uint32_t off, const void *src, uint32_t n) { (void)u; return plat_data_write(off, src, n); }
static const uint8_t *slf_ptr(void *u, uint32_t off) { (void)u; return plat_data(off); }
static const SlFlash FLASH = {slf_erase, slf_write, slf_ptr, 0};
static const uint32_t REGIONS[SL_REGIONS] = {0x97000u, 0xA7000u, 0xB7000u, 0xC7000u, 0xE5000u};   /* (the last in XDATA1) */
static volatile uint32_t slot_ms, prefs_dirty, usb_rc;

static int h_info(void *u, int k, UiSlot *o)
{
    SlInfo I;
    (void)u;
    if (!sl_info(&slt, k, &I)) return 0;
    memcpy(o->name, I.name, sizeof o->name); o->pats = I.pats; o->len = I.len; o->size = I.size;
    return 1;
}
static int h_save(void *u, int k)
{
    int rc;
    uint32_t t = plat_ms();
    (void)u;
    unhold(); rc = sl_save(&slt, k, &song); rehold();
    slot_ms = plat_ms() - t;
    return rc;
}
static int h_rename(void *u, int k, const char *nm)
{
    int rc;
    (void)u;
    unhold(); rc = sl_rename(&slt, k, nm); rehold();
    return rc;
}
static int h_load(void *u, int k)
{
    int rc;
    uint32_t t = plat_ms();
    (void)u;
    eng_stop(&eng); eng.song = 0;        /* (inside the lock: the render lets go of the song) */
    unhold(); rc = k < 0 ? ui_new_song(&song) : sl_load(&slt, k, &song); rehold();
    eng_song(&eng, &song.e);
    slot_ms = plat_ms() - t;
    return rc;
}
static int h_delete(void *u, int k) { int rc; (void)u; unhold(); rc = sl_delete(&slt, k); rehold(); return rc; }
static void h_prefs(void *u) { (void)u; prefs_dirty = 1; }
/* the waveform screen: DBOPL keeps each channel's samples only while it is shown (off: not a cycle more) */
static void h_scope_on(void *u, int on) { (void)u; dbs_scope_on(on); }
static int h_scope(void *u, int track, int16_t *dst, int n)
{
    int k = eng_track_chan(&eng, track);
    (void)u;
    if (k < 0) return -1;
    dbs_scope_read(k, dst, (uint32_t)n);
    return 1;
}
/* SYSTEM · CPU LOAD: the platform's figure (the render's share of its budget), and the longest block of the last second */
static int h_cpu(void *u, int *peak, int *cores)
{
    static uint32_t t, shown;
    uint32_t ms = plat_ms(), bud = budget_us;
    (void)u;
    if (ms - t >= 1000u) { t = ms; shown = win_us; win_us = 0; }
    *peak = bud ? (int)(shown * 100u / bud) : 0;
    *cores = plat_cpu2_on() ? 2 : 1;
    return (int)plat_cpu_pct();
}
static const UiHost HOST = {h_play, h_stop, h_on, h_off, h_mute, h_tune, h_info, h_save, h_load, h_delete, h_rename, h_prefs, h_scope_on, h_scope,
                            h_eq, h_click, h_blip, h_cpu, 0};

/* ---- the slots as files over USB (companion): the main loop, outside the input's lock */
static const char *const FNAME[SL_SLOTS] = {"slot1.fmy", "slot2.fmy", "slot3.fmy", "slot4.fmy"};
uint32_t app_file_count(void) { return SL_SLOTS; }
int app_file(uint32_t i, plat_file_info_t *f)
{
    SlInfo I;
    if (i >= SL_SLOTS) return -1;
    f->name = FNAME[i]; f->kind = PLAT_FK_PROJECT; f->flags = PLAT_FF_READ | PLAT_FF_WRITE | PLAT_FF_DELETE;
    f->size = sl_info(&slt, (int)i, &I) ? I.size : 0; f->room = SL_ROOM;
    return 0;
}
int app_file_read(uint32_t i, uint32_t off, uint8_t *dst, uint32_t n) { return sl_read(&slt, (int)i, off, dst, n); }
int app_file_begin(uint32_t i, uint32_t size) { return sl_wbegin(&slt, (int)i, size) ? -1 : 0; }
int app_file_write(uint32_t i, uint32_t off, const uint8_t *src, uint32_t n) { (void)i; return sl_wdata(&slt, off, src, n); }
int app_file_commit(uint32_t i, uint32_t size, uint32_t crc)
{
    int rc;
    (void)size;
    rc = sl_wcommit(&slt, crc);
    usb_rc = (uint32_t)-rc;
    if (!rc) ui_slots_changed((int)i, 0);
    return rc ? -1 : 0;
}
int app_file_delete(uint32_t i)
{
    int rc = sl_delete(&slt, (int)i);
    if (!rc) ui_slots_changed((int)i, 1);
    return rc ? -1 : 0;
}
int app_file_busy(void) { return ui_playing(); }

/* the settings and the user presets: saved when changed (and only then: the flash wears) */
static char pbuf[1024], pkept[1024];
static uint8_t ubuf[1600], ukept[1600];
static uint32_t pkn, ukn;
static void keepPrefs(void)
{
    uint32_t n = ui_prefs(pbuf, sizeof pbuf), m = ui_presets(ubuf, sizeof ubuf);
    if (n != pkn || memcmp(pbuf, pkept, n)) { if (!plat_store_save(OBJ_PREFS, pbuf, n)) { memcpy(pkept, pbuf, n); pkn = n; } }
    if (m && (m != ukn || memcmp(ubuf, ukept, m))) { if (!plat_store_save(OBJ_PRESETS, ubuf, m)) { memcpy(ukept, ubuf, m); ukn = m; } }
}

void app_init(void)
{
    dbs_init(SR);
    eng_init(&eng, SR, w_chip, 0);
    eng.chip = r_chip; eng.pos = at_row;
    us_init(&song, arena_mem, ARENA_BYTES);
    load_fail = (uint32_t)us_load(&song, SONGS[0]);   /* (before the audio starts) */
    eng_song(&eng, &song.e);
    ui_init(&song, &HOST, plat_ms());
    sl_init(&slt, &FLASH, REGIONS);
    {
        int n = plat_store_load(OBJ_PREFS, pkept, sizeof pkept);
        if (n > 0) { pkn = (uint32_t)n; ui_prefs_load(pkept, pkn); }
        n = plat_store_load(OBJ_PRESETS, ukept, sizeof ukept);
        if (n > 0) { ukn = (uint32_t)n; ui_presets_load(ukept, ukn); }
    }
    /* both cores (docs/SECOND-CORE.md): the second renders OPL bank 1 each block (dbs_split), unless CORE is SINGLE. It can
     * start only now, before the audio; failing later (cpu2_fallback) it is given up and this core does it all */
    if (!ui_one_core() && plat_cpu2_set(1) == 0) dbs_split(plat_cpu2_run, plat_cpu2_wait);
    ui_restore();                        /* RESTORE LAST: the last slot's song */
#ifndef PLAT_HOST
    fm1_perf_stalls_enable(1);
#endif
}

void app_render(int32_t *lr, uint32_t n, uint32_t master_q12)
{
    uint32_t i, t0, c0, us;
    int32_t g = (int32_t)master_q12;     /* 0..4096 */
    c0 = perf_cyc();
    t0 = plat_ticks24();
    eng_render(&eng, s16, n);
    sound_after(s16, n);
    for (i = 0; i < 2 * n; i++) {        /* 16-bit at 4096 -> 4x the 24-bit range, clipped */
        int32_t v = (int32_t)s16[i] * g >> 3;
        lr[i] = v > 8388607 ? 8388607 : v < -8388607 ? -8388607 : v;
    }
    us = (plat_ticks24() - t0) / PLAT_TICKS_PER_US;
    blk_cyc = perf_cyc() - c0;
    blk_us = us;
    if (us > peak_us) peak_us = us;
    if (us > win_us) win_us = us;
    budget_us = n * 1000000u / SR;
}

void app_panic(void)
{
    eng_stop(&eng);
}

/* --------------------------------------------------------------------- input --- */
static struct { uint32_t btn, keys, seen, drawn, draw_us, draw_pk; } in;

static const uint8_t ENC[7][2] = {{EN_SELECT, UI_SEL}, {EN_ALGO, UI_ALG}, {EN_PRESET, UI_PRE}, {EN_K1, UI_K1},
                                  {EN_K2, UI_K2}, {EN_K3, UI_K3}, {EN_K4, UI_K4}};

static void input(void)
{
    uint32_t btn = plat_buttons(), keys = plat_keys(), ch;
    int i;
    held_lk = plat_lock(); held = 1;
    ui_time(plat_ms());
    if (pos_n != in.seen) {              /* the rows the render played since: the latest */
        uint32_t f = plat_lock(), trig = pos_trig;
        int32_t o = pos_ord, r = pos_row;
        pos_trig = 0; in.seen = pos_n;
        plat_unlock(f);
        ui_pos(o, r, trig);
    }
    for (i = 0; i < 7; i++) {
        int32_t d = plat_enc(ENC[i][0]);
        if (d) ui_knob(ENC[i][1], d);
    }
    ch = btn ^ in.btn;
    for (i = 0; i < UB_N && ch; i++)     /* (B_* and UB_* in the same order) */
        if (ch >> i & 1u) { if (btn >> i & 1u) ui_down(i); else ui_up(i); }
    ch = keys ^ in.keys;
    for (i = 0; i < 27 && ch; i++)
        if (ch >> i & 1u) ui_key(i, (int)(keys >> i & 1u));
    {   /* MIDI IN: USB, Bluetooth, the jack (the companion's own frames never come here) */
        uint32_t pkt;
        int port;
        while (plat_midi_in(&pkt, &port)) ui_midi(pkt);
    }
    held = 0; plat_unlock(held_lk);
    in.btn = btn; in.keys = keys;
    if (prefs_dirty) { prefs_dirty = 0; keepPrefs(); }
}

void app_input_only(void) { input(); }

void app_say(const char *a, const char *b)
{
    char t[64];
    int i = 0;
    while (a && *a && i < 30) t[i++] = *a++;
    if (b && *b && i < 31) t[i++] = ' ';
    while (b && *b && i < 62) t[i++] = *b++;
    t[i] = 0;
    ui_say(t);
}

/* -------------------------------------------------------------------- screen --- */
/* LEDS: the lit buttons and, by the setting, the unlit ones glowing (LO, HI) or the two the other way round (INV);
 * PLAY lit green, as plat_leds has it */
static void leds(uint32_t lit, uint32_t keys)
{
    uint32_t all = (1u << NB) - 1u, play = 1u << B_PLAY, b, d;
    int m = ui_led_mode(), inv = m >= 3, glow = m == 1 || m == 4 ? 1 : m == 2 || m == 5 ? 2 : 0;
    b = inv ? (m == 3 ? all & ~lit : 0u) : lit;
    d = glow ? all & ~(inv ? 0u : lit) & ~b : 0u;
    if (inv && m != 3) d = all & ~lit;
    b = (b & ~play) | (b & play ? LED_PLAY_GREEN : 0u);
    d = (d & ~play) | (d & play ? LED_PLAY_GREEN : 0u);
    plat_lights(b, keys, d, 0, glow);
}
#define STRIP 40
static uint16_t strip[2][240 * STRIP] PLAT_POOL;

static void draw(void)
{
    uint32_t t0 = plat_ticks24(), us, rgb[UB_N], lk;
    int y, k = 0;
    lk = plat_lock();
    ui_frame();
    plat_unlock(lk);
    for (y = 0; y < 240; y += STRIP, k ^= 1) {
        lcd_sync();                      /* (this buffer went out two strips ago: done before it is drawn over) */
        ui_draw(strip[k], y, STRIP);
        lcd_blit(0, (uint32_t)y, 240, STRIP, strip[k]);
    }
    leds(ui_leds(rgb), ui_keys());
    us = (plat_ticks24() - t0) / PLAT_TICKS_PER_US;
    in.draw_us = us;
    if (us > in.draw_pk) in.draw_pk = us;
}

void app_ui_init(void)
{
    static int first = 1;
    in.drawn = plat_ms() - 1000u;
    if (first) { uint32_t lk = plat_lock(); first = 0; ui_about_start(plat_ms()); plat_unlock(lk); }   /* (after the platform's own) */
}

void app_frame(void)
{
    uint32_t now = plat_ms();
    input();
    if (now - in.drawn >= 33u) {         /* ~30 frames a second */
        in.drawn = now;
        draw();
    }
}

/* ------------------------------------------------------------ USB readout --- */
static char *num(char *d, uint32_t v)
{
    char t[12];
    int k = 0;
    do t[k++] = (char)('0' + v % 10u); while ((v /= 10u) && k < 11);
    while (k) *d++ = t[--k];
    *d = 0;
    return d;
}
static char *put(char *d, const char *s) { while (*s) *d++ = *s++; *d = 0; return d; }
static char *kv(char *p, const char *k, uint32_t v) { return num(put(p, k), v); }
static uint32_t permille(uint32_t a, uint32_t b) { return b ? a * 1000u / b : 0u; }

void app_log(void (*line)(const char *t))
{
    char t[48], *p;
    uint32_t bud = budget_us;
    p = put(t, "trk ");
    p = put(p, ui_playing() ? "play" : "stop");
    p = kv(p, " ord ", (uint32_t)pos_ord);
    kv(p, " row ", (uint32_t)pos_row);
    line(t);
    p = kv(t, "trk us ", blk_us);
    p = kv(p, " pm ", permille(blk_us, bud));
    p = kv(p, " pk ", permille(peak_us, bud));
    kv(p, " c/s ", blk_cyc / APP_BLOCK);
    line(t);
    p = kv(t, "trk cpu% ", plat_cpu_pct());
    p = kv(p, " cores ", plat_cpu2_on() ? 2 : 1);   /* (the second core: why it is off, the jobs it misread) */
    p = kv(p, " off ", (uint32_t)plat_cpu2_gave_up());
    p = kv(p, " bad ", plat_cpu2_bad());
    p = kv(p, " xr ", plat_xruns());
    p = kv(p, " draw ", in.draw_us);
    kv(p, " pk ", in.draw_pk);
    line(t);
    p = kv(t, "trk slot ms ", slot_ms);
    p = kv(p, " seq ", slt.seq);
    kv(p, " usb ", usb_rc);
    line(t);
    p = kv(t, "trk arena ", ARENA_BYTES - sm_free(&song.a));
    p = kv(p, " of ", ARENA_BYTES);
    kv(p, " fail ", load_fail);
    line(t);
}
