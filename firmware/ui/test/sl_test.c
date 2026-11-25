/* tests/t45.cjs: the song file (songfile.c) and the slots (slots.c) on a model of the flash.
 *   - random songs (the demo, edited at random) written and read back: the same bytes again, the same cells
 *   - saves, loads, renames and deletes in the four slots, checked against what each should hold
 *   - power cuts: a save stopped after any number of flash operations leaves the slot's old song or the new one,
 *     never neither, and the other slots as they were
 *   - damaged files refused, the song untouched */
#include "../slots.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../../player/songs.h"

static uint32_t rs = 1;
static uint32_t rnd(void) { rs = rs * 1664525u + 1013904223u; return rs >> 8; }
static int R(int n) { return (int)(rnd() % (uint32_t)n); }
#define CHECK(c) do { if (!(c)) { fprintf(stderr, "sl_test: %s (line %d)\n", #c, __LINE__); exit(1); } } while (0)

/* ------------------------------------------------------------- the flash --- */
#define FL_BASE 0x97000u
#define FL_SIZE (6u * 16u * 4096u)
static uint8_t fl[FL_SIZE];
static long budget = -1;                /* operations left before the power goes (-1: no cut) */
static int cut;
static int op(void) { if (budget == 0) { cut = 1; return 0; } if (budget > 0) budget--; return 1; }
static int f_erase(void *u, uint32_t off)
{
    (void)u;
    CHECK(off >= FL_BASE && off + 4096 <= FL_BASE + FL_SIZE && off % 4096 == 0);
    if (!op()) return -1;
    memset(fl + (off - FL_BASE), 0xFF, 4096);
    return 0;
}
static int f_write(void *u, uint32_t off, const void *src, uint32_t n)
{
    uint32_t i;
    (void)u;
    CHECK(off >= FL_BASE && off + n <= FL_BASE + FL_SIZE);
    CHECK((off & 0xFFF) + n <= 0xF00);   /* never the sectors' last 256 bytes */
    if (!op()) {                         /* the cut in the middle of this write: part of it */
        uint32_t k = n ? (uint32_t)R((int)n) : 0;
        for (i = 0; i < k; i++) fl[(off - FL_BASE) + i] &= ((const uint8_t *)src)[i];
        return -1;
    }
    for (i = 0; i < n; i++) fl[(off - FL_BASE) + i] &= ((const uint8_t *)src)[i];   /* NOR: bits to 0 only */
    return 0;
}
static const uint8_t *f_ptr(void *u, uint32_t off) { (void)u; return off >= FL_BASE && off < FL_BASE + FL_SIZE ? fl + (off - FL_BASE) : 0; }
static const SlFlash FL = {f_erase, f_write, f_ptr, 0};
static const uint32_t BASE[SL_REGIONS] = {FL_BASE, FL_BASE + 0x10000, FL_BASE + 0x20000, FL_BASE + 0x30000, FL_BASE + 0x50000};

/* ------------------------------------------------------------- the songs --- */
#define ARENA (192u * 1024u)
static uint32_t m1[ARENA / 4], m2[ARENA / 4];
static UiSong A, B;

static uint8_t bytes[2][200000];
static uint32_t nb;
static void grab(void *u, const uint8_t *b, uint32_t n) { uint8_t *d = (uint8_t *)u; CHECK(nb + n <= sizeof bytes[0]); memcpy(d + nb, b, n); nb += n; }
static uint32_t ser(const UiSong *s, int i) { nb = 0; CHECK(sf_write(s, grab, bytes[i]) == nb); return nb; }
static const uint8_t *mem; static uint32_t memn;
static int mget(void *u, uint32_t off, uint8_t *dst, uint32_t n) { (void)u; if (off + n > memn) return -1; memcpy(dst, mem + off, n); return 0; }

