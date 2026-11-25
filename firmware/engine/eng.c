/* FM-1 OPL3 tracker: the playback engine. web/engine.js function for function, in its order and with its names;
 * where JavaScript's semantics needed spelling out (undefined, the `||` defaults, Math.round) the comment says so.
 *
 * Effect numbers follow Adlib Tracker II (ef_* in typcons1.inc). The per-row / per-tick split follows AT2's
 * play_line + update_fine_effects (once per row), update_effects (every tick, row tick included) and
 * update_extra_fine_effects (every 4th tick). Global commands (%, `, >, <, &6-&B) act on every channel; OPL2 mode
 * plays channels 1-9 only. */
#include "eng.h"
#include <string.h>

#ifdef ENG_EXACT
#include <math.h>
#define R_POW2(x) pow(2.0, (x))
#define R_LOG2(x) log2(x)
#define R_FLOOR(x) floor(x)
#define R(x) (x)
#else
#include "fastmath.h"                  /* fm1-base include/ */
#define R_POW2(x) fm_exp2f(x)
#define R_LOG2(x) fm_log2f(x)
#define R_FLOOR(x) fm_floorf(x)
#define R(x) ((float)(x))
#endif

/* Math.round: half up */
static int rnd(eng_real x) { return (int)R_FLOOR(x + R(0.5)); }
static int imin(int a, int b) { return a < b ? a : b; }
static int imax(int a, int b) { return a > b ? a : b; }
static int isign(int a) { return (a > 0) - (a < 0); }

/* AT2 track -> OPL register map (typcons1.inc _chmm_* / _chpm_*): n = channel, m = modulator slot, c = carrier slot */
static const int16_t MM_N[20] = {3, 0, 4, 1, 5, 2, 6, 7, 8, 0x103, 0x100, 0x104, 0x101, 0x105, 0x102, 0x106, 0x107, 0x108, -1, -1};
static const int16_t MM_M[20] = {8, 0, 9, 1, 10, 2, 16, 17, 18, 0x108, 0x100, 0x109, 0x101, 0x10a, 0x102, 0x110, 0x111, 0x112, -1, -1};
static const int16_t MM_C[20] = {11, 3, 12, 4, 13, 5, 19, 20, 21, 0x10b, 0x103, 0x10c, 0x104, 0x10d, 0x105, 0x113, 0x114, 0x115, -1, -1};
static const int16_t PM_N[20] = {3, 0, 4, 1, 5, 2, 0x106, 0x107, 0x108, 0x103, 0x100, 0x104, 0x101, 0x105, 0x102, 6, 7, 8, 8, 7};
static const int16_t PM_M[20] = {8, 0, 9, 1, 10, 2, 0x110, 0x111, 0x112, 0x108, 0x100, 0x109, 0x101, 0x10a, 0x102, 0x10, 0x14, 0x12, 0x15, 0x11};
static const int16_t PM_C[20] = {11, 3, 12, 4, 13, 5, 0x113, 0x114, 0x115, 0x10b, 0x103, 0x10c, 0x104, 0x10d, 0x105, 0x13, -1, -1, -1, -1};
static const uint8_t DRUM[5] = {0x10, 0x08, 0x04, 0x02, 0x01};   /* tracks 16-20: BD SD TT CY HH key bits in BDh */
static const int8_t HI4[6] = {0, 2, 4, 9, 11, 13};
static const uint8_t PANB[3] = {0x10, 0x30, 0x20};

typedef struct { int k, m, c; } Regs;

static void w(Eng *e, int r, int v) { e->w(e->u, (uint16_t)r, (uint8_t)v); }

static void fresh(EngCh *s)
{
    memset(s, 0, sizeof *s);
    s->pitch = 60; s->base = 60; s->vol = 63; s->mvol = 63;
    s->ptgt = -1; s->mp = -1; s->nd = -1; s->nc = -1; s->panOv = -1; s->arpOv = -1; s->vibOv = -1;
}

/* AT2 generate_custom_vibrato (` command / GLOBAL page): 0 default sine, 1..239 triangle scaled by v/16, 240..255 size
 * and speed factor */
void eng_vtab(int v, uint8_t T[256], int *vsize, int *vfac)
{
    static const uint8_t D[32] = {0, 24, 49, 74, 97, 120, 141, 161, 180, 197, 212, 224, 235, 244, 250, 253,
                                  255, 253, 250, 244, 235, 224, 212, 197, 180, 161, 141, 120, 97, 74, 49, 24};
    int i, b;
    memset(T, 0, 256);
    *vfac = 1; *vsize = 32;
    if (!v)
        for (i = 0; i < 256; i++) T[i] = D[i & 31];
    else if (v < 240) {
        eng_real m = (eng_real)v / 16;
        for (b = 0; b < 8; b++) {
            for (i = 1; i <= 16; i++) T[b * 32 + i] = (uint8_t)(rnd(i * m) & 255);
            for (i = 17; i < 32; i++) T[b * 32 + i] = (uint8_t)(rnd((32 - i) * m) & 255);
        }
    } else {
        static const uint8_t SZ[16] = {16, 16, 16, 16, 32, 32, 32, 32, 64, 64, 64, 64, 128, 128, 128, 128};
        int sz = SZ[v - 240], mb = 256 / sz;
        *vfac = (v - 240) % 4 + 1; *vsize = 2 * sz;
        for (b = 0; b < 128 / sz; b++) {
            for (i = 1; i <= sz; i++) T[2 * sz * b + i] = (uint8_t)imax(0, i * mb - 1);
            for (i = sz + 1; i < 2 * sz; i++) T[2 * sz * b + i] = (uint8_t)imax(0, (2 * sz - i) * mb - 1);
        }
    }
}
static void speedTab(Eng *e, int v) { eng_vtab(v, e->VT, &e->vsize, &e->vfac); }

