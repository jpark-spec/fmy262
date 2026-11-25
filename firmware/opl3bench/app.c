/* OPL3 BENCH: an OPL3 emulator rendered in the audio interrupt at 44.1 kHz, as the tracker would run it, with
 * every channel keyed on a bright two-operator patch (the worst case for Nuked). Three emulators, PRESET picks:
 *   0 Nuked OPL3 (opl3/opl3.c, LGPL-2.1), the prototype's
 *   1 Nuked OPL3 fast (vendor/libADLMIDI nuked_fast, LGPL-2.1: emu/nf_glue.c), bit-exact with Nuked
 *   2 DOSBox DBOPL (emu/dbopl/dbopl.c, GPL-2.0-or-later), table-driven: Chocolate Doom's C conversion as it is,
 *     from the flash (emu/db_xip.c)
 *   3 the same specialised per synth mode, as DOSBox's C++ templates are (emu/db_spec.c)
 *   4 specialised, its render in RAM (emu/db_ram.c)
 *   K1        channels keyed: 0 .. 18
 *   HOME      peak cleared
 *   MASTER    volume (it starts loud: turn it down first)
 * The screen: the render's time per block against its budget, the platform's audio load (plat_cpu_pct), xruns.
 * Part of fm1-base's unity build (device/unity.c, host/plat_host.c): gfx.c is in scope. */
#include "opl3.h"

#define SR 44100u
static opl3_chip chip PLAT_POOL;         /* ~21 KB, zeroed by the platform; OPL3_Reset sets it up */
void nf_init(uint32_t rate);             /* emu/nf_glue.c */
void nf_write(uint16_t reg, uint8_t v);
void nf_render(int16_t *lr, uint32_t n);
#define DB_DECL(p) void p##_init(uint32_t rate); void p##_write(uint16_t reg, uint8_t v); \
    void p##_render(int16_t *lr, uint32_t n);
DB_DECL(dbx)                             /* emu/db_xip.c, db_spec.c, db_ram.c */
DB_DECL(dbs)
DB_DECL(dbr)
enum { EMU_NUKED, EMU_FAST, EMU_DBOPL, EMU_DB_SPEC, EMU_DB_RAM, NEMU };
static const char *const EMU_NAME[NEMU] = {"NUKED", "NUKED FAST", "DBOPL", "DBOPL SPEC", "DBOPL RAM"};
static volatile int32_t want_emu = EMU_NUKED;
static int32_t have_emu = -1;
static int16_t s16[2 * APP_BLOCK];       /* one block from the emulator, 16-bit stereo */
static volatile int32_t want_ch = 18;    /* the UI's request, applied by the render (it owns the chip) */
static int32_t have_ch = -1;
static volatile uint32_t blk_us, peak_us, blk_n, budget_us;
/* the core's counters around the last render (device: felucca-bsp fm1_perf.h, in scope before the app): clock
 * cycles, and the cycles counted against instruction fetches, data reads and data writes (stalls) */
static volatile uint32_t blk_cyc, blk_if, blk_rd, blk_wr, perf_on;
#ifdef PLAT_HOST
static uint32_t perf_cyc(void) { return 0; }
static void perf_st(uint32_t s[3]) { s[0] = s[1] = s[2] = 0; }
#else
static uint32_t perf_cyc(void) { return fm1_perf_cycles(); }
static void perf_st(uint32_t s[3]) { fm1_perf_stalls(s); }
#endif

static const uint8_t SLOT[9] = {0, 1, 2, 8, 9, 10, 16, 17, 18};
static uint16_t ch_base(int32_t ch) { return (uint16_t)((ch < 9 ? 0 : 0x100) + ch % 9); }

static void opl_w(uint16_t reg, uint8_t v)   /* a register of the emulator in use */
{
    if (have_emu == EMU_FAST)
        nf_write(reg, v);
    else if (have_emu == EMU_DBOPL)
        dbx_write(reg, v);
    else if (have_emu == EMU_DB_SPEC)
        dbs_write(reg, v);
    else if (have_emu == EMU_DB_RAM)
        dbr_write(reg, v);
    else
        OPL3_WriteReg(&chip, reg, v);
}
#define OPL3_WriteReg(c, r, v) opl_w((r), (v))   /* (patch_all and key_channels below, for whichever is in use) */