static void randomSong(UiSong *s, int big)
{
    int i, k, n;
    us_init(s, s == &A ? m1 : m2, ARENA);
    CHECK(!us_load(s, SONGS[0]));
    n = big ? 4000 : R(400);
    for (i = 0; i < n; i++) {
        EngCell c = US_EMPTY;
        int p = R(big ? 40 : 8);
        if (R(3)) { c.note = (int8_t)(R(5) ? R(96) + 12 : -2); c.ins = (uint8_t)R(s->e.ninst + 1); }
        if (R(2)) { c.fx[0] = (int8_t)R(48); c.v[0] = (uint8_t)R(256); }
        if (R(3) == 0) { c.fx[1] = (int8_t)R(48); c.v[1] = (uint8_t)R(256); }
        if (R(20) == 0) c = US_EMPTY;
        us_put(s, p, R(s->e.rows), R(ENG_TRACKS), &c);
    }
    for (k = 0; k < 3; k++) {            /* instruments, macros, tables, names */
        EngIns I = s->inst[R(s->e.ninst)];
        char nm[UI_NAME];
        snprintf(nm, sizeof nm, "R%d", R(1000));
        I.ft = (int8_t)(R(200) - 100); I.pan = (uint8_t)R(3); I.fmm = 0;
        us_ins_insert(s, 1 + R(s->e.ninst + 1), &I, nm);
    }
    for (k = 0; k < 2; k++) {
        EngFmStep st[40];
        int len = R(40) + 1, j;
        for (i = 0; i < len; i++) { for (j = 0; j < 11; j++) st[i].d[j] = (uint8_t)R(256); st[i].fs = (int16_t)(R(2000) - 1000); st[i].pan = (uint8_t)R(3); st[i].dur = (uint8_t)R(20); }
        us_fmm_set(s, 1 + R(s->e.ninst), st, len);
        { EngFmm *M = us_fmm(s, 1 + R(s->e.ninst), 1); if (M) { M->lb = (uint8_t)R(10); M->ko = (uint8_t)R(5); M->dis[R(28)] = 1; } }
    }
    for (i = 0; i < 16; i++) { s->e.arp[i].data[R(16)] = (int8_t)(R(97) - 48); s->e.vib[i].loop = (int8_t)(R(17) - 1); snprintf(s->tname[R(2)][i], UI_NAME, "T%d", R(99)); }
    s->e.norder = (uint16_t)(1 + R(UI_ORDERS));
    for (i = 0; i < s->e.norder; i++) s->order[i] = (uint8_t)(R(10) ? R(big ? 40 : 8) : 0x80 + R(s->e.norder));
    s->e.bpm = (uint8_t)(R(200) + 40); s->e.perc = (uint8_t)R(2); s->e.four = (uint8_t)R(64); s->e.lfo = (uint8_t)R(4);
    snprintf(s->name, sizeof s->name, "SONG %u", rnd() % 100000u);
}

static void sameSong(const UiSong *a, const UiSong *b)   /* cell by cell and field by field */
{
    int p, r, t, k;
    CHECK(a->e.rows == b->e.rows && a->e.norder == b->e.norder && a->e.ninst == b->e.ninst && !strcmp(a->name, b->name));
    CHECK(!memcmp(a->order, b->order, a->e.norder) && !memcmp(a->e.arp, b->e.arp, sizeof a->e.arp) && !memcmp(a->e.vib, b->e.vib, sizeof a->e.vib));
    for (k = 0; k < 32; k++) CHECK(!strcmp(a->tname[k / 16][k % 16], b->tname[k / 16][k % 16]));
    for (k = 0; k < a->e.ninst; k++) {
        EngIns x = a->inst[k], y = b->inst[k];
        CHECK(!strcmp(a->iname[k], b->iname[k]));
        CHECK(!x.fmm == !y.fmm);
        if (x.fmm) { CHECK(x.fmm->len == y.fmm->len && !memcmp(x.fmm->dis, y.fmm->dis, 28) && x.fmm->lb == y.fmm->lb && x.fmm->ko == y.fmm->ko);
                     for (p = 0; p < x.fmm->len; p++) { const EngFmStep *u = &x.fmm->steps[p], *v = &y.fmm->steps[p];
                         CHECK(!memcmp(u->d, v->d, 11) && u->fs == v->fs && u->pan == v->pan && u->dur == v->dur); } }
        x.fmm = y.fmm = 0;
        CHECK(!memcmp(&x, &y, sizeof x));
    }
    for (p = 0; p < SM_PATS; p++) {
        CHECK(sm_has(&a->a, p) == sm_has(&b->a, p));
        for (r = 0; r < a->e.rows; r++) for (t = 0; t < ENG_TRACKS; t++) {
            EngCell x, y;
            us_get(a, p, r, t, &x); us_get(b, p, r, t, &y);
            CHECK(!memcmp(&x, &y, sizeof x));
        }
    }
}

