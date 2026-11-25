/* FM-1 OPL3 tracker: the song arena (songmem.h says how it is laid out) */
#include "songmem.h"
#include <string.h>

#define PAD4(n) (((n) + 3u) & ~3u)
#define HDR(rows) (2u * ((uint32_t)(rows) + 1u))

static uint32_t gapLen(const SmArena *a) { return a->cap - a->used; }

/* memmove (the device's libc has none): by words when all three are 4-aligned (the gap's moves are) */
static void move(uint8_t *d, const uint8_t *s, uint32_t n)
{
    if (d == s || !n) return;
    if (!(((uintptr_t)d | (uintptr_t)s | n) & 3u)) {
        uint32_t *dw = (uint32_t *)(void *)d, i, w = n >> 2;
        const uint32_t *sw = (const uint32_t *)(const void *)s;
        if (d < s) for (i = 0; i < w; i++) dw[i] = sw[i];
        else for (i = w; i-- > 0; ) dw[i] = sw[i];
    } else if (d < s) {
        uint32_t i;
        for (i = 0; i < n; i++) d[i] = s[i];
    } else
        while (n--) d[n] = s[n];
}

/* the macro steps pointers of objects lo..hi (the ones that moved) */
static void fixFmm(SmArena *a, int lo, int hi)
{
    int o;
    if (!a->fmm) return;
    if (lo < SM_PATS) lo = SM_PATS;
    for (o = lo; o <= hi && o < SM_OBJS; o++)
        a->fmm[o - SM_PATS].steps = a->len[o] ? (const EngFmStep *)(void *)(a->mem + a->off[o]) : 0;
}

void sm_init(SmArena *a, void *mem, uint32_t cap, int rows, EngFmm *fmm)
{
    int i;
    memset(a, 0, sizeof *a);
    a->mem = (uint8_t *)mem; a->cap = cap & ~3u; a->rows = (uint16_t)rows; a->fmm = fmm;
    a->gap = SM_OBJS - 1;                /* everything empty: the gap after the last */
    for (i = 0; i < SM_OBJS; i++) a->off[i] = 0;
    fixFmm(a, 0, SM_OBJS - 1);
}

/* the gap to just after object k */
static void moveGap(SmArena *a, int k)
{
    uint32_t G = gapLen(a), from, to;
    int i;
    if (k > a->gap) {                    /* objects gap+1 .. k come down over the gap */
        from = a->off[a->gap + 1]; to = a->off[k] + a->len[k];
        if (to > from) move(a->mem + from - G, a->mem + from, to - from);
        for (i = a->gap + 1; i <= k; i++) a->off[i] -= G;
        fixFmm(a, a->gap + 1, k);
    } else if (k < a->gap) {             /* objects k+1 .. gap go up past it */
        from = a->off[k + 1]; to = a->off[a->gap] + a->len[a->gap];
        if (to > from) move(a->mem + from + G, a->mem + from, to - from);
        for (i = k + 1; i <= a->gap; i++) a->off[i] += G;
        fixFmm(a, k + 1, a->gap);
    }
    a->gap = k;
}

/* object k, whose content is R bytes: del bytes at pos replaced by n bytes of src (src may be NULL: left as is) */
static int splice(SmArena *a, int k, uint32_t R, uint32_t pos, uint32_t del, const void *src, uint32_t n)
{
    uint32_t nl = PAD4(R - del + n);
    uint8_t *p;
    if (nl > a->len[k] && nl - a->len[k] > gapLen(a)) return -1;
    moveGap(a, k);
    p = a->mem + a->off[k];
    if (R > pos + del) move(p + pos + n, p + pos + del, R - pos - del);
    if (src && n) memcpy(p + pos, src, n);
    a->used = a->used - a->len[k] + nl;
    a->len[k] = nl;
    fixFmm(a, k, k);
    return 0;
}

int sm_has(const SmArena *a, int pat) { return pat >= 0 && pat < SM_PATS && a->len[pat] != 0; }
uint32_t sm_free(const SmArena *a) { return gapLen(a); }
uint32_t sm_bytes(const SmArena *a, int obj) { return obj >= 0 && obj < SM_OBJS ? a->len[obj] : 0; }