/* song.inst[n - 1], or undefined */
static const EngIns *songIns(const Eng *e, int n)
{
    const EngSong *S = e->song;
    return S && n >= 1 && n <= S->ninst ? &S->inst[n - 1] : 0;
}
static const EngIns *insOf(const Eng *e, int c) { const EngCh *s = &e->ch[c]; return s->patch ? s->patch : songIns(e, s->inst); }
static EngIns *own(Eng *e, int c)
{
    EngCh *s = &e->ch[c];
    if (!s->own) {
        const EngIns *i = insOf(e, c);
        if (!i) return 0;
        s->copy = *i; s->patch = &s->copy; s->own = 1;
    }
    return s->patch ? &s->copy : 0;   /* own with no patch: a 4-op lo track's patch cleared by a row (engine.js keeps own) */
}
static Regs regs(const Eng *e, int c)
{
    Regs r;
    if (e->perc) { r.k = PM_N[c]; r.m = PM_M[c]; r.c = PM_C[c]; }
    else { r.k = MM_N[c]; r.m = MM_M[c]; r.c = MM_C[c]; }
    return r;
}
int eng_track_chan(const Eng *e, int c)
{
    Regs r = regs(e, c);
    if (r.k < 0 || (!e->opl3 && r.k >= 0x100)) return -1;
    return (r.k & 0xff) + (r.k & 0x100 ? 9 : 0);
}
static int drum(const Eng *e, int c) { return e->perc && c >= 15 ? c - 15 : -1; }
static int active(const Eng *e, int c) { Regs r = regs(e, c); return r.k >= 0 && (e->opl3 || r.k < 0x100); }
static int pairHi(const Eng *e, int c)
{
    int p;
    for (p = 0; p < 6; p++)
        if (HI4[p] == c) return e->opl3 && (e->f4 >> p & 1) ? p : -1;
    return -1;
}
static int pairLo(const Eng *e, int c) { return c >= 1 && pairHi(e, c - 1) >= 0; }
/* 4-op: frequency and key-on live on the pair's first OPL channel (the lo track) */
static int fch(const Eng *e, int c) { return pairHi(e, c) >= 0 ? c + 1 : c; }
static const EngIns *partner(const Eng *e, int c)
{
    const EngCh *lo = &e->ch[c + 1];
    const EngIns *h = insOf(e, c), *p;
    if (lo->patch) return lo->patch;
    if ((p = songIns(e, lo->inst))) return p;
    if (h && h->four && (p = songIns(e, e->ch[c].inst + 1))) return p;
    return 0;
}
static void opRegs(Eng *e, int a, const EngOp *o)
{
    w(e, 0x20 + a, (o->am << 7) | (o->vib << 6) | (o->egt << 5) | (o->ksr << 4) | o->mult);
    w(e, 0x60 + a, (o->ar << 4) | o->dr);
    w(e, 0x80 + a, (o->sl << 4) | o->rr);
    w(e, 0xE0 + a, o->ws);
}
static int panBits(int pan) { return pan >= 0 && pan < 3 ? PANB[pan] : 0; }   /* ([..][pan] undefined | x: x) */

static void setVol(Eng *e, int c);

static const EngIns *loadInst(Eng *e, int c)
{
    const EngIns *ins = insOf(e, c);
    EngCh *s = &e->ch[c];
    Regs r;
    int pan, d;
    if (!ins) return 0;
    r = regs(e, c); pan = s->panOv >= 0 ? s->panOv : ins->pan; d = drum(e, c);
    if (r.k < 0) return ins;
    if (d > 0) { opRegs(e, r.m, &ins->op[0]); setVol(e, c); return ins; }   /* single-operator drum: the modulator */
    opRegs(e, r.m, &ins->op[0]); opRegs(e, r.c, &ins->op[1]);
    w(e, 0xC0 + r.k, panBits(pan) | (ins->fb << 1) | ins->con);
    if (pairHi(e, c) >= 0) {
        const EngIns *P = partner(e, c);
        Regs q = regs(e, c + 1);
        if (P) {
            opRegs(e, q.m, &P->op[0]); opRegs(e, q.c, &P->op[1]);
            w(e, 0xC0 + q.k, panBits(pan) | (P->fb << 1) | P->con);
        }
    }
    setVol(e, c);
    return ins;
}

static eng_real cl63(eng_real v) { return v < 0 ? 0 : v > 63 ? 63 : v; }
static void tl(Eng *e, int a, const EngOp *o, eng_real v)
{
    w(e, 0x40 + a, (o->ksl << 6) | rnd(63 - (63 - o->tl) * v / 63));
}
static void setVol(Eng *e, int c)
{
    EngCh *s = &e->ch[c];
    const EngIns *ins = insOf(e, c);
    Regs r;
    eng_real g, cv, mv;
    if (!ins) return;
    r = regs(e, c);
    if (r.k < 0) return;
    g = (eng_real)e->gvol / 63;
    cv = s->tmute ? 0 : cl63(s->vol + s->tro) * g;
    mv = s->tmute && ins->con ? 0 : cl63(s->mvol + (ins->con ? s->tro : 0)) * (ins->con ? g : 1);
    if (drum(e, c) > 0) { tl(e, r.m, &ins->op[0], cv); return; }
    if (pairHi(e, c) >= 0) {
        const EngIns *P = partner(e, c);
        Regs q = regs(e, c + 1);
        if (P) {   /* AT2 set_ins_volume_4op: carriers depend on (hi.con, lo.con) */
            int conn = (ins->con << 1) | P->con;
            tl(e, r.c, &ins->op[1], cv); tl(e, r.m, &ins->op[0], conn == 3 ? cv : 63);
            tl(e, q.c, &P->op[1], conn == 2 ? cv : 63); tl(e, q.m, &P->op[0], conn & 1 ? cv : 63);
            return;
        }
    }
    tl(e, r.m, &ins->op[0], mv); tl(e, r.c, &ins->op[1], cv);
}

