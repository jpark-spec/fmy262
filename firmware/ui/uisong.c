/* FM-1 OPL3 tracker: the song being edited (uisong.h) */
#include "uisong.h"
#include <string.h>

const EngCell US_EMPTY = {-1, 0, {-1, -1}, {0, 0}};
int us_empty(const EngCell *c) { return c->note == -1 && !c->ins && c->fx[0] < 0 && c->fx[1] < 0; }

static void link(UiSong *s)
{
    s->e.order = s->order;
    s->e.inst = s->inst;
    s->e.cell = sm_cell;
    s->e.user = &s->a;
}

static void tabBlank(EngTab *t) { memset(t, 0, sizeof *t); t->len = 1; t->spd = 1; t->loop = -1; }

void us_init(UiSong *s, void *mem, uint32_t cap)
{
    int i;
    memset(s, 0, sizeof *s);
    sm_init(&s->a, mem, cap, 64, s->fmm);
    s->e.rows = 64; s->e.bpm = 125; s->e.speed = 6; s->e.opl = 3; s->e.gvol = 63; s->e.mspd = 1;
    s->e.norder = 1;
    for (i = 0; i < 16; i++) { tabBlank(&s->e.arp[i]); tabBlank(&s->e.vib[i]); }
    link(s);
}

void us_begin(UiSong *s, int rows)
{
    void *mem = s->a.mem;
    uint32_t cap = s->a.cap;
    int i;
    memset(s, 0, sizeof *s);
    sm_init(&s->a, mem, cap, rows, s->fmm);
    s->e.rows = (uint16_t)rows; s->e.bpm = 125; s->e.speed = 6; s->e.opl = 3; s->e.gvol = 63; s->e.mspd = 1;
    s->e.norder = 1;
    for (i = 0; i < 16; i++) { tabBlank(&s->e.arp[i]); tabBlank(&s->e.vib[i]); }
    link(s);
}

static void name(char *d, const char *src, int n)
{
    int i = 0;
    if (src) for (; i < n - 1 && src[i]; i++) d[i] = src[i];
    d[i] = 0;
}

int us_load(UiSong *s, const PSong *P)
{
    uint32_t i, r;
    int p, k, fail = 0;
    sm_init(&s->a, s->a.mem, s->a.cap, P->h.rows, s->fmm);
    memset(s->fmm, 0, sizeof s->fmm);
    for (p = 0; p < P->npat && p < SM_PATS; p++) {
        const uint16_t *ix = P->rows[p];
        if (!ix) continue;
        if (sm_new(&s->a, p)) fail++;
        for (r = 0; r < P->h.rows; r++)
            for (i = ix[r]; i < ix[r + 1]; i++)
                if (sm_set(&s->a, p, (int)r, P->cells[i].track, &P->cells[i].c)) fail++;
    }
    s->e.ninst = P->h.ninst < 255 ? P->h.ninst : 255;
    for (k = 0; k < s->e.ninst; k++) {
        const EngFmm *M = P->h.inst[k].fmm;
        s->inst[k] = P->h.inst[k];
        s->inst[k].fmm = 0;
        name(s->iname[k], P->iname ? P->iname[k] : 0, UI_NAME);
        if (M) {
            s->fmm[k] = *M;
            s->fmm[k].steps = 0;
            if (sm_fmm(&s->a, k + 1, M->steps, M->len)) { fail++; s->fmm[k].len = 0; }
            s->inst[k].fmm = &s->fmm[k];
        }
    }
    s->e.rows = P->h.rows; s->e.bpm = P->h.bpm; s->e.speed = P->h.speed; s->e.lfo = P->h.lfo; s->e.opl = P->h.opl;
    s->e.perc = P->h.perc; s->e.four = P->h.four; s->e.gvol = P->h.gvol; s->e.vtab = P->h.vtab; s->e.mspd = P->h.mspd;
    s->e.norder = P->h.norder > UI_ORDERS ? UI_ORDERS : P->h.norder;
    memcpy(s->order, P->h.order, s->e.norder);
    for (i = 0; i < 16; i++) {
        s->e.arp[i] = P->arp[i]; s->e.vib[i] = P->vib[i];
        name(s->tname[0][i], P->aname ? P->aname[i] : 0, UI_NAME);
        name(s->tname[1][i], P->vname ? P->vname[i] : 0, UI_NAME);
    }
    name(s->name, P->name, sizeof s->name);
    link(s);
    return fail;
}

void us_get(const UiSong *s, int pat, int row, int track, EngCell *c)
{
    if (!sm_get(&s->a, pat, row, track, c)) *c = US_EMPTY;
}