static const uint16_t *rsOf(const SmArena *a, int pat) { return (const uint16_t *)(const void *)(a->mem + a->off[pat]); }

static const EngCell EMPTY = {-1, 0, {-1, -1}, {0, 0}};
static int isEmpty(const EngCell *c) { return c->note == -1 && !c->ins && c->fx[0] < 0 && c->fx[1] < 0; }

/* one cell's bytes at q into *c (its track: the return's bits 0-4); the bytes it took */
static uint32_t decode(const uint8_t *q, EngCell *c)
{
    uint8_t h = q[0];
    uint32_t n = 1;
    *c = EMPTY;
    if (h & 0x20) { c->note = (int8_t)q[n]; c->ins = q[n + 1]; n += 2; }
    if (h & 0x40) { c->fx[0] = (int8_t)q[n]; c->v[0] = q[n + 1]; n += 2; }
    if (h & 0x80) { c->fx[1] = (int8_t)q[n]; c->v[1] = q[n + 1]; n += 2; }
    return n;
}
static uint32_t size(uint8_t h) { return 1u + (h & 0x20 ? 2u : 0) + (h & 0x40 ? 2u : 0) + (h & 0x80 ? 2u : 0); }
static uint32_t encode(uint8_t *q, int track, const EngCell *c)
{
    uint32_t n = 1;
    uint8_t h = (uint8_t)track;
    if (isEmpty(c)) return 0;
    if (c->note != -1 || c->ins) { h |= 0x20; q[n++] = (uint8_t)c->note; q[n++] = c->ins; }
    if (c->fx[0] >= 0) { h |= 0x40; q[n++] = (uint8_t)c->fx[0]; q[n++] = c->v[0]; }
    if (c->fx[1] >= 0) { h |= 0x80; q[n++] = (uint8_t)c->fx[1]; q[n++] = c->v[1]; }
    q[0] = h;
    return n;
}

int sm_get(const SmArena *a, int pat, int row, int track, EngCell *out)
{
    const uint16_t *rs;
    const uint8_t *p;
    uint32_t i, e;
    if (!sm_has(a, pat)) return 0;
    rs = rsOf(a, pat); p = (const uint8_t *)rs;
    *out = EMPTY;
    if (row < 0 || row >= a->rows) return 1;
    for (i = rs[row], e = rs[row + 1]; i < e; i += size(p[i])) {
        int t = p[i] & 31;
        if (t == track) { decode(p + i, out); break; }
        if (t > track) break;
    }
    return 1;
}

int sm_row(const SmArena *a, int pat, int row, EngCell out[ENG_TRACKS])
{
    const uint16_t *rs;
    const uint8_t *p;
    uint32_t i, e;
    int t;
    if (!sm_has(a, pat)) return 0;
    for (t = 0; t < ENG_TRACKS; t++) out[t] = EMPTY;
    if (row < 0 || row >= a->rows) return 1;
    rs = rsOf(a, pat); p = (const uint8_t *)rs;
    for (i = rs[row], e = rs[row + 1]; i < e; ) {
        EngCell c;
        t = p[i] & 31;
        i += decode(p + i, &c);
        if (t < ENG_TRACKS) out[t] = c;
    }
    return 1;
}

int sm_cell(const EngSong *s, int pat, int row, int track, EngCell *out)
{
    return sm_get((const SmArena *)s->user, pat, row, track, out);
}

int sm_new(SmArena *a, int pat)
{
    uint16_t hdr[257];
    uint32_t r, h = HDR(a->rows);
    if (pat < 0 || pat >= SM_PATS) return -1;
    if (sm_has(a, pat)) return 0;
    for (r = 0; r <= a->rows; r++) hdr[r] = (uint16_t)h;
    return splice(a, pat, 0, 0, 0, hdr, h);
}

void sm_del(SmArena *a, int pat)
{
    if (!sm_has(a, pat)) return;
    splice(a, pat, rsOf(a, pat)[a->rows], 0, rsOf(a, pat)[a->rows], 0, 0);
}