/* AT2 calc_freq_shift_up/down: v F-number steps within the 0x156..0x2AE window */
static eng_real slide(eng_real semis, int v, int dir)
{
    eng_real f = 440 * R_POW2((semis - 69) / 12), fn = f * 1048576 / 49716;
    int blk = 0;
    while (fn >= 0x2AE && blk < 7) { blk++; fn /= 2; }
    if (dir > 0) { fn += v; if (fn >= 0x2AE) { if (blk == 7) fn = 0x2AE; else { fn -= 0x158; blk++; } } }
    else { fn -= v; if (fn <= 0x156) { if (blk == 0) fn = 0x156; else { fn += 0x158; blk--; } } }
    return 69 + 12 * R_LOG2(fn * 49716 / R_POW2((eng_real)(20 - blk)) / 440);
}

static void setFreq(Eng *e, int c, eng_real semis)
{
    EngCh *s = &e->ch[c];
    const EngIns *ins = insOf(e, c);
    eng_real f;
    int blk = 0, fn;
    Regs r;
    if (s->ftn) semis = slide(semis, s->ftn < 0 ? -s->ftn : s->ftn, isign(s->ftn));
    f = 440 * R_POW2((semis + (eng_real)((ins ? ins->ft : 0) + e->tune) / 100 - 69) / 12);
    fn = s->zero ? 0 : rnd(f * 1048576 / 49716);
    while (fn > 1023 && blk < 7) { blk++; fn = rnd(f * R_POW2((eng_real)(20 - blk)) / 49716); }
    fn = imax(0, imin(1023, fn)); s->fn = (uint16_t)fn; s->blk = (uint8_t)blk;
    r = regs(e, fch(e, c));
    if (r.k < 0) return;
    w(e, 0xA0 + r.k, fn & 255);
    w(e, 0xB0 + r.k, (s->on && drum(e, c) < 0 ? 0x20 : 0) | (blk << 2) | (fn >> 8));
}

static void keyOff(Eng *e, int c)
{
    EngCh *s = &e->ch[c];
    Regs r = regs(e, fch(e, c));
    int d = drum(e, c);
    s->on = 0; s->pend = 0;
    if (r.k < 0) return;
    if (d >= 0) { e->bd &= (uint8_t)~DRUM[d]; w(e, 0xBD, e->bd); }
    else w(e, 0xB0 + r.k, (s->blk << 2) | (s->fn >> 8));
}

static int trigger(Eng *e, int c, int note, int keep)
{
    EngCh *s = &e->ch[c];
    s->pitch = note; s->base = (int16_t)note; s->fxo = 0; s->vibo = 0; s->tro = 0; s->tmute = 0; s->vpos = 0; s->tpos = 0;
    s->ftn = 0; s->ap = 0; s->ac = 0; s->vp = 0; s->vc = 0; s->vd = 0; s->arpOv = -1; s->vibOv = -1;
    if (!keep) { s->mp = 0; s->md = 0; s->zero = 0; }
    if (!loadInst(e, c)) return 0;
    keyOff(e, c); setFreq(e, c, note);
    if (!s->mute) s->pend = 1;
    return !s->mute;
}

static void flush(Eng *e)
{
    int c;
    for (c = 0; c < ENG_TRACKS; c++) {
        EngCh *s = &e->ch[c];
        if (s->pend) {
            Regs r = regs(e, fch(e, c));
            int d = drum(e, c);
            s->pend = 0; s->on = 1;
            if (r.k < 0) continue;
            if (d >= 0) { e->bd |= DRUM[d]; w(e, 0xBD, e->bd); }
            else w(e, 0xB0 + r.k, 0x20 | (s->blk << 2) | (s->fn >> 8));
        }
    }
}

static void calcSpt(Eng *e)
{
    /* sr * 5 / (2 bpm) in 32.32, in 32-bit divisions (engine.js calcSpt the same) */
    uint32_t n = e->sr * 5, d = 2u * (uint32_t)e->bpm, q = n / d, r = n % d, f1, f2;
    f1 = (r << 16) / d; r = (r << 16) % d;
    f2 = (r << 16) / d;
    e->spt = ((uint64_t)q << 32) | ((uint64_t)f1 << 16) | f2;
}

static int orderAt(const Eng *e, int k) { return k >= 0 && k < e->song->norder ? e->song->order[k] : -1; }
static int res(const Eng *e, int k)
{
    int g, n = e->song->norder;
    for (g = 0; g < 128 && orderAt(e, k) >= 0x80; g++) k = imin(orderAt(e, k) - 0x80, n - 1);
    return orderAt(e, k) >= 0x80 ? 0 : k;
}

