/* FMY262: a song as a file (songfile.h) */
#include "songfile.h"
#include <string.h>

#define VERSION 1

/* ------------------------------------------------------------------ writing --- */
typedef struct { void (*out)(void *u, const uint8_t *b, uint32_t n); void *u; uint32_t n; uint8_t buf[64]; uint32_t k; } W;
static void flush(W *w) { if (w->k) { if (w->out) w->out(w->u, w->buf, w->k); w->n += w->k; w->k = 0; } }
static void w8(W *w, int v) { w->buf[w->k++] = (uint8_t)v; if (w->k == sizeof w->buf) flush(w); }
static void w16(W *w, int v) { w8(w, v & 255); w8(w, (v >> 8) & 255); }
static void wstr(W *w, const char *s, int n) { int i, end = 0; for (i = 0; i < n; i++) { if (!s[i]) end = 1; w8(w, end ? 0 : s[i]); } }

static int cellFlags(const EngCell *c) { return (c->note != -1 || c->ins ? 32 : 0) | (c->fx[0] >= 0 ? 64 : 0) | (c->fx[1] >= 0 ? 128 : 0); }

uint32_t sf_write(const UiSong *s, void (*out)(void *u, const uint8_t *b, uint32_t n), void *u)
{
    W w;
    int i, j, k, p, r, t, np = 0;
    const EngSong *e = &s->e;
    w.out = out; w.u = u; w.n = 0; w.k = 0;
    for (i = 0; i < 4; i++) w8(&w, SF_MAGIC[i]);
    w8(&w, VERSION);
    wstr(&w, s->name, 20);
    w16(&w, e->rows);
    w8(&w, e->bpm); w8(&w, e->speed); w8(&w, e->lfo); w8(&w, e->opl); w8(&w, e->perc); w8(&w, e->four);
    w8(&w, e->gvol); w8(&w, e->vtab); w8(&w, e->mspd);
    w16(&w, e->norder);
    for (i = 0; i < e->norder; i++) w8(&w, s->order[i]);
    for (k = 0; k < 2; k++)
        for (i = 0; i < 16; i++) {
            const EngTab *T = k ? &e->vib[i] : &e->arp[i];
            w8(&w, T->len); w8(&w, T->spd); w8(&w, T->delay); w8(&w, T->loop);
            for (j = 0; j < 16; j++) w8(&w, T->data[j]);
        }
    for (k = 0; k < 2; k++) for (i = 0; i < 16; i++) wstr(&w, s->tname[k][i], UI_NAME - 1);
    w8(&w, e->ninst);
    for (k = 0; k < e->ninst; k++) {
        const EngIns *I = &s->inst[k];
        for (j = 0; j < 2; j++) {
            const EngOp *o = &I->op[j];
            w8(&w, o->am); w8(&w, o->vib); w8(&w, o->egt); w8(&w, o->ksr); w8(&w, o->mult); w8(&w, o->ksl);
            w8(&w, o->tl); w8(&w, o->ar); w8(&w, o->dr); w8(&w, o->sl); w8(&w, o->rr); w8(&w, o->ws);
        }
        w8(&w, I->fb); w8(&w, I->con); w8(&w, I->pan); w8(&w, I->ft); w8(&w, I->arpT); w8(&w, I->vibT); w8(&w, I->four);
        wstr(&w, s->iname[k], UI_NAME - 1);
        w8(&w, I->fmm != 0);
        if (I->fmm) {
            const EngFmm *M = I->fmm;
            w8(&w, M->len); w8(&w, M->lb); w8(&w, M->ll); w8(&w, M->ko);
            for (j = 0; j < 28; j++) w8(&w, M->dis[j]);
            for (i = 0; i < M->len; i++) {
                const EngFmStep *S = &M->steps[i];
                for (j = 0; j < 11; j++) w8(&w, S->d[j]);
                w16(&w, (uint16_t)S->fs); w8(&w, S->pan); w8(&w, S->dur);
            }
        }
    }
    for (p = 0; p < SM_PATS; p++) np += sm_has(&s->a, p);
    w8(&w, np);
    for (p = 0; p < SM_PATS; p++) {
        EngCell row[ENG_TRACKS];
        int n = 0;
        if (!sm_has(&s->a, p)) continue;
        for (r = 0; r < e->rows; r++) { sm_row(&s->a, p, r, row); for (t = 0; t < ENG_TRACKS; t++) n += cellFlags(&row[t]) != 0; }
        w8(&w, p); w16(&w, n);
        for (r = 0; r < e->rows; r++) {
            sm_row(&s->a, p, r, row);
            for (t = 0; t < ENG_TRACKS; t++) {
                const EngCell *c = &row[t];
                int f = cellFlags(c);
                if (!f) continue;
                w8(&w, r); w8(&w, t | f);
                if (f & 32) { w8(&w, c->note); w8(&w, c->ins); }
                if (f & 64) { w8(&w, c->fx[0]); w8(&w, c->v[0]); }
                if (f & 128) { w8(&w, c->fx[1]); w8(&w, c->v[1]); }
            }
        }
    }
    flush(&w);
    return w.n;
}