/* what each slot should hold: its bytes (0 size = empty) */
static uint8_t want[SL_SLOTS][70000];
static uint32_t wantn[SL_SLOTS];
static void checkSlots(SlStore *t)
{
    int k;
    for (k = 0; k < SL_SLOTS; k++) {
        SlInfo I;
        int has = sl_info(t, k, &I);
        CHECK(has == (wantn[k] != 0));
        if (!has) continue;
        CHECK(I.size == wantn[k]);
        CHECK(!sl_load(t, k, &B));
        CHECK(ser(&B, 1) == wantn[k] && !memcmp(bytes[1], want[k], wantn[k]));
    }
}

int main(void)
{
    int i, k, n, cuts = 0, olds = 0, news = 0;
    SlStore T;
    /* 1. the file, back and forth */
    for (i = 0; i < 300; i++) {
        uint32_t a;
        randomSong(&A, i % 50 == 0);
        a = ser(&A, 0);
        us_init(&B, m2, ARENA);
        mem = bytes[0]; memn = a;
        CHECK(!sf_read(&B, mget, 0, a));
        sameSong(&A, &B);
        CHECK(ser(&B, 1) == a && !memcmp(bytes[0], bytes[1], a));
        if (i < 40) {                     /* damaged: refused, the song as it was */
            uint32_t at = (uint32_t)R((int)a);
            uint8_t keep = bytes[0][at];
            int rc;
            bytes[0][at] ^= (uint8_t)(1 + R(255));
            rc = sf_read(&B, mget, 0, a);
            if (rc) sameSong(&A, &B);   /* (a change that still reads is a song: fine) */
            bytes[0][at] = keep;
            memn = a - 1 - (uint32_t)R(10);
            CHECK(sf_read(&B, mget, 0, memn) == -1);
        }
    }
    printf("sl_test: 300 songs written and read back the same\n");

    /* 2. the slots */
    memset(fl, 0xFF, sizeof fl);
    sl_init(&T, &FL, BASE);
    for (i = 0; i < 400; i++) {
        int what = R(10);
        k = R(SL_SLOTS);
        if (what < 6) {
            int big = R(8) == 0, rc;
            randomSong(&A, big);
            rc = sl_save(&T, k, &A);
            n = (int)ser(&A, 0);
            if ((uint32_t)n > SL_ROOM) CHECK(rc == -2);
            else { CHECK(rc == 0); memcpy(want[k], bytes[0], (size_t)n); wantn[k] = (uint32_t)n; }
        } else if (what < 8) {
            CHECK(sl_delete(&T, k) == 0); wantn[k] = 0;
        } else {
            char nm[12];
            snprintf(nm, sizeof nm, "RN%d", R(10000));
            if (!wantn[k]) CHECK(sl_rename(&T, k, nm) == -3);
            else { CHECK(sl_rename(&T, k, nm) == 0); memset(want[k] + 5, 0, 20); memcpy(want[k] + 5, nm, strlen(nm)); }
        }
        if (i % 20 == 0) { sl_init(&T, &FL, BASE); }   /* (as after a restart) */
        checkSlots(&T);
    }
    printf("sl_test: 400 slot saves, renames and deletes, the slots right after each\n");

    /* 3. power cuts */
    for (i = 0; i < 600; i++) {
        int rc, del = R(4) == 0;
        uint8_t was[70000];
        uint32_t wasn;
        k = R(SL_SLOTS);
        wasn = wantn[k]; memcpy(was, want[k], wasn);
        randomSong(&A, 0);
        n = (int)ser(&A, 0);
        cut = 0; budget = R(60);
        rc = del ? sl_delete(&T, k) : sl_save(&T, k, &A);
        budget = -1;
        sl_init(&T, &FL, BASE);           /* the power back */
        if (!cut) { CHECK(rc == 0); }
        else cuts++;
        {
            SlInfo I;
            int has = sl_info(&T, k, &I);
            if (has && wasn && I.size == wasn && !sl_load(&T, k, &B) && ser(&B, 1) == wasn && !memcmp(bytes[1], was, wasn)) olds++;
            else if (has) { CHECK(!del); CHECK(!sl_load(&T, k, &B)); CHECK(ser(&B, 1) == (uint32_t)n && !memcmp(bytes[1], bytes[0], (size_t)n)); news++;
                            memcpy(want[k], bytes[0], (size_t)n); wantn[k] = (uint32_t)n; continue; }
            else CHECK(del || !wasn);   /* gone: only a delete, or nothing was there */
            if (!has) wantn[k] = 0;      /* (a delete that got through) */
        }
        checkSlots(&T);
    }
    printf("sl_test: 600 saves and deletes cut short (%d cuts): old song %d times, new %d, the rest untouched\n", cuts, olds, news);
    /* 4. song files coming in pieces (USB): random chunks, then commits that must be refused, then power cuts */
    for (i = 0; i < 300; i++) {
        int what = R(6), rc = 0;
        uint32_t off = 0, crc, sz;
        uint8_t was[70000];
        uint32_t wasn;
        k = R(SL_SLOTS);
        wasn = wantn[k]; memcpy(was, want[k], wasn);
        cut = 0;
        randomSong(&A, R(10) == 0);
        sz = ser(&A, 0);
        if (sz > SL_ROOM) { CHECK(sl_wbegin(&T, k, sz) == -2); continue; }
        if (what == 1) bytes[0][5 + R(20)] ^= 0;                          /* (as it is) */
        if (what == 2) bytes[0][0] = 'X';                                /* not a song file */
        crc = sl_crc(0, bytes[0], sz);
        if (what == 3) crc ^= 1;                                         /* the CRC wrong */
        if (what == 4) { cut = 0; budget = R(60); }                      /* the power goes */
        CHECK(sl_wbegin(&T, k, sz) == 0 || cut);
        while (off < sz && !cut) {
            uint32_t m = 1 + (uint32_t)R(700);
            if (m > sz - off) m = sz - off;
            if (R(30) == 0) CHECK(sl_wdata(&T, off + 1, bytes[0] + off, m) == -1);   /* a gap: refused */
            rc = sl_wdata(&T, off, bytes[0] + off, m);
            CHECK(!rc || cut);
            off += m;
        }
        if (!cut) rc = sl_wcommit(&T, crc);
        budget = -1;
        if (what == 4 || R(4) == 0) sl_init(&T, &FL, BASE);
        if (what == 4) {
            SlInfo I;
            int has = sl_info(&T, k, &I);
            if (!cut) CHECK(rc == 0);
            if (has && I.size == sz && !sl_load(&T, k, &B) && ser(&B, 1) == sz && !memcmp(bytes[1], bytes[0], sz)) { memcpy(want[k], bytes[0], sz); wantn[k] = sz; }
            else CHECK(has == (wasn != 0));
        } else if (what == 2) CHECK(rc == -3);
        else if (what == 3) CHECK(rc == -1);
        else { CHECK(rc == 0); memcpy(want[k], bytes[0], sz); wantn[k] = sz; }
        checkSlots(&T);
        if (wantn[k]) {                                                  /* read back in pieces */
            uint8_t got[70000];
            uint32_t o = 0;
            while (o < wantn[k]) { uint32_t m = 1 + (uint32_t)R(256); if (m > wantn[k] - o) m = wantn[k] - o; CHECK(!sl_read(&T, k, o, got + o, m)); o += m; }
            CHECK(!memcmp(got, want[k], wantn[k]));
            CHECK(sl_read(&T, k, wantn[k] - 1, got, 2) == -1);
        }
    }
    printf("sl_test: 300 song files sent in pieces (wrong CRC, not a song, power cuts refused or kept the old)\n");
    return 0;
}
