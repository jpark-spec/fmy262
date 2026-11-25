/* DBOPL (firmware/opl3bench/emu: the FM-1's own, DBOPL_SPEC with the tables made ahead for 44.1 kHz) as the browser
 * prototype's chip, with the same exports as wrap.c had for Nuked OPL3: opl_reset(rate), opl_write / opl_write_now,
 * opl_render(n) -> n stereo int16 frames. The chip always runs at 44.1 kHz as on the FM-1; another output rate is
 * reached by linear interpolation. */
#include <stddef.h>
#include <stdint.h>
void *memset(void *s, int c, size_t n){unsigned char*p=s;while(n--)*p++=(unsigned char)c;return s;}
void *memcpy(void *d, const void *s, size_t n){unsigned char*a=d;const unsigned char*b=s;while(n--)*a++=*b++;return d;}
void abort(void){__builtin_trap();}
#define PLAT_HOST 1
#define DBOPL_SPEC 1
#define DBOPL_PRE 1
#define DBOPL_SCOPE 1
#define DBV(x) dbs_##x
#include "db_variant.inc"

static int16_t out[2 * 4096], src[2 * 256];
static uint32_t rate = 44100, frac;      /* frac: the position between prev and src[0], 16.16 */
static int have, at;                     /* src frames made, the next one to use */
static int16_t prev[2];

__attribute__((export_name("opl_reset"))) void opl_reset(uint32_t r) { rate = r ? r : 44100; dbs_init(44100); frac = 0; have = at = 0; prev[0] = prev[1] = 0; }
__attribute__((export_name("opl_write"))) void opl_write(uint32_t reg, uint32_t v) { dbs_write((uint16_t)reg, (uint8_t)v); }
__attribute__((export_name("opl_write_now"))) void opl_write_now(uint32_t reg, uint32_t v) { dbs_write((uint16_t)reg, (uint8_t)v); }
static void next(void) { prev[0] = src[2 * at]; prev[1] = src[2 * at + 1]; if (++at >= have) { have = 64; dbs_render(src, (uint32_t)have); at = 0; } }
__attribute__((export_name("opl_render"))) int16_t *opl_render(uint32_t n)
{
    uint32_t i, step;
    if (n > 4096) n = 4096;
    if (rate == 44100) {                 /* the FM-1's rate: the chip's own samples */
        for (i = 0; i < n; i += 256) dbs_render(out + 2 * i, n - i < 256 ? n - i : 256);
        return out;
    }
    step = (uint32_t)(((uint64_t)44100 << 16) / rate);
    if (!have) { have = 64; dbs_render(src, 64); at = 0; }
    for (i = 0; i < n; i++) {
        int k;
        for (k = 0; k < 2; k++) out[2 * i + k] = (int16_t)(prev[k] + (((int32_t)(src[2 * at + k] - prev[k]) * (int32_t)(frac >> 1)) >> 15));
        frac += step;
        while (frac >= 0x10000) { frac -= 0x10000; next(); }
    }
    return out;
}

/* the scope (web/template.html's waveform screens): on/off, and OPL channel ch's last n samples (22.05 kHz) */
static int16_t scope[512];
__attribute__((export_name("opl_scope_on"))) void opl_scope_on(uint32_t on) { dbs_scope_on((int)on); }
__attribute__((export_name("opl_scope"))) int16_t *opl_scope(int32_t ch, uint32_t n) { if (n > 448) n = 448; dbs_scope_read(ch, scope, n); return scope; }