/* ------------------------------------------------------------------ reading --- */
typedef struct { sf_get get; void *u; uint32_t size, off; int bad; uint8_t buf[64]; uint32_t b0, bn; } R;
static int r8(R *r)
{
    if (r->bad) return 0;
    if (r->off < r->b0 || r->off >= r->b0 + r->bn) {   /* a window of 64 bytes at a time */
        uint32_t n = r->size - r->off < sizeof r->buf ? r->size - r->off : sizeof r->buf;
        if (r->off >= r->size || r->get(r->u, r->off, r->buf, n)) { r->bad = 1; return 0; }
        r->b0 = r->off; r->bn = n;
    }
    return r->buf[r->off++ - r->b0];
}
static int r16(R *r) { int a = r8(r); return a | r8(r) << 8; }
static void rstr(R *r, char *d, int n) { int i; for (i = 0; i < n; i++) { int c = r8(r); if (d) d[i] = (char)c; } if (d) d[n] = 0; }
static int range(R *r, int v, int lo, int hi) { if (v < lo || v > hi) r->bad = 1; return v; }

static EngFmStep steps[255];

/* the whole file; s 0: only checked. 0, -1 bad, -2 full */
static int parse(R *r, UiSong *s, char name[21], int *npat, int *npos)
{
    char nm[21];
    int i, j, k, rows, norder, ninst, np, full = 0;
    EngSong h;
    memset(&h, 0, sizeof h);
    for (i = 0; i < 4; i++) if (r8(r) != SF_MAGIC[i]) return -1;
    if (r8(r) != VERSION) return -1;
    rstr(r, nm, 20);
    rows = range(r, r16(r), 16, 256);
    h.bpm = (uint8_t)r8(r); h.speed = (uint8_t)r8(r); h.lfo = (uint8_t)r8(r); h.opl = (uint8_t)range(r, r8(r), 2, 3);
    h.perc = (uint8_t)r8(r); h.four = (uint8_t)r8(r); h.gvol = (uint8_t)r8(r); h.vtab = (uint8_t)r8(r); h.mspd = (uint8_t)r8(r);
    norder = range(r, r16(r), 1, UI_ORDERS);
    if (r->bad) return -1;
    if (s) {
        us_begin(s, rows);
        memcpy(s->name, nm, sizeof nm);
        s->e.bpm = h.bpm; s->e.speed = h.speed; s->e.lfo = h.lfo; s->e.opl = h.opl; s->e.perc = h.perc; s->e.four = h.four;
        s->e.gvol = h.gvol; s->e.vtab = h.vtab; s->e.mspd = h.mspd; s->e.norder = (uint16_t)norder;
    }
    if (name) memcpy(name, nm, sizeof nm);
    if (npos) *npos = norder;
    for (i = 0; i < norder; i++) { int v = r8(r); if (s) s->order[i] = (uint8_t)v; }
    for (k = 0; k < 2; k++)
        for (i = 0; i < 16; i++) {
            EngTab T;
            T.len = (uint8_t)range(r, r8(r), 0, 16); T.spd = (uint8_t)r8(r); T.delay = (uint8_t)r8(r); T.loop = (int8_t)r8(r);
            for (j = 0; j < 16; j++) T.data[j] = (int8_t)r8(r);
            if (s) { if (k) s->e.vib[i] = T; else s->e.arp[i] = T; }
        }
    for (k = 0; k < 2; k++) for (i = 0; i < 16; i++) rstr(r, s ? s->tname[k][i] : 0, UI_NAME - 1);
    ninst = r8(r);
    if (s) s->e.ninst = (uint16_t)ninst;
    for (k = 0; k < ninst && !r->bad; k++) {
        EngIns I;
        memset(&I, 0, sizeof I);
        for (j = 0; j < 2; j++) {
            EngOp *o = &I.op[j];
            o->am = (uint8_t)r8(r); o->vib = (uint8_t)r8(r); o->egt = (uint8_t)r8(r); o->ksr = (uint8_t)r8(r); o->mult = (uint8_t)r8(r);
            o->ksl = (uint8_t)r8(r); o->tl = (uint8_t)r8(r); o->ar = (uint8_t)r8(r); o->dr = (uint8_t)r8(r); o->sl = (uint8_t)r8(r);
            o->rr = (uint8_t)r8(r); o->ws = (uint8_t)r8(r);
        }
        I.fb = (uint8_t)r8(r); I.con = (uint8_t)r8(r); I.pan = (uint8_t)r8(r); I.ft = (int8_t)r8(r);
        I.arpT = (uint8_t)range(r, r8(r), 0, 16); I.vibT = (uint8_t)range(r, r8(r), 0, 16); I.four = (uint8_t)r8(r);
        if (s) { s->inst[k] = I; rstr(r, s->iname[k], UI_NAME - 1); } else rstr(r, 0, UI_NAME - 1);
        if (range(r, r8(r), 0, 1)) {
            EngFmm M;
            int n;
            memset(&M, 0, sizeof M);
            n = M.len = (uint8_t)r8(r); M.lb = (uint8_t)r8(r); M.ll = (uint8_t)r8(r); M.ko = (uint8_t)r8(r);
            for (j = 0; j < 28; j++) M.dis[j] = (uint8_t)r8(r);
            for (i = 0; i < n; i++) {
                EngFmStep *S = &steps[i];
                for (j = 0; j < 11; j++) S->d[j] = (uint8_t)r8(r);
                S->fs = (int16_t)r16(r); S->pan = (uint8_t)r8(r); S->dur = (uint8_t)r8(r);
            }
            if (s && !r->bad) {
                s->fmm[k] = M; s->fmm[k].steps = 0;
                if (sm_fmm(&s->a, k + 1, steps, n)) { full = 1; s->fmm[k].len = 0; }
                s->inst[k].fmm = &s->fmm[k];
            }
        }
    }
    np = range(r, r8(r), 0, SM_PATS);
    if (npat) *npat = np;
    for (k = 0; k < np && !r->bad; k++) {
        int p = range(r, r8(r), 0, SM_PATS - 1), n = r16(r), last = -1;
        if (s && !r->bad && sm_new(&s->a, p)) full = 1;
        for (i = 0; i < n && !r->bad; i++) {
            EngCell c = US_EMPTY;
            int row = range(r, r8(r), 0, rows - 1), tf = r8(r), t = range(r, tf & 31, 0, ENG_TRACKS - 1);
            if (row * ENG_TRACKS + t <= last) r->bad = 1;   /* (in order, each cell once) */
            last = row * ENG_TRACKS + t;
            if (tf & 32) { c.note = (int8_t)r8(r); c.ins = (uint8_t)r8(r); }
            if (tf & 64) { c.fx[0] = (int8_t)range(r, (int8_t)r8(r), -1, 47); c.v[0] = (uint8_t)r8(r); }
            if (tf & 128) { c.fx[1] = (int8_t)range(r, (int8_t)r8(r), -1, 47); c.v[1] = (uint8_t)r8(r); }
            if (s && !r->bad && sm_set(&s->a, p, row, t, &c)) full = 1;
        }
    }
    if (r->bad || r->off != r->size) return -1;
    return full ? -2 : 0;
}

int sf_read(UiSong *s, sf_get get, void *u, uint32_t size)
{
    R r;
    memset(&r, 0, sizeof r); r.get = get; r.u = u; r.size = size;
    if (parse(&r, 0, 0, 0, 0)) return -1;             /* checked first: a bad file leaves the song as it was */
    memset(&r, 0, sizeof r); r.get = get; r.u = u; r.size = size;
    return parse(&r, s, 0, 0, 0) ? -2 : 0;
}

int sf_peek(sf_get get, void *u, uint32_t size, char name[21], int *patterns, int *positions)
{
    R r;
    memset(&r, 0, sizeof r); r.get = get; r.u = u; r.size = size;
    return parse(&r, 0, name, patterns, positions);
}