/* volume slide: AT2 volume_slide (up wins over down); target follows the Z/F 6-7-8 slide mode */
static void vslide(Eng *e, int c, int up, int dn)
{
    EngCh *s = &e->ch[c];
    const EngIns *ins = insOf(e, c);
    int d = up ? up : -dn, car, mod;
    if (!d) return;
    car = s->vst != 2; mod = s->vst >= 2 || (s->vst == 0 && ins && ins->con);
    if (car) s->vol = (int16_t)imax(0, imin(63, s->vol + d));
    if (mod) s->mvol = (int16_t)imax(0, imin(63, s->mvol + d));
    setVol(e, c);
}
static void setV(Eng *e, int c, int v, int both)
{
    EngCh *s = &e->ch[c];
    const EngIns *ins = insOf(e, c);
    s->vol = (int16_t)imin(63, v);
    if (both || (ins && ins->con)) s->mvol = (int16_t)imin(63, v);
    setVol(e, c);
}
static void vibStep(Eng *e, int c)
{
    EngCh *s = &e->ch[c];
    int amt;
    if (!s->vspd || !s->vdep) return;
    s->vpos = (int16_t)((s->vpos + s->vspd * e->vfac) & 255);
    amt = (s->vdep * e->VT[s->vpos & (e->vsize - 1)]) >> 7;
    s->vibo = slide(s->pitch, amt, s->vpos & e->vsize ? 1 : -1) - s->pitch;
}
static void tremStep(Eng *e, int c)
{
    EngCh *s = &e->ch[c];
    int amt;
    if (!s->tspd || !s->tdep) return;
    s->tpos = (int16_t)((s->tpos + s->tspd * e->vfac) & 255);
    amt = (s->tdep * e->VT[s->tpos & (e->vsize - 1)]) >> 7;
    s->tro = (int16_t)(s->tpos & e->vsize ? amt : -amt);
    setVol(e, c);
}
static void gvolSet(Eng *e, int v)
{
    int c;
    e->gvol = imax(0, imin(63, v));
    for (c = 0; c < ENG_TRACKS; c++) setVol(e, c);
}
static void arpStep(Eng *e, int c)
{
    EngCh *s = &e->ch[c];
    s->fxo = s->as == 0 ? 0 : s->as == 1 ? s->a1 : s->a2;
    s->as = (int16_t)((s->as + 1) % 3);
}
static void porta(Eng *e, int c)
{
    EngCh *s = &e->ch[c];
    eng_real t;
    if (s->ptgt < 0 || !s->pspd) return;
    t = s->ptgt;
    if (s->pitch < t) { eng_real p = slide(s->pitch, s->pspd, 1); s->pitch = p < t ? p : t; }
    else if (s->pitch > t) { eng_real p = slide(s->pitch, s->pspd, -1); s->pitch = p > t ? p : t; }
}
static void pslide(Eng *e, int c, int v, int dir)
{
    EngCh *s = &e->ch[c];
    if (v) {
        eng_real p = slide(s->pitch, v, dir);
        s->pitch = p < 0 ? 0 : p > 127 ? 127 : p;
    }
}

/* FM register macro (AT2 macro_poll_proc): steps with duration, loop, key-off position; 28 columns can be disabled */
static void fmMacro(Eng *e, int c)
{
    enum { IDLE = 0xFFF, FIN = 0xFFFF };
    EngCh *s = &e->ch[c];
    const EngIns *base = s->patch && !s->own ? s->patch : songIns(e, s->inst);
    const EngFmm *M = base ? base->fmm : 0;
    const EngFmStep *st;
    const uint8_t *D, *X;
    EngIns *P;
    int fin, p, on, j;
    if (!M || !M->len || s->mp < 0) return;
    if (s->md > 1) { s->md--; return; }
    fin = s->kol ? IDLE : FIN; p = s->mp;
    if (p <= M->len) {
        if (M->lb && M->ll) p = p == M->lb + M->ll - 1 ? M->lb : p < M->len ? p + 1 : fin;
        else p = p < M->len ? p + 1 : fin;
    } else p = fin;
    on = s->on || s->pend;
    if (on && M->ko && p >= M->ko) p = IDLE;
    else if (!on && p != 0 && M->ko && (p < M->ko || p == IDLE)) p = M->ko;
    s->mp = p;
    if (p == 0 || p == IDLE || p == FIN) return;
    st = &M->steps[p - 1];   /* (p <= len here) */
    s->md = st->dur;
    if (!st->dur) return;
    P = own(e, c); D = st->d; X = M->dis;
    if (!P) return;
#define EN(q) (!X[q])
    for (j = 0; j < 2; j++) {
        EngOp *o = &P->op[j];
        int q = j * 12, a = D[j], kv = D[2 + j], ad = D[4 + j], sr = D[6 + j];
        if (EN(q)) o->ar = (uint8_t)(ad >> 4);
        if (EN(q + 1)) o->dr = ad & 15;
        if (EN(q + 2)) o->sl = (uint8_t)(sr >> 4);
        if (EN(q + 3)) o->rr = sr & 15;
        if (EN(q + 4)) o->ws = D[8 + j] & 7;
        if (EN(q + 5)) o->tl = kv & 63;
        if (EN(q + 6)) o->ksl = (uint8_t)(kv >> 6);
        if (EN(q + 7)) o->mult = a & 15;
        if (EN(q + 8)) o->am = (uint8_t)(a >> 7);
        if (EN(q + 9)) o->vib = a >> 6 & 1;
        if (EN(q + 10)) o->ksr = a >> 4 & 1;
        if (EN(q + 11)) o->egt = a >> 5 & 1;
    }
    if (EN(24)) P->con = D[10] & 1;
    if (EN(25)) P->fb = D[10] >> 1 & 7;
    if (EN(27) && s->plock != 1) s->panOv = st->pan == 0 ? 1 : st->pan == 1 ? 0 : st->pan == 2 ? 2 : 1;
    loadInst(e, c);
    if (D[10] & 0x80) trigger(e, c, s->base, 1);
    else if (D[10] & 0x40) { keyOff(e, c); s->pend = !s->mute; }
    else if (D[10] & 0x20) s->zero = !s->zero;
    if (EN(26) && st->fs) pslide(e, c, st->fs < 0 ? -st->fs : st->fs, isign(st->fs));
#undef EN
}

static void setOp(Eng *e, int c, int j, int k, int v)
{
    EngIns *p = own(e, c);
    EngOp *o;
    if (!p) return;
    o = &p->op[j];
    if (k == 0) o->ar = (uint8_t)v; else if (k == 1) o->dr = (uint8_t)v; else if (k == 2) o->sl = (uint8_t)v; else o->rr = (uint8_t)v;
    loadInst(e, c);
}

/* this row's effect list: the first (f) / the first (f, hi nibble) */
static int has(const EngCh *s, int f) { int i; for (i = 0; i < s->ne; i++) if (s->ef[i] == f) return i; return -1; }
static int ext(const EngCh *s, int f, int hi) { int i; for (i = 0; i < s->ne; i++) if (s->ef[i] == f && s->ev[i] >> 4 == hi) return i; return -1; }