static void patch_all(void)              /* as firmware/bench/opl3_bench.c: a bright 2-op patch on all 18 */
{
    int32_t ch, j;
    OPL3_WriteReg(&chip, 0x105, 1);      /* OPL3 mode */
    for (ch = 0; ch < 18; ch++) {
        uint16_t bank = ch < 9 ? 0 : 0x100, k = (uint16_t)(ch % 9);
        for (j = 0; j < 2; j++) {
            uint16_t a = (uint16_t)(bank + SLOT[k] + j * 3);
            OPL3_WriteReg(&chip, (uint16_t)(0x20 + a), 0x21);
            OPL3_WriteReg(&chip, (uint16_t)(0x40 + a), j ? 0x08 : 0x10);
            OPL3_WriteReg(&chip, (uint16_t)(0x60 + a), 0xF2);
            OPL3_WriteReg(&chip, (uint16_t)(0x80 + a), 0x24);
            OPL3_WriteReg(&chip, (uint16_t)(0xE0 + a), j ? 0 : 2);
        }
        OPL3_WriteReg(&chip, (uint16_t)(0xC0 + bank + k), 0x3E);
        OPL3_WriteReg(&chip, (uint16_t)(0xA0 + bank + k), (uint8_t)(0x40 + ch * 7));
    }
}

static void key_channels(int32_t n)      /* channels 0 .. n-1 keyed, the rest released */
{
    int32_t ch;
    for (ch = 0; ch < 18; ch++)
        OPL3_WriteReg(&chip, (uint16_t)(0xB0 + ch_base(ch)), ch < n ? 0x31 : 0x11);
}

static void emu_start(int32_t e)         /* the render: switch to emulator e, patched, nothing keyed yet */
{
    have_emu = e;
    if (e == EMU_FAST)
        nf_init(SR);
    else if (e == EMU_DBOPL)
        dbx_init(SR);
    else if (e == EMU_DB_SPEC)
        dbs_init(SR);
    else if (e == EMU_DB_RAM)
        dbr_init(SR);
    else
        OPL3_Reset(&chip, SR);
    patch_all();
    have_ch = -1;
    peak_us = 0;
}

void app_init(void)
{
    emu_start(EMU_NUKED);
#ifndef PLAT_HOST
    fm1_perf_stalls_enable(1);           /* DBG_CON bits 0-2: the cycle and stall counters run (as the SDK's
                                          * cpu_effic_init); off at boot otherwise */
    perf_on = fm1_perf_cycles_run();
#endif
}

void app_render(int32_t *lr, uint32_t n, uint32_t master_q12)
{
    uint32_t i, t0, us;
    int32_t g = (int32_t)master_q12;     /* 0..4096 */
    if (have_emu != want_emu)
        emu_start(want_emu);
    if (have_ch != want_ch) {
        have_ch = want_ch;
        key_channels(have_ch);
    }
    {
        uint32_t s0[3], s1[3], c0;
        perf_st(s0);
        c0 = perf_cyc();
        t0 = plat_ticks24();
        if (have_emu == EMU_FAST)
            nf_render(s16, n);
        else if (have_emu == EMU_DBOPL)
            dbx_render(s16, n);
        else if (have_emu == EMU_DB_SPEC)
            dbs_render(s16, n);
        else if (have_emu == EMU_DB_RAM)
            dbr_render(s16, n);
        else
            for (i = 0; i < n; i++)
                OPL3_GenerateResampled(&chip, s16 + 2 * i);
        for (i = 0; i < 2 * n; i++)
            lr[i] = (int32_t)s16[i] * g >> 5;            /* 16-bit at 4096 -> 23-bit: half the 24-bit range */
        us = (plat_ticks24() - t0) / PLAT_TICKS_PER_US;
        blk_cyc = perf_cyc() - c0;
        perf_st(s1);
        blk_if = s1[0] - s0[0];
        blk_rd = s1[1] - s0[1];
        blk_wr = s1[2] - s0[2];
    }
    blk_us = us;
    if (us > peak_us)
        peak_us = us;
    budget_us = n * 1000000u / SR;
    blk_n++;
}

void app_panic(void)
{
    want_ch = 0;
    have_ch = 0;
    key_channels(0);
}

/* --------------------------------------------------------------------- UI --- */
static struct {
    char msg[2][24];
    uint32_t msg_until, btn;
    uint8_t redraw;
} ui;

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

static void input(void)
{
    uint32_t btn = plat_buttons();
    int32_t e = plat_enc(EN_K1) + plat_enc(EN_SELECT), pe = plat_enc(EN_PRESET);
    if (pe) {
        want_emu = clamp(want_emu + pe, 0, NEMU - 1);
        ui.redraw = 1;
    }
    if (e) {
        want_ch = clamp(want_ch + e, 0, 18);
        peak_us = 0;
        ui.redraw = 1;
    }
    if ((btn & (1u << B_HOME)) && !(ui.btn & (1u << B_HOME))) {
        peak_us = 0;
        ui.redraw = 1;
    }
    ui.btn = btn;
}