int us_put(UiSong *s, int pat, int row, int track, const EngCell *c)
{
    return sm_set(&s->a, pat, row, track, c);
}

EngFmm *us_fmm(UiSong *s, int k, int make)
{
    if (k < 1 || k > s->e.ninst) return 0;
    if (!s->inst[k - 1].fmm && make) {
        memset(&s->fmm[k - 1], 0, sizeof s->fmm[k - 1]);
        s->inst[k - 1].fmm = &s->fmm[k - 1];
    }
    return s->inst[k - 1].fmm ? &s->fmm[k - 1] : 0;
}

static EngFmStep tmp[256];
static void mmove(void *d, const void *src, uint32_t n)   /* (no memmove on the device) */
{
    uint8_t *a = (uint8_t *)d;
    const uint8_t *b = (const uint8_t *)src;
    if (a < b) while (n--) *a++ = *b++;
    else if (a > b) while (n--) a[n] = b[n];
}               /* a macro's steps while they move (at most 255) */

int us_fmm_set(UiSong *s, int k, const EngFmStep *st, int n)
{
    EngFmm *M = us_fmm(s, k, 1);
    if (!M || n < 0 || n > 255) return -1;
    if (n) mmove(tmp, st, (uint32_t)n * sizeof *st);   /* (st may be the arena's own) */
    if (sm_fmm(&s->a, k, tmp, n)) return -1;
    M->len = (uint8_t)n;
    return 0;
}

void us_fmm_clear(UiSong *s, int k)
{
    if (k < 1 || k > s->e.ninst) return;
    sm_fmm(&s->a, k, 0, 0);
    memset(&s->fmm[k - 1], 0, sizeof s->fmm[k - 1]);
    s->inst[k - 1].fmm = 0;
}

/* instrument a's macro object (steps and header) to b's place */
static int moveFmm(UiSong *s, int a, int b)
{
    EngFmm h = s->fmm[a - 1];
    int has = s->inst[a - 1].fmm != 0, n = has ? h.len : 0;
    if (n) memcpy(tmp, h.steps, (size_t)n * sizeof *tmp);
    if (sm_fmm(&s->a, b, tmp, n)) return -1;
    h.steps = s->fmm[b - 1].steps;
    s->fmm[b - 1] = h;
    return 0;
}

int us_ins_insert(UiSong *s, int k, const EngIns *src, const char *nm)
{
    int n = s->e.ninst, j;
    EngIns c = *src;
    if (n >= 255 || k < 1 || k > n + 1) return -1;
    for (j = n; j >= k; j--) {           /* (sm_fmm keeps the steps of j while j+1 is written) */
        if (moveFmm(s, j, j + 1)) return -1;   /* (a failure here leaves a macro twice: only when full) */
        s->inst[j] = s->inst[j - 1];
        memcpy(s->iname[j], s->iname[j - 1], UI_NAME);
        s->inst[j].fmm = s->inst[j - 1].fmm ? &s->fmm[j] : 0;
    }
    sm_fmm(&s->a, k, 0, 0);
    memset(&s->fmm[k - 1], 0, sizeof s->fmm[k - 1]);
    c.fmm = 0;
    s->inst[k - 1] = c;
    name(s->iname[k - 1], nm, UI_NAME);
    s->e.ninst = (uint16_t)(n + 1);
    if (src->fmm && src->fmm->len) us_fmm_set(s, k, src->fmm->steps, src->fmm->len);
    if (src->fmm && s->inst[k - 1].fmm) {
        EngFmm *M = &s->fmm[k - 1];
        const EngFmStep *keep = M->steps;
        uint8_t len = M->len;
        *M = *src->fmm; M->steps = keep; M->len = len;
    }
    return 0;
}

void us_ins_delete(UiSong *s, int k)
{
    int n = s->e.ninst, j;
    if (k < 1 || k > n || n <= 1) return;
    us_fmm_clear(s, k);
    for (j = k; j < n; j++) {
        moveFmm(s, j + 1, j);            /* (shrinks or the same: fits) */
        s->inst[j - 1] = s->inst[j];
        memcpy(s->iname[j - 1], s->iname[j], UI_NAME);
        s->inst[j - 1].fmm = s->inst[j].fmm ? &s->fmm[j - 1] : 0;
    }
    us_fmm_clear(s, n);
    s->e.ninst = (uint16_t)(n - 1);
}

int us_rows(UiSong *s, int rows)
{
    if (sm_rows(&s->a, rows)) return -1;
    s->e.rows = (uint16_t)rows;
    return 0;
}