int sm_set(SmArena *a, int pat, int row, int track, const EngCell *c)
{
    uint8_t nb[7];
    const uint16_t *rs;
    uint16_t *w;
    const uint8_t *p;
    uint32_t i, e, at, old = 0, n, R;
    int r, made = 0;
    if (row < 0 || row >= a->rows || track < 0 || track >= ENG_TRACKS) return 0;
    n = encode(nb, track, c);
    if (!sm_has(a, pat)) {
        if (!n) return 0;
        if (sm_new(a, pat)) return -1;
        made = 1;
    }
    rs = rsOf(a, pat); p = (const uint8_t *)rs; R = rs[a->rows];
    for (i = rs[row], e = rs[row + 1], at = e; i < e; i += size(p[i])) {
        int t = p[i] & 31;
        if (t >= track) { at = i; if (t == track) old = size(p[i]); break; }
    }
    if (!old && !n) return 0;
    if (splice(a, pat, R, at, old, nb, n)) { if (made) sm_del(a, pat); return -1; }   /* refused: as it was */
    w = (uint16_t *)(void *)(a->mem + a->off[pat]);
    for (r = row + 1; r <= a->rows; r++) w[r] = (uint16_t)(w[r] + n - old);
    return 0;
}

int sm_set_row(SmArena *a, int pat, int row, const EngCell c[ENG_TRACKS])
{
    uint8_t nb[7 * ENG_TRACKS];
    const uint16_t *rs;
    uint16_t *w;
    uint32_t n = 0, old, R;
    int t, r, made = 0;
    if (row < 0 || row >= a->rows) return 0;
    for (t = 0; t < ENG_TRACKS; t++) n += encode(nb + n, t, &c[t]);
    if (!sm_has(a, pat)) {
        if (!n) return 0;
        if (sm_new(a, pat)) return -1;
        made = 1;
    }
    rs = rsOf(a, pat); R = rs[a->rows]; old = (uint32_t)rs[row + 1] - rs[row];
    if (splice(a, pat, R, rs[row], old, nb, n)) { if (made) sm_del(a, pat); return -1; }
    w = (uint16_t *)(void *)(a->mem + a->off[pat]);
    for (r = row + 1; r <= a->rows; r++) w[r] = (uint16_t)(w[r] + n - old);
    return 0;
}

int sm_rows(SmArena *a, int rows)
{
    uint16_t hdr[257];
    uint32_t grow = 0, ho = HDR(a->rows), hn, m;
    int k, r;
    if (rows < 1 || rows > 256) return -1;
    if (rows == a->rows) return 0;
    hn = HDR(rows); m = (uint32_t)(rows < a->rows ? rows : a->rows);
    for (k = 0; k < SM_PATS; k++)        /* the room first: all or nothing */
        if (sm_has(a, k)) {
            const uint16_t *rs = rsOf(a, k);
            uint32_t nl = PAD4(rs[m] - ho + hn);
            if (nl > a->len[k]) grow += nl - a->len[k];
        }
    if (grow > gapLen(a)) return -1;
    for (k = 0; k < SM_PATS; k++) {
        const uint16_t *rs;
        uint32_t keep;
        if (!sm_has(a, k)) continue;
        rs = rsOf(a, k);
        keep = rs[m];                    /* the rows kept end here */
        for (r = 0; r <= rows; r++) hdr[r] = (uint16_t)((uint32_t)r <= m ? rs[r] - ho + hn : keep - ho + hn);
        splice(a, k, rs[a->rows], keep, rs[a->rows] - keep, 0, 0);   /* the cut rows' cells (shrinks: can't fail) */
        splice(a, k, keep, 0, ho, hdr, hn);                          /* the new index (room counted above) */
    }
    a->rows = (uint16_t)rows;
    return 0;
}

int sm_fmm(SmArena *a, int ins, const EngFmStep *st, int n)
{
    int k = SM_PATS + ins - 1;
    uint32_t R;
    if (ins < 1 || ins > SM_FMMS || n < 0) return -1;
    R = a->len[k];                       /* (the steps fill it whole: sizeof(EngFmStep) is a multiple of 4) */
    return splice(a, k, R, 0, R, st, (uint32_t)n * sizeof(EngFmStep));
}