void app_input_only(void) { input(); }

static void row(int32_t y, const char *label, const char *value, uint16_t col)
{
    cv_text(10, y, &FONT_XS, label, C_GRAY);
    cv_text(110, y - 4, &FONT_B, value, col);
}

static void draw(void)
{
    char t[32], *p;
    uint32_t now = plat_ms(), us = blk_us, pk = peak_us, bud = budget_us ? budget_us : 1u;
    uint32_t pm = us * 1000u / bud, pkm = pk * 1000u / bud;   /* per mille of the block's time */
    cv_begin(240, 32, C_BLACK);
    if (now < ui.msg_until) {
        int32_t x = cv_text(10, 6, &FONT_B, ui.msg[0], C_WHITE);
        cv_text(x + 8, 6, &FONT_B, ui.msg[1], C_HI);
    } else {
        int32_t x = cv_text(10, 6, &FONT_B, APP_NAME, C_WHITE);
        cv_text(x + 10, 6, &FONT_B, EMU_NAME[want_emu], C_HI);   /* the emulator (PRESET) */
    }
    cv_blit(0, 0);

    cv_begin(240, 60, C_BLACK);
    p = num(t, (uint32_t)want_ch);
    put(p, " / 18");
    row(8, "CHANNELS (K1)", t, C_HI);
    p = num(t, pm / 10u);
    p = put(p, ".");
    p = num(p, pm % 10u);
    put(p, " %");
    row(36, "RENDER LOAD", t, pm > 500u ? C_WHITE : C_HI);
    cv_blit(0, 40);

    cv_begin(240, 60, C_BLACK);
    p = num(t, us);
    p = put(p, " / ");
    p = num(p, bud);
    put(p, " US");
    row(8, "BLOCK", t, C_AMB);
    p = num(t, pkm / 10u);
    p = put(p, ".");
    p = num(p, pkm % 10u);
    put(p, " %");
    row(36, "PEAK (HOME)", t, C_AMB);
    cv_blit(0, 100);

    cv_begin(240, 80, C_BLACK);
    p = num(t, plat_cpu_pct());
    put(p, " %");
    row(8, "AUDIO LOAD", t, C_HI);
    num(t, plat_xruns());
    row(36, "XRUNS", t, plat_xruns() ? C_WHITE : C_HI);
    {
        uint32_t khz = plat_cpu_khz();
        if (khz) {
            p = num(t, khz / 1000u);
            put(p, " MHZ");
        } else {
            put(t, "?");
        }
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
/* tools/fm1_remote.py log: the last block's numbers (each line 40 characters at most) */
static char *kv(char *p, const char *k, uint32_t v)
{
    p = put(p, k);
    return num(p, v);
}
static uint32_t permille(uint32_t a, uint32_t b) { return b ? (uint32_t)((uint64_t)a * 1000u / b) : 0u; }

void app_log(void (*line)(const char *t))
{
    char t[48], *p;
    uint32_t cyc = blk_cyc, ifs = blk_if, rds = blk_rd, wrs = blk_wr, bud = budget_us;
    p = put(t, "opl ");
    p = put(p, EMU_NAME[have_emu < 0 ? 0 : have_emu]);
    line(t);
    p = kv(t, "opl ch ", (uint32_t)want_ch);
    p = kv(p, " us ", blk_us);
    p = kv(p, " bud ", bud);
    kv(p, " pm ", permille(blk_us, bud));
    line(t);
    p = kv(t, "opl peak_us ", peak_us);
    p = kv(p, " cpu% ", plat_cpu_pct());
    p = kv(p, " xr ", plat_xruns());
    kv(p, " mhz ", plat_cpu_khz() / 1000u);
    line(t);
    p = kv(t, "opl perf ", perf_on);
    p = kv(p, " cyc ", cyc);
    kv(p, " cyc/smp ", cyc / APP_BLOCK);
    line(t);
    p = kv(t, "opl stall if ", ifs);
    p = kv(p, " rd ", rds);
    kv(p, " wr ", wrs);
    line(t);
    p = kv(t, "opl stall pm if ", permille(ifs, cyc));
    p = kv(p, " rd ", permille(rds, cyc));
    kv(p, " wr ", permille(wrs, cyc));
    line(t);
}