static void extCmd(Eng *e, int c, int x, int y)
{
    EngCh *s = &e->ch[c];
    switch (x) {
    case 0: e->bd = y ? e->bd | 0x80 : e->bd & 0x7F; w(e, 0xBD, e->bd); break;
    case 1: e->bd = y ? e->bd | 0x40 : e->bd & 0xBF; w(e, 0xBD, e->bd); break;
    case 2: setOp(e, c, 0, 0, y); break; case 3: setOp(e, c, 0, 1, y); break;
    case 4: setOp(e, c, 0, 2, y); break; case 5: setOp(e, c, 0, 3, y); break;
    case 6: setOp(e, c, 1, 0, y); break; case 7: setOp(e, c, 1, 1, y); break;
    case 8: setOp(e, c, 1, 2, y); break; case 9: setOp(e, c, 1, 3, y); break;
    case 10: { EngIns *p = own(e, c); if (p) { p->fb = y & 7; loadInst(e, c); } break; }
    case 11: if (y <= 2) { s->panOv = y == 0 ? 1 : y == 1 ? 0 : 2; loadInst(e, c); } break;
    case 12: case 13: {
        EngLoop *L = 0;
        int i;
        if (!y) { s->ls = (int16_t)e->row; break; }
        for (i = 0; i < ENG_LOOPS; i++)
            if (s->lc[i].on && s->lc[i].ord == e->ord && s->lc[i].row == e->row) L = &s->lc[i];
        if (!L) {
            for (i = 0; i < ENG_LOOPS && s->lc[i].on; i++) ;
            if (i == ENG_LOOPS) break;       /* (more loops at once than engine.js would ever meet: none) */
            L = &s->lc[i]; L->on = 1; L->ord = (uint16_t)e->ord; L->row = (uint16_t)e->row; L->n = (uint8_t)y;
        }
        if (L->n > 0) { L->n--; e->loopTo = s->ls; } else L->on = 0;
        break;
    }
    /* restart envelope; macro key-off loop, porta key and 4-op locks have no effect here */
    case 14: if (y == 4) { keyOff(e, c); s->pend = !s->mute; } else if (y == 0) s->kol = 0; else if (y == 1) s->kol = 1; break;
    case 15:
        if (y == 0) keyOff(e, c);
        else if (y == 1) { s->vol = 63; s->mvol = 63; setVol(e, c); }
        else if (y == 2) s->vlock = 1; else if (y == 3) s->vlock = 0;
        else if (y == 6 || y == 7) {
            int i, both = 0;
            for (i = 0; i < s->ne; i++)
                if (s->ef[i] == 35 && (s->ev[i] == 0xF6 || s->ev[i] == 0xF7) && s->ev[i] != (x << 4 | y)) both = 1;
            s->vst = both ? 3 : y == 7 ? 1 : 2;
        }
        else if (y == 8) s->vst = 0;
        else if (y == 9) s->plock = 1; else if (y == 10) s->plock = 0;
        else if (y == 11) s->vibo = 0; else if (y == 12) { s->tro = 0; setVol(e, c); }
        break;
    }
}

static void ext3(Eng *e, int c, int x, int y)
{
    EngIns *p = own(e, c);
    int j, k;
    if (!p) return;
    j = x >= 7 ? 1 : 0; k = x >= 7 ? x - 6 : x;
    if (x == 0) p->con = y & 1;
    else if (k == 1) p->op[j].mult = (uint8_t)y; else if (k == 2) p->op[j].ksl = y & 3; else if (k == 3) p->op[j].am = y & 1;
    else if (k == 4) p->op[j].vib = y & 1; else if (k == 5) p->op[j].ksr = y & 1; else if (k == 6) p->op[j].egt = y & 1;
    loadInst(e, c);
}

static int prevHas(const uint8_t *prev, int np, int a, int b, int c2, int d)
{
    int i;
    for (i = 0; i < np; i++) if (prev[i] == a || prev[i] == b || prev[i] == c2 || prev[i] == d) return 1;
    return 0;
}

