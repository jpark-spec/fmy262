/* firmware/engine/songmem.c against a plain model (every cell of every pattern in a full array): random edits -
 * cells, rows, patterns made and deleted, the rows changed, macro steps - in an arena small enough to fill up, every
 * cell compared after each step, a refused edit required to change nothing. tests/t43.cjs builds and runs it.
 *   sm_test [STEPS] [SEED] [ARENA KB, 4..64] */
#include "songmem.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NP 12                            /* patterns the test uses (spread over 0..127) */
static const int PI[NP] = {0, 1, 2, 5, 17, 40, 63, 64, 90, 100, 126, 127};
static EngCell M[NP][256][ENG_TRACKS];
static uint8_t have[NP];
static int rows;
static EngFmStep FM[SM_FMMS][32];
static int fmn[SM_FMMS];

static uint32_t seed;
static uint32_t rnd(void) { seed = seed * 1103515245u + 12345u; return seed >> 8; }
static int ri(int a, int b) { return a + (int)(rnd() % (uint32_t)(b - a + 1)); }

static const EngCell EMPTY = {-1, 0, {-1, -1}, {0, 0}};
static EngCell rcell(void)
{
    EngCell c = EMPTY;
    int k = ri(0, 9);
    if (k < 3) return c;                 /* empty, often: deletes */
    if (ri(0, 3)) { c.note = (int8_t)(ri(0, 9) ? ri(0, 127) : -2); c.ins = (uint8_t)ri(0, 255); }
    if (ri(0, 1)) { c.fx[0] = (int8_t)ri(0, 47); c.v[0] = (uint8_t)ri(0, 255); }
    if (!ri(0, 3)) { c.fx[1] = (int8_t)ri(0, 47); c.v[1] = (uint8_t)ri(0, 255); }
    if (!ri(0, 20)) { c.note = -1; c.ins = (uint8_t)ri(1, 255); }   /* an instrument alone */
    return c;
}
static int same(const EngCell *a, const EngCell *b) { return !memcmp(a, b, sizeof *a); }

static int fails;
static void check(SmArena *A, const char *what, long step)
{
    int p, r, t, k;
    uint32_t sum = 0;
    for (k = 0; k < SM_OBJS; k++) sum += A->len[k];
    if (sum != A->used) { printf("step %ld %s: used %u, objects %u\n", step, what, A->used, sum); fails++; }
    for (p = 0; p < NP; p++) {
        EngCell row[ENG_TRACKS];
        if (sm_has(A, PI[p]) != have[p]) { printf("step %ld %s: pattern %d there %d, model %d\n", step, what, PI[p], sm_has(A, PI[p]), have[p]); fails++; return; }
        if (!have[p]) continue;
        for (r = 0; r < rows; r++) {
            sm_row(A, PI[p], r, row);
            for (t = 0; t < ENG_TRACKS; t++) {
                EngCell c;
                sm_get(A, PI[p], r, t, &c);
                if (!same(&c, &M[p][r][t]) || !same(&row[t], &M[p][r][t])) {
                    printf("step %ld %s: pattern %d row %d track %d differs\n", step, what, PI[p], r, t);
                    fails++;
                    return;
                }
            }
        }
    }
    for (k = 0; k < SM_FMMS; k++) {
        const EngFmStep *s = A->fmm[k].steps;
        if (!fmn[k] != !s || (fmn[k] && memcmp(s, FM[k], (size_t)fmn[k] * sizeof(EngFmStep)))) {
            printf("step %ld %s: macro %d differs\n", step, what, k + 1);
            fails++;
            return;
        }
    }
}

int main(int argc, char **argv)
{
    static uint32_t mem[65536 / 4];      /* 16 KB by default: full now and then */
    uint32_t cap = argc > 3 ? (uint32_t)atol(argv[3]) * 1024u : 16384u;
    static EngFmm fmm[SM_FMMS];
    static SmArena A;
    long steps = argc > 1 ? atol(argv[1]) : 200000, s, full = 0, ok = 0;
    int p, r, t;
    seed = argc > 2 ? (uint32_t)atol(argv[2]) : 1u;
    rows = 64;
    if (cap < 4096u || cap > sizeof mem) cap = 16384u;
    sm_init(&A, mem, cap, rows, fmm);
    for (p = 0; p < NP; p++) for (r = 0; r < 256; r++) for (t = 0; t < ENG_TRACKS; t++) M[p][r][t] = EMPTY;
    for (s = 0; s < steps && fails < 5; s++) {
        int op = ri(0, 99), rc;
        p = ri(0, NP - 1);
        if (op < 70) {                   /* a cell */
            EngCell c = rcell();
            r = ri(0, rows - 1); t = ri(0, ENG_TRACKS - 1);
            rc = sm_set(&A, PI[p], r, t, &c);
            if (!rc) { if (!have[p] && !(c.note == -1 && !c.ins && c.fx[0] < 0 && c.fx[1] < 0)) have[p] = 1; if (have[p]) M[p][r][t] = c; ok++; }
            else full++;
        } else if (op < 82) {            /* a row */
            EngCell row[ENG_TRACKS];
            int any = 0;
            r = ri(0, rows - 1);
            for (t = 0; t < ENG_TRACKS; t++) { row[t] = ri(0, 2) ? EMPTY : rcell(); any |= !same(&row[t], &EMPTY); }
            rc = sm_set_row(&A, PI[p], r, row);
            if (!rc) { if (any) have[p] = 1; if (have[p]) for (t = 0; t < ENG_TRACKS; t++) M[p][r][t] = row[t]; ok++; }
            else full++;
        } else if (op < 87) {            /* a pattern made */
            if (!sm_new(&A, PI[p])) { have[p] = 1; ok++; } else full++;
        } else if (op < 92) {            /* deleted */
            sm_del(&A, PI[p]);
            have[p] = 0;
            for (r = 0; r < 256; r++) for (t = 0; t < ENG_TRACKS; t++) M[p][r][t] = EMPTY;
        } else if (op < 94) {            /* the rows */
            int nr = ri(0, 3) ? ri(16, 128) : ri(1, 256);
            if (!sm_rows(&A, nr)) {
                for (p = 0; p < NP; p++) for (r = nr; r < 256; r++) for (t = 0; t < ENG_TRACKS; t++) M[p][r][t] = EMPTY;
                rows = nr; ok++;
            } else full++;
        } else {                         /* macro steps */
            int k = ri(0, SM_FMMS - 1), n = ri(0, 3) ? ri(1, 32) : 0, i;
            EngFmStep st[32];
            for (i = 0; i < n; i++) { memset(&st[i], 0, sizeof st[i]); st[i].d[0] = (uint8_t)ri(0, 255); st[i].d[10] = (uint8_t)ri(0, 255); st[i].fs = (int16_t)ri(-300, 300); st[i].pan = (uint8_t)ri(0, 3); st[i].dur = (uint8_t)ri(0, 9); }
            if (!sm_fmm(&A, k + 1, st, n)) { memcpy(FM[k], st, sizeof st); fmn[k] = n; ok++; } else full++;
        }
        if (s % 97 == 0 || op >= 82) check(&A, "after", s);
    }
    check(&A, "end", s);
    printf("sm_test: %ld steps, %ld done, %ld refused (full), free %u of %u, %s\n", s, ok, full, sm_free(&A),
           (unsigned)cap, fails ? "FAILED" : "ok");
    return fails ? 1 : 0;
}
