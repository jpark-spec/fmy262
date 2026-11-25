/* firmware/ui on the host for tests/t44.cjs: the demo song, a script of inputs, screenshots as raw RGB565.
 *   ui_host SCRIPT OUTDIR
 * Script lines: wait MS | knob K D (K 0..3, sel, pre, alg) | down BTN | up BTN | tap BTN | key K down|up |
 *   pos ORD ROW | shot NAME (OUTDIR/NAME.raw: 240 x 240, little-endian 16-bit) | calls (print the engine calls since) */
#include "ui.h"
#include "slots.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../../player/songs.h"

static uint32_t mem[192 * 1024 / 4];
static UiSong song;
static uint32_t t;
static char calls[4096];
static void logc(const char *s) { if (strlen(calls) + strlen(s) + 2 < sizeof calls) { strcat(calls, s); strcat(calls, "\n"); } }
static void h_play(void *u, int o, int r, int l) { char b[64]; (void)u; snprintf(b, sizeof b, "play %d %d %d", o, r, l); logc(b); }
static void h_stop(void *u) { (void)u; logc("stop"); }
static void h_on(void *u, int c, int i, int n, const EngIns *p) { char b[64]; (void)u; snprintf(b, sizeof b, "on %d %d %d%s", c, i, n, p ? " patch" : ""); logc(b); }
static void h_off(void *u, int c) { char b[32]; (void)u; snprintf(b, sizeof b, "off %d", c); logc(b); }
static void h_mute(void *u, uint32_t m) { char b[32]; (void)u; snprintf(b, sizeof b, "mute %X", m); logc(b); }

/* the slots on a model of the flash (RAM, NOR's AND) */
static uint8_t fl[6 * 65536];
static SlStore slt;
static int f_erase(void *u, uint32_t off) { (void)u; memset(fl + off, 0xFF, 4096); return 0; }
static int f_write(void *u, uint32_t off, const void *src, uint32_t n) { uint32_t i; (void)u; for (i = 0; i < n; i++) fl[off + i] &= ((const uint8_t *)src)[i]; return 0; }
static const uint8_t *f_ptr(void *u, uint32_t off) { (void)u; return off < sizeof fl ? fl + off : 0; }
static int h_info(void *u, int k, UiSlot *o) { SlInfo I; (void)u; if (!sl_info(&slt, k, &I)) return 0; memcpy(o->name, I.name, 21); o->pats = I.pats; o->len = I.len; o->size = I.size; return 1; }
static int h_save(void *u, int k) { char b[32]; (void)u; snprintf(b, sizeof b, "save %d", k); logc(b); return sl_save(&slt, k, &song); }
static int h_load(void *u, int k) { (void)u; return k < 0 ? ui_new_song(&song) : sl_load(&slt, k, &song); }
static int h_del(void *u, int k) { (void)u; return sl_delete(&slt, k); }
static int h_ren(void *u, int k, const char *n) { (void)u; return sl_rename(&slt, k, n); }
static void h_prefs(void *u) { (void)u; logc("prefs"); }
/* the waveform screen: made-up waves, the same as web/template.html's fakeScope (tests/t44) */
static void h_scope_on(void *u, int on) { (void)u; (void)on; }
static int h_scope(void *u, int t, int16_t *dst, int n)
{
    int p = 20 + t * 7, a = 2000 + t * 400, i;
    (void)u;
    for (i = 0; i < n; i++) dst[i] = (int16_t)(((i + t * 13) % p) * 2 * a / p - a);
    return 1;
}

static const char *BN[UB_N] = {"FX", "SEL", "ENV", "LFO", "EDIT", "GLO", "HOME", "SAVE", "ARP", "SEQ", "PLAY", "REC", "OCT-", "OCT+"};
static int btn(const char *s) { int i; for (i = 0; i < UB_N; i++) if (!strcmp(BN[i], s)) return i; fprintf(stderr, "no button %s\n", s); exit(2); }
static void step(uint32_t ms)            /* the clock in 16 ms frames, as a page's */
{
    uint32_t end = t + ms;
    while (t < end) { t = t + 16 < end ? t + 16 : end; ui_time(t); }
}

int main(int argc, char **argv)
{
    UiHost h = {h_play, h_stop, h_on, h_off, h_mute, 0, h_info, h_save, h_load, h_del, h_ren, h_prefs, h_scope_on, h_scope, 0, 0, 0, 0, 0};
    static const SlFlash FLM = {f_erase, f_write, f_ptr, 0};
    static const uint32_t BASE[SL_REGIONS] = {0, 0x10000, 0x20000, 0x30000, 0x40000};
    static uint16_t px[240 * 240];
    char line[256];
    FILE *f;
    if (argc < 3) { fprintf(stderr, "ui_host SCRIPT OUTDIR\n"); return 2; }
    f = fopen(argv[1], "r");
    if (!f) { perror(argv[1]); return 2; }
    memset(fl, 0xFF, sizeof fl);
    sl_init(&slt, &FLM, BASE);
    us_init(&song, mem, sizeof mem);
    if (us_load(&song, SONGS[0])) { fprintf(stderr, "song did not fit\n"); return 1; }
    t = 1000;
    ui_init(&song, &h, t);
    while (fgets(line, sizeof line, f)) {
        char a[64] = "", b[64] = "", c[64] = "";
        int n = sscanf(line, "%63s %63s %63s", a, b, c);
        if (n < 1 || a[0] == '#') continue;
        ui_time(t);
        if (!strcmp(a, "wait")) step((uint32_t)atoi(b));
        else if (!strcmp(a, "knob")) {
            int k = !strcmp(b, "sel") ? UI_SEL : !strcmp(b, "pre") ? UI_PRE : !strcmp(b, "alg") ? UI_ALG : atoi(b);
            ui_knob(k, atoi(c));
        } else if (!strcmp(a, "down")) ui_down(btn(b));
        else if (!strcmp(a, "up")) ui_up(btn(b));
        else if (!strcmp(a, "tap")) { ui_down(btn(b)); ui_up(btn(b)); }
        else if (!strcmp(a, "key")) ui_key(atoi(b), !strcmp(c, "down"));
        else if (!strcmp(a, "pos")) ui_pos(atoi(b), atoi(c), 0);
        else if (!strcmp(a, "calls")) { fputs(calls, stdout); calls[0] = 0; }
        else if (!strcmp(a, "shot")) {
            char path[512];
            FILE *o;
            int y;
            ui_frame();
            for (y = 0; y < 240; y += 40) ui_draw(px + y * 240, y, 40);   /* in strips, as the device */
            snprintf(path, sizeof path, "%s/%s.raw", argv[2], b);
            o = fopen(path, "wb");
            if (!o) { perror(path); return 2; }
            fwrite(px, 2, 240 * 240, o);
            fclose(o);
        } else { fprintf(stderr, "? %s", line); return 2; }
    }
    fclose(f);
    return 0;
}