static void doRow(Eng *e)
{
    const EngSong *S = e->song;
    int c, p = orderAt(e, e->ord), havePat;
    uint32_t trig = 0;
    EngCell probe;
    e->jump = -1; e->brk = -1; e->loopTo = -1; e->extra = 0;
    memset(e->gsl_d, 0, sizeof e->gsl_d);   /* AT2 clears global slides every row */
    havePat = p >= 0 && S->cell(S, p, e->row, 0, &probe);
    if (havePat) {
        for (c = 0; c < ENG_TRACKS; c++) {
            EngCh *s = &e->ch[c];
            EngCell cell;
            uint8_t prev[2];
            int np, i, pe, nd, noRestart, fv;
            if (!active(e, c) || pairLo(e, c)) continue;
            S->cell(S, p, e->row, c, &cell);
            np = s->ne; prev[0] = s->ef[0]; prev[1] = s->ef[1];
            s->ftn = 0;
            if (pairHi(e, c) >= 0) {
                EngCell lc;
                S->cell(S, p, e->row, c + 1, &lc);
                if (lc.ins > 0) { e->ch[c + 1].inst = lc.ins; e->ch[c + 1].patch = 0; }
                /* a 4-op voice: the note and effects may sit on either track of the pair (AT2 allows both) */
                if (cell.note == -1) cell.note = lc.note;
                if (cell.fx[0] < 0) { cell.fx[0] = lc.fx[0]; cell.v[0] = lc.v[0]; }
                if (cell.fx[1] < 0) { cell.fx[1] = lc.fx[1]; cell.v[1] = lc.v[1]; }
            }
            s->fxo = 0; s->vibo = 0;
            if (s->tro) { s->tro = 0; setVol(e, c); }
            s->ne = 0;
            for (i = 0; i < 2; i++)
                if (cell.fx[i] >= 0) { s->ef[s->ne] = (uint8_t)cell.fx[i]; s->ev[s->ne] = cell.v[i]; s->ne++; }
            fv = ext(s, 35, 15);
            s->fineV = fv >= 0 && (s->ev[fv] & 15) == 13; s->fineT = fv >= 0 && (s->ev[fv] & 15) == 14;
            if (cell.ins > 0) s->inst = cell.ins;
            pe = has(s, 3) >= 0 || has(s, 5) >= 0 || has(s, 16) >= 0; nd = ext(s, 36, 2);
            if (pe) {
                int h3 = has(s, 3);
                if (h3 >= 0 && s->ev[h3]) s->pspd = s->ev[h3];
                if (cell.note >= 0) s->ptgt = cell.note;
            }
            if (cell.note >= 0 && nd >= 0 && (s->ev[nd] & 15)) { s->nd = s->ev[nd] & 15; s->ndn = cell.note; }
            else if (cell.note >= 0 && pe && (s->on || s->pend)) { /* tone portamento: glide, no retrigger */ }
            else if (cell.note >= 0) {
                s->patch = 0; s->own = 0;
                if (!s->vlock) { s->vol = 63; s->mvol = 63; }
                if (s->plock != 1) s->panOv = -1;
                if (trigger(e, c, cell.note, 0)) trig |= 1u << c;
            }
            else if (cell.note == -2) keyOff(e, c);
            noRestart = fv >= 0 && (s->ev[fv] & 15) == 15;
            for (i = 0; i < s->ne; i++) {
                int f = s->ef[i], v = s->ev[i], x = v >> 4, y = v & 15, k;
                switch (f) {
                case 0: case 42: if (!v) break; s->a1 = (int16_t)x; s->a2 = (int16_t)y; /* falls through */
                case 24: case 25: if (!prevHas(prev, np, 0, 42, 24, 25)) s->as = 0; break;
                case 1: case 2: case 7: case 8: s->fsl = (int16_t)v; break;
                case 4: case 43: if (x) s->vspd = (int16_t)x; if (y) s->vdep = (int16_t)y; break;
                case 22: case 44: if (x) s->tspd = (int16_t)x; if (y) s->tdep = (int16_t)y; break;
                case 9: s->mvol = (int16_t)imin(63, v); setVol(e, c); break;
                case 18: s->vol = (int16_t)imin(63, v); setVol(e, c); break;
                case 12: case 40: setV(e, c, v, 0); break;
                case 11: e->jump = v; break;
                case 13: e->brk = v; break;
                case 15: if (v > 0) { if (v < 32) e->speed = v; else { e->bpm = v; calcSpt(e); } } break;
                case 19: { EngIns *P = own(e, c); if (!P) break; if (x < 8) P->op[1].ws = (uint8_t)x; if (y < 8) P->op[0].ws = (uint8_t)y; loadInst(e, c); break; }
                case 21: if (v) { if (!prevHas(prev, np, 21, 26, 26, 26)) s->rtc = 1; } break;
                case 26: if (x) { if (!prevHas(prev, np, 21, 26, 26, 26)) s->rtc = 1; } break;
                case 23: if (x && y && !prevHas(prev, np, 23, 23, 23, 23)) { s->trp = 0; s->tmute = 0; } break;
                case 38: s->arpOv = (int16_t)v; if (!noRestart) { s->ap = 0; s->ac = 0; } break;
                case 39: s->vibOv = (int16_t)v; if (!noRestart) { s->vp = 0; s->vc = 0; s->vd = 0; } break;
                case 35: extCmd(e, c, x, y); break;
                case 36:
                    if (x == 0) e->extra = imax(e->extra, y); else if (x == 1) e->extra = imax(e->extra, e->speed * y);
                    else if (x == 3) s->nc = (int16_t)y; else if (x == 4) s->ftn = (int16_t)(s->ftn + y); else if (x == 5) s->ftn = (int16_t)(s->ftn - y);
                    break;
                case 41: ext3(e, c, x, y); break;
                case 37: gvolSet(e, v); break;
                case 45: speedTab(e, v); break;
                case 46: case 47: for (k = c; k < ENG_TRACKS; k++) { e->gsl_d[k] = f == 46 ? 1 : -1; e->gsl_v[k] = (uint8_t)v; } s->fsl = (int16_t)v; break;
                }
            }
            /* once-per-row ("fine") effects: AT2 update_fine_effects */
            for (i = 0; i < s->ne; i++) {
                int f = s->ef[i], v = s->ev[i], x = v >> 4, y = v & 15;
                switch (f) {
                case 7: pslide(e, c, v, 1); break; case 8: pslide(e, c, v, -1); break;
                case 20: case 25: case 16: case 17: case 31: case 32: vslide(e, c, x, y); break;
                case 29: pslide(e, c, s->fsl, 1); break; case 30: pslide(e, c, s->fsl, -1); break;
                case 33: pslide(e, c, s->fsl, 1); vslide(e, c, x, y); break;
                case 34: pslide(e, c, s->fsl, -1); vslide(e, c, x, y); break;
                case 36: if (x == 8) gvolSet(e, e->gvol + y); else if (x == 9) gvolSet(e, e->gvol - y); break;
                }
                if (s->fineV && (f == 4 || f == 6 || f == 17)) vibStep(e, c);
                if (s->fineT && f == 22) tremStep(e, c);
            }
        }
    }
    if (e->pos) e->pos(e->u, e->ord, e->row, trig);
}

static void doFx(Eng *e, int xf)
{
    static const uint8_t VS[6] = {0, 1, 2, 4, 8, 16};
    int c, i;
    for (c = 0; c < ENG_TRACKS; c++) {
        EngCh *s = &e->ch[c];
        if (!active(e, c)) continue;
        if (!s->ne && e->gsl_d[c]) pslide(e, c, e->gsl_v[c], e->gsl_d[c]);
        if (s->nd >= 0) {
            if (s->nd == 0) {
                s->nd = -1; s->patch = 0; s->own = 0;
                if (!s->vlock) { s->vol = 63; s->mvol = 63; }
                trigger(e, c, s->ndn, 0);
            } else s->nd--;
        }
        if (s->nc >= 0) { if (s->nc == 0) { s->nc = -1; keyOff(e, c); } else s->nc--; }
        for (i = 0; i < s->ne; i++) {
            int f = s->ef[i], v = s->ev[i], x = v >> 4, y = v & 15;
            switch (f) {
            case 0: if (v) arpStep(e, c); break;
            case 24: vslide(e, c, x, y); arpStep(e, c); break;
            case 25: arpStep(e, c); break;
            case 1: pslide(e, c, v, 1); break; case 2: pslide(e, c, v, -1); break;
            case 3: case 16: porta(e, c); break;
            case 5: vslide(e, c, x, y); porta(e, c); break;
            case 4: case 17: if (!s->fineV) vibStep(e, c); break;
            case 6: vslide(e, c, x, y); if (!s->fineV) vibStep(e, c); break;
            case 10: vslide(e, c, x, y); break;
            case 22: if (!s->fineT) tremStep(e, c); break;
            case 27: pslide(e, c, s->fsl, 1); vslide(e, c, x, y); break;
            case 28: pslide(e, c, s->fsl, -1); vslide(e, c, x, y); break;
            case 29: case 30: vslide(e, c, x, y); break;
            case 31: pslide(e, c, s->fsl, 1); break; case 32: pslide(e, c, s->fsl, -1); break;
            case 21: if (v) { if (s->rtc >= v) { s->rtc = 0; trigger(e, c, s->base, 0); } else s->rtc++; } break;
            case 26: if (x) {
                if (s->rtc >= x) {
                    int keep;
                    s->rtc = 0;
                    if (y >= 1 && y <= 5) vslide(e, c, 0, VS[y]); else if (y >= 9 && y <= 13) vslide(e, c, VS[y - 8], 0);
                    else if (y == 6) s->vol = (int16_t)rnd((eng_real)s->vol * 2 / 3); else if (y == 7) s->vol = (int16_t)rnd((eng_real)s->vol / 2);
                    else if (y == 14) s->vol = (int16_t)imin(63, rnd((eng_real)s->vol * 3 / 2)); else if (y == 15) s->vol = (int16_t)imin(63, s->vol * 2);
                    keep = s->vol; trigger(e, c, s->base, 0); s->vol = (int16_t)keep; setVol(e, c);
                } else s->rtc++;
            } break;
            case 36: if (x == 6) gvolSet(e, e->gvol + y); else if (x == 7) gvolSet(e, e->gvol - y); break;
            case 23: if (x && y) {   /* tremor: x ticks on, y ticks off */
                if (s->trp >= 0) { if (s->trp + 1 <= x) s->trp++; else { s->tmute = 1; s->trp = -1; setVol(e, c); } }
                else if (s->trp - 1 >= -y) s->trp--; else { s->tmute = 0; s->trp = 1; setVol(e, c); }
            } break;
            }
            if (xf) switch (f) {   /* extra fine: every 4th tick */
            case 42: arpStep(e, c); break;
            case 43: if (!s->fineV) vibStep(e, c); break;
            case 44: if (!s->fineT) tremStep(e, c); break;
            case 36:
                if (x == 10) gvolSet(e, e->gvol + y); else if (x == 11) gvolSet(e, e->gvol - y);
                else if (x == 12) vslide(e, c, y, 0); else if (x == 13) vslide(e, c, 0, y);
                else if (x == 14) pslide(e, c, y, 1); else if (x == 15) pslide(e, c, y, -1);
                break;
            }
        }
    }
}

/* song[kind][n - 1], or none (n 0, or past the 16 tables) */
static const EngTab *table(const Eng *e, const EngTab *L, int n) { return e->song && n > 0 && n <= 16 ? &L[n - 1] : 0; }

static void macroTick(Eng *e)
{
    int c;
    for (c = 0; c < ENG_TRACKS; c++) {
        EngCh *s = &e->ch[c];
        const EngIns *ins;
        const EngTab *A, *V;
        eng_real off = 0;
        fmMacro(e, c);
        if (!s->on && !s->pend) continue;
        ins = insOf(e, c);
        if (!ins) continue;
        A = table(e, e->song->arp, s->arpOv >= 0 ? s->arpOv : ins->arpT);
        V = table(e, e->song->vib, s->vibOv >= 0 ? s->vibOv : ins->vibT);
        if (A && A->len > 0) {
            off += A->data[imin(s->ap, A->len - 1)];
            if (++s->ac >= A->spd) { s->ac = 0; if (++s->ap >= A->len) s->ap = A->loop >= 0 && A->loop < A->len ? A->loop : A->len - 1; }
        }
        if (V && V->len > 0) {
            if (s->vd < V->delay) s->vd++;
            else {
                off += (eng_real)V->data[imin(s->vp, V->len - 1)] / 16;
                if (++s->vc >= V->spd) { s->vc = 0; if (++s->vp >= V->len) s->vp = V->loop >= 0 && V->loop < V->len ? V->loop : V->len - 1; }
            }
        }
        if (!A && !V && !s->ne && !s->vibo && !s->fxo && !s->ftn && s->mp < 0) continue;
        setFreq(e, c, s->pitch + s->fxo + s->vibo + off);
    }
}

static void doTick(Eng *e)
{
    const EngSong *S = e->song;
    int xf, k, n;
    if (e->tick == 0) doRow(e);
    xf = ++e->xf % 4 == 0;
    doFx(e, xf);
    for (k = 0; k < (S->mspd ? S->mspd : 1); k++) macroTick(e);
    if (++e->tick >= e->speed + e->extra) {
        e->tick = 0;
        n = S->norder;
        if (e->loopTo >= 0) e->row = e->loopTo;   /* Z C/D pattern loop */
        else if (e->jump >= 0 || e->brk >= 0) {   /* Bxx position jump, Dxx pattern break (row) */
            if (!e->loop) e->ord = res(e, e->jump >= 0 ? imin(e->jump, n - 1) : (e->ord + 1) % n);
            e->row = e->brk >= 0 ? imin(e->brk, S->rows - 1) : 0;
        }
        else if (++e->row >= S->rows) { e->row = 0; if (!e->loop) e->ord = res(e, (e->ord + 1) % n); }
    }
}

/* stop: cut every voice at once (fast release + full attenuation), instead of letting release tails ring */
static void silence(Eng *e)
{
    int c;
    for (c = 0; c < ENG_TRACKS; c++) {
        Regs r = regs(e, c);
        EngCh *s = &e->ch[c];
        if (r.m >= 0) { w(e, 0x80 + r.m, 0x0F); w(e, 0x40 + r.m, 0x3F); }
        if (r.c >= 0) { w(e, 0x80 + r.c, 0x0F); w(e, 0x40 + r.c, 0x3F); }
        keyOff(e, c); s->nd = -1; s->nc = -1; s->ne = 0;
    }
}

static void applyGlobals(Eng *e)
{
    const EngSong *S = e->song;
    int l = S->lfo, o3 = S->opl != 2, pc = !!S->perc, f4 = o3 ? S->four & 63 : 0, c;
    if (o3 != e->opl3 || pc != e->perc || f4 != e->f4) {
        silence(e); e->opl3 = (uint8_t)o3; e->perc = (uint8_t)pc; e->f4 = (uint8_t)f4;
        w(e, 0x105, o3 ? 1 : 0);
        if (o3) w(e, 0x104, f4);
    }
    e->bd = (uint8_t)(((l >> 1) & 1) << 7 | (l & 1) << 6 | (pc ? 0x20 : 0)); w(e, 0xBD, e->bd);
    e->gvol = S->gvol;
    speedTab(e, S->vtab);
    for (c = 0; c < ENG_TRACKS; c++) setVol(e, c);
}

void eng_init(Eng *e, uint32_t sr, void (*wr)(void *, uint16_t, uint8_t), void *u)
{
    int c;
    memset(e, 0, sizeof *e);
    e->sr = sr; e->w = wr; e->u = u;
    w(e, 0x105, 1); w(e, 0x104, 0); w(e, 0x01, 0x20); w(e, 0x08, 0); w(e, 0xBD, 0); e->bd = 0;
    for (c = 0; c < ENG_TRACKS; c++) { fresh(&e->ch[c]); e->pmap[c] = -1; }
    e->speed = 6; e->bpm = 125; e->gvol = 63; e->opl3 = 1; e->vsize = 32; e->vfac = 1;
    e->spt = (uint64_t)1 << 32;
    speedTab(e, 0);
}

void eng_song(Eng *e, const EngSong *s)
{
    e->song = s; e->bpm = s->bpm; e->speed = s->speed; calcSpt(e); applyGlobals(e);
}

void eng_tune(Eng *e, int cents) { e->tune = cents; }

void eng_play(Eng *e, int ord, int row, int loop)
{
    int c;
    silence(e);
    for (c = 0; c < ENG_TRACKS; c++) { uint8_t mu = e->ch[c].mute; fresh(&e->ch[c]); e->ch[c].mute = mu; }
    applyGlobals(e);
    memset(e->gsl_d, 0, sizeof e->gsl_d);
    e->ord = res(e, ord); e->row = row; e->loop = (uint8_t)!!loop; e->tick = 0; e->acc = e->spt; e->extra = 0;
    e->bpm = e->song->bpm; e->speed = e->song->speed; calcSpt(e); e->playing = 1;
}

void eng_stop(Eng *e) { e->playing = 0; silence(e); }

void eng_on(Eng *e, int c, int inst, int note, const EngIns *patch)
{
    const EngIns *I0 = patch ? patch : songIns(e, inst);
    EngCh *s;
    if (I0 && I0->four && e->opl3 && pairHi(e, c) < 0) {   /* preview a 4-op sound on the last pair */
        e->f4 |= 32; w(e, 0x104, e->f4);
        e->pmap[c] = 13; c = 13; e->ch[14].inst = 0; e->ch[14].patch = 0;
    }
    else e->pmap[c] = -1;
    s = &e->ch[c];
    s->mp = 0; s->md = 0; s->inst = (int16_t)inst; s->patch = patch; s->own = 0; s->vol = 63; s->mvol = 63; s->ne = 0; s->panOv = -1;
    trigger(e, c, note, 0);
}

void eng_off(Eng *e, int c) { keyOff(e, e->pmap[c] >= 0 ? e->pmap[c] : c); }

void eng_mute(Eng *e, uint32_t mask)
{
    int c;
    for (c = 0; c < ENG_TRACKS; c++) { e->ch[c].mute = (uint8_t)(mask >> c & 1); if (e->ch[c].mute) keyOff(e, c); }
}

void eng_render(Eng *e, int16_t *lr, uint32_t n)
{
    uint32_t pos = 0;
    while (pos < n) {
        uint32_t k = n - pos < 32 ? n - pos : 32;
        flush(e);
        if (e->song) {
            e->acc += (uint64_t)k << 32;
            while (e->acc >= e->spt) { e->acc -= e->spt; if (e->playing) doTick(e); else macroTick(e); }
        }
        if (e->chip) e->chip(e->u, lr + 2 * pos, k);
        pos += k;
    }
}
