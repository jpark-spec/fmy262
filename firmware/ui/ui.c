/* FM-1 OPL3 tracker: the screen and controls (ui.h), web/template.html function by function.
 * JS names are kept (st, song, knob, press, drawPat ...) so the two can be read side by side. */
#include "ui.h"
#include <stdarg.h>
#include <string.h>
#include "ui_data.h"
#include "songfile.h"

#define clamp(v, a, b) ((v) < (a) ? (a) : (v) > (b) ? (b) : (v))
static int imin(int a, int b) { return a < b ? a : b; }
static int imax(int a, int b) { return a > b ? a : b; }
static int iabs(int a) { return a < 0 ? -a : a; }
static int fdiv(int a, int b) { int q = a / b; return (a % b && (a < 0) != (b < 0)) ? q - 1 : q; }   /* floor(a / b) */
static int rdiv(int a, int b) { if (b < 0) { a = -a; b = -b; } return fdiv(2 * a + b, 2 * b); }   /* Math.round(a / b), exactly */
static int fround(float v) { int f = (int)v; if ((float)f > v) f--; return v - (float)f >= 0.5f ? f + 1 : f; }   /* Math.round */
static int mod(int a, int n) { return ((a % n) + n) % n; }
/* the libc the device lacks (its string.h: memset, memcpy) */
static int u_strlen(const char *s) { int n = 0; while (s[n]) n++; return n; }
static int u_strcmp(const char *a, const char *b) { while (*a && *a == *b) { a++; b++; } return (uint8_t)*a - (uint8_t)*b; }
static int u_strncmp(const char *a, const char *b, int n) { while (n > 0 && *a && *a == *b) { a++; b++; n--; } return n ? (uint8_t)*a - (uint8_t)*b : 0; }
static void u_strcat(char *d, const char *s) { d += u_strlen(d); while ((*d++ = *s++)) {} }
static void u_memmove(void *d, const void *s, int n)
{
    uint8_t *a = (uint8_t *)d;
    const uint8_t *b = (const uint8_t *)s;
    if (a < b) while (n-- > 0) *a++ = *b++;
    else if (a > b) while (n-- > 0) a[n] = b[n];
}
#undef strlen
#undef strcmp
#undef strncmp
#undef strcat
#undef memmove
#define strlen u_strlen
#define strcmp u_strcmp
#define strncmp u_strncmp
#define strcat u_strcat
#define memmove(d, s, n) u_memmove(d, s, (int)(n))

/* ================================================================== text ================================== */
/* the next codepoint of UTF-8 s */
static uint32_t cp(const char **s)
{
    const uint8_t *p = (const uint8_t *)*s;
    uint32_t c = *p++;
    if (c >= 0xF0) { c = (c & 7) << 18 | (p[0] & 63u) << 12 | (p[1] & 63u) << 6 | (p[2] & 63u); p += 3; }
    else if (c >= 0xE0) { c = (c & 15) << 12 | (p[0] & 63u) << 6 | (p[1] & 63u); p += 2; }
    else if (c >= 0xC0) { c = (c & 31) << 6 | (p[0] & 63u); p += 1; }
    *s = (const char *)p;
    return c;
}
static int ulen(const char *s) { int n = 0; while (*s) { cp(&s); n++; } return n; }
/* the first n codepoints of s (bytes) */
static int ubytes(const char *s, int n) { const char *p = s; while (n-- > 0 && *p) cp(&p); return (int)(p - s); }

/* strings for the screen: a ring of buffers, each line's text built and used before it comes round again */
#define NB 64
static char bufs[NB][96];
static int bufi;
static char *nb(void) { char *b = bufs[bufi]; bufi = (bufi + 1) % NB; b[0] = 0; return b; }

/* printf, the little the screen needs: %s %d %c %X with 0 and width (no libc on the device) */
static char *F(const char *f, ...)
{
    char *b = nb(), *o = b, *e = b + 95;
    va_list ap;
    va_start(ap, f);
    for (; *f && o < e; f++) {
        int w = 0, z = 0;
        char t[24];
        int n = 0, neg = 0;
        if (*f != '%') { *o++ = *f; continue; }
        f++;
        if (*f == '0') { z = 1; f++; }
        while (*f >= '0' && *f <= '9') w = w * 10 + (*f++ - '0');
        if (*f == 's') {
            const char *s = va_arg(ap, const char *);
            if (!s) s = "";
            while (*s && o < e) *o++ = *s++;
            continue;
        }
        if (*f == 'c') { *o++ = (char)va_arg(ap, int); continue; }
        if (*f == 'd' || *f == 'X') {
            int v = va_arg(ap, int);
            unsigned u, base = *f == 'X' ? 16u : 10u;
            if (*f == 'd' && v < 0) { neg = 1; u = (unsigned)(-v); } else u = (unsigned)v;
            do { unsigned d = u % base; t[n++] = (char)(d < 10 ? '0' + d : 'A' + d - 10); u /= base; } while (u);
            if (neg && !z) t[n++] = '-';
            while (n < w - (neg && z) && n < 20) t[n++] = z ? '0' : ' ';
            if (neg && z) t[n++] = '-';
            while (n && o < e) *o++ = t[--n];
            continue;
        }
        *o++ = *f;
    }
    *o = 0;
    va_end(ap);
    return b;
}
static char *hex(int v, int n) { return F(n == 1 ? "%X" : n == 2 ? "%02X" : "%03X", v); }
static char *dec2(int v) { return F("%02d", v); }

/* ================================================================== drawing ================================ */
static uint16_t *fb;
static int fy0, fh;
static uint16_t K[K_N];                  /* the theme's colours */
static uint16_t FXC[9];
static uint16_t c565(uint32_t rgb)
{
    uint16_t c = (uint16_t)(((rgb >> 19) & 31) << 11 | ((rgb >> 10) & 63) << 5 | ((rgb >> 3) & 31));
#ifdef UI_SWAP
    c = (uint16_t)(c << 8 | c >> 8);
#endif
    return c;
}
static void rect(int x, int y, int w, int h, uint16_t c)
{
    int x1 = x + w, y1 = y + h, i, j;
    if (w <= 0 || h <= 0) return;
    if (x < 0) x = 0;
    if (x1 > UI_W) x1 = UI_W;
    if (y < fy0) y = fy0;
    if (y1 > fy0 + fh) y1 = fy0 + fh;
    for (j = y; j < y1; j++) { uint16_t *p = fb + (j - fy0) * UI_W; for (i = x; i < x1; i++) p[i] = c; }
}
static void pset(int x, int y, uint16_t c) { if (x >= 0 && x < UI_W && y >= fy0 && y < fy0 + fh) fb[(y - fy0) * UI_W + x] = c; }
static int glyph(uint32_t c)
{
    int lo = 0, hi = FONT_N - 1;
    if (c >= 'a' && c <= 'z') c -= 32;   /* (toUpperCase) */
    while (lo <= hi) { int m = (lo + hi) / 2; if (FONT_CP[m] == c) return m; if (FONT_CP[m] < c) lo = m + 1; else hi = m - 1; }
    return -1;
}
static int QM = -1;
/* size >= 12: double (12 px advance, 14 tall), else 6 px, 7 tall */
static void txt(const char *s, int x, int y, uint16_t col, int size)
{
    int k = size >= 28 ? 4 : size >= 12 ? 2 : 1, i = 0;
    if (y > fy0 + fh || y + 7 * k <= fy0) return;
    if (QM < 0) QM = glyph('?');
    while (*s) {
        uint32_t c = cp(&s);
        int j, r, b;
        if (c != ' ') {
            j = glyph(c);
            if (j < 0) j = QM;
            for (r = 0; r < 7; r++) {
                uint8_t row = FONT_ROWS[j][r];
                for (b = 0; b < 5; b++)
                    if (row & (16 >> b)) {
                        if (k == 1) pset(x + i * 6 + b, y + r, col);
                        else rect(x + i * 6 * k + b * k, y + r * k, k, k, col);
                    }
            }
        }
        i++;
    }
}
static int tw(const char *s, int k) { int n = ulen(s); return n ? n * 6 * k - k : 0; }
static char *cut(const char *s, int w)
{
    int n = (w + 1) / 6, b;
    char *o;
    if (ulen(s) <= n) return (char *)s;
    o = nb(); b = ubytes(s, n);
    if (b > 95) b = 95;
    memcpy(o, s, (size_t)b); o[b] = 0;
    return o;
}
static char *slice(const char *s, int n) { return cut(s, n * 6 - 1); }   /* the first n characters */
/* centred on cx2 / 2 (half pixels: JS rounds x + w / 2 - floor(tw / 2)) */
static void ctxt2(const char *s, int cx2, int y, uint16_t col, int size)
{
    int k = size >= 28 ? 4 : size >= 12 ? 2 : 1;
    txt(s, rdiv(cx2 - 2 * (tw(s, k) / 2), 2), y, col, size);
}
#define ctxt(s, cx, y, col, size) ctxt2(s, 2 * (cx), y, col, size)
static void pline(int x0, int y0, int x1, int y1, uint16_t col)
{
    int dx = iabs(x1 - x0), dy = -iabs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) {
        int e2;
        pset(x0, y0, col);
        if (x0 == x1 && y0 == y1) break;
        e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
    }
}
static void frameRect(int x, int y, int w, int h, uint16_t c) { rect(x, y, w, 1, c); rect(x, y + h - 1, w, 1, c); rect(x, y, 1, h, c); rect(x + w - 1, y, 1, h, c); }

#define Cbg K[K_BG]
#define Cbeat K[K_BEAT]
#define Ccur K[K_CUR]
#define Cplay K[K_PLAY]
#define Cbar K[K_BAR]
#define Cgrey K[K_GREY]
#define Cwhite K[K_WHITE]
#define Ccyan K[K_CYAN]
#define Cyellow K[K_YELLOW]
#define Cgreen K[K_GREEN]
#define Cred K[K_RED]
#define Cmag K[K_MAG]
#define Cdim K[K_DIM]
#define Cpanel K[K_PANEL]
#define Cline K[K_LINE]
#define Ctrack K[K_TRACK]
#define Cchsel K[K_CHSEL]

/* card values: double size, up to 4 characters, or a number with a small unit (614 MS) */
static void cardVal(const char *v, int x, int y)
{
    const char *p = v, *num, *u;
    int nb_, ok = 0;
    char *n;
    if (*p == '-' || *p == '+') p++;
    else if (!strncmp(p, "×", 2)) p += 2;
    num = p;
    while ((*p >= '0' && *p <= '9') || *p == '.' || !strncmp(p, "∞", 3)) p += *p == (char)0xE2 ? 3 : 1;
    nb_ = (int)(p - v);
    if (p > num) {
        const char *q = p;
        while (*q == ' ') q++;
        u = q;
        if ((!strcmp(u, "MS") || !strcmp(u, "ms") || !strcmp(u, "S") || !strcmp(u, "s") || !strcmp(u, "DB") || !strcmp(u, "K")) && nb_ < 80) {   /* (no C: 0C is hex) */
            n = nb(); memcpy(n, v, (size_t)nb_); n[nb_] = 0;
            if (tw(n, 2) + 2 + tw(u, 1) <= 54) ok = 1;
            if (ok) { txt(n, x, y, Cwhite, 12); txt(u, x + tw(n, 2) + 2, y + 7, Cgrey, 8); return; }
        }
    }
    txt(slice(v, 4), x, y, Cwhite, 12);
}
static void cards(const char *const L[4], const char *const V[4])
{
    int i;
    for (i = 0; i < 4; i++) { int x = i * 60; rect(x, 0, 59, 25, Cbar); txt(cut(L[i], 54), x + 3, 1, Ccyan, 8); cardVal(V[i], x + 3, 10); }
}
#define CARDS(a, b, c, d, e, f, g, h) do { const char *L_[4] = {a, b, c, d}, *V_[4] = {e, f, g, h}; cards(L_, V_); } while (0)
static void status(const char *l, const char *r, uint16_t rc)
{
    int rw = r && *r ? tw(r, 1) + 6 : 0;
    rect(0, 26, 240, 10, Cpanel);
    txt(cut(l, 235 - rw), 2, 28, Cgrey, 8);
    if (r && *r) txt(r, 238 - tw(r, 1), 28, rc, 8);
}
static void bar(int y, const char *l, const char *r, uint16_t lc, uint16_t rcol)
{
    rect(0, y, 240, 10, Cbar);
    if (l && *l) txt(cut(l, 236 - (r && *r ? tw(r, 1) + 6 : 0)), 3, y + 2, lc, 8);
    if (r && *r) txt(r, 237 - tw(r, 1), y + 2, rcol, 8);
}
static void foot(const char *s, uint16_t col) { rect(0, 229, 240, 11, Cpanel); txt(cut(s, 236), 3, 231, col, 8); }
static void chip(int x, int y, int w, const char *label, int on, int cur)
{
    rect(x, y, w, 11, on ? Cgreen : Cline);
    ctxt2(label, 2 * x + w, y + 2, on ? Cbg : Cdim, 8);
    if (cur) frameRect(x - 2, y - 2, w + 4, 15, Cwhite);
}
static void hbar(int x, int y, int w, int v, int max, uint16_t col) { rect(x, y, w, 5, Cline); rect(x, y, rdiv(w * v, max), 5, col); }

/* ================================================================== state ================================== */
enum { P_PAT, P_INS, P_MAC, P_SEQ, P_GLO, P_FILE };
enum { MK_ARP, MK_VIB, MK_REG };
static UiSong *song;
static UiHost H;
static uint32_t now;
static uint8_t S[NSET];                  /* settings: option index of each SETDEF row */
static struct {
    int gpg, menu, mtab, mrow, dirty, ret, slot, fsel, nslot, fsave, owK; uint32_t owT;
    int nt, nw, nc, tk, ti; uint32_t tt; char nm[UI_NAME];
    int mi, mk, mt, ms, shp, pw, pi, ipg, op, flag;
    int page, ord, row, ch, field, oct, inst, rec, compact, scope, isel;
    int playing, prow, pord, loop, shift, used, counting;
    const char *msgp; char msg[64]; uint32_t msgT;
    int fxp, fxk;                        /* the effect picker open, its entry */
    int blk, r0, r1, c0, c1;             /* a block marked */
    int rs, rc, p4;
    int ask;                             /* (asks: ask* below) */
} st;
static uint8_t mute[20];
static float meter[20];
static uint32_t lastInput, helpT;
/* the start screen (about 1, 3 s, any input skips it) and HOME menu SYSTEM · INFO (about 2: page ap) */
static int about, ap, aboutUp = -1;
static uint32_t aboutT;
enum { AK_BTN, AK_KNOB, AK_KEY };
/* INFO: ap 0 = the about page, 1.. = the open-source text scrolled by lines (its top line + 1) */
static int aboutLast(void) { return 1 + (NLICS > LPP ? NLICS - LPP : 0); }
static void openInfo(void) { about = 2; ap = 0; }
static int aboutInput(int kind, int v, int d)   /* an input while either is up: 1 = taken */
{
    if (!about) return 0;
    if (about == 1) { about = 0; if (kind == AK_BTN) aboutUp = v; return 1; }
    if (kind == AK_KNOB) { if (v == UI_SEL || v == UI_PRE || v == UI_K1) ap = clamp(ap + d, 0, aboutLast()); return 1; }
    if (kind == AK_BTN) {
        aboutUp = v;
        if (v == UB_SEL || v == UB_OCTUP) ap = ap >= aboutLast() ? 0 : ap + 1;
        else if (v == UB_OCTDN) ap = ap > 0 ? ap - 1 : 0;
        else about = 0;
    }
    return 1;
}
static int helpPage = -1;
static const char *sv(int k) { return SETDEF[k].opt[S[k]]; }
static int sis(int k, const char *v) { return !strcmp(sv(k), v); }
static int keyShift;                     /* (the page's computer keyboard shift: none here) */

/* the ask box: title, up to 6 lines, the yes and no labels, what yes does */
static struct { char title[32], items[6][48], yes[24], no[24], noMsg[32]; int n; void (*ok)(void); } A;

#define SG (&song->e)
#define NORD (SG->norder)
#define NINS (SG->ninst)
#define ROWS (SG->rows)
#define INAME(k) (song->iname[(k) - 1])

static void flash(const char *m) { int n = (int)strlen(m); if (n > 63) n = 63; memcpy(st.msg, m, (size_t)n); st.msg[n] = 0; st.msgT = now; }
static void applySettings(void)
{
    int k, t = S[S_COLOR];
    for (k = 0; k < K_N; k++) K[k] = c565(THEME_RGB[t][k]);
    for (k = 0; k < 9; k++) FXC[k] = c565(FXCOL_RGB[t][k]);
    if (H.eq) H.eq(H.u, S[S_EQ]);
    if (H.tune) { const char *v = sv(S_TUNE); int n = 0, neg = *v == '-'; if (*v == '-' || *v == '+') v++; while (*v >= '0' && *v <= '9') n = n * 10 + *v++ - '0'; H.tune(H.u, neg ? -n : n); }
}

/* tracks: melodic ones plus, in percussion mode, tracks 16-20 = BD SD TT CY HH */
static int nmel(void) { int o2 = SG->opl == 2, pc = SG->perc; return o2 ? (pc ? 6 : 9) : (pc ? 15 : 18); }
static int ntracks(void) { return nmel() + (SG->perc ? 5 : 0); }
static int track(int i) { int m = nmel(); return i < m ? i : 15 + (i - m); }
static int tindex(int ch) { int i, n = ntracks(); for (i = 0; i < n; i++) if (track(i) == ch) return i; return -1; }
static int GW(void) { return st.compact || st.scope == 2 ? 9 : 3; }
static int Fn(void) { return st.compact ? 1 : 4; }
/* the groups: melodic tracks in GW()s, then the drums; G[] the tracks of the group of ch */
static int ngroups(void) { int m = nmel(), gw = GW(); return (m + gw - 1) / gw + (SG->perc ? 1 : 0); }
static int group(int g, int G[9])
{
    int m = nmel(), gw = GW(), ng = (m + gw - 1) / gw, n = 0, i;
    if (g >= ng) { for (i = 0; i < 5; i++) G[n++] = 15 + i; return n; }
    for (i = g * gw; i < m && i < g * gw + gw; i++) G[n++] = i;
    return n;
}
static int groupOf(int ch) { int g, G[9], n, j, ng = ngroups(); for (g = 0; g < ng; g++) { n = group(g, G); for (j = 0; j < n; j++) if (G[j] == ch) return g; } return -1; }
static int curGroup(int G[9]) { int g = groupOf(st.ch); return group(g < 0 ? 0 : g, G); }
static int isDrum(int ch) { return SG->perc && ch >= 15; }
static int pairOf(int ch) { int p; for (p = 0; p < 6; p++) if (HI4[p] == ch) return SG->opl != 2 && (SG->four >> p & 1) ? p : -1; return -1; }
static int isLo4(int ch) { return ch > 0 && pairOf(ch - 1) >= 0; }
static void fixCh(void) { if (tindex(st.ch) < 0) st.ch = track(0); }
static void stepCh(int d) { int n = ntracks(), i = imax(0, tindex(st.ch)); st.ch = track(mod(i + d, n)); }
static const char *noteName(int n)
{
    if (n == -2) return "===";
    if (n < 0) return "---";
    return F("%s%d", NN[n % 12], n / 12 - 1);
}
static int orderPos(int k)
{
    int g;
    for (g = 0; g < 128 && song->order[k] >= 0x80; g++) k = imin(song->order[k] - 0x80, NORD - 1);
    return song->order[k] >= 0x80 ? 0 : k;
}
static int curPat(void) { return song->order[orderPos(st.ord)]; }
static void getc_(int r, int ch, EngCell *c) { us_get(song, curPat(), r, ch, c); }
static void cellGet(EngCell *c) { getc_(st.row, st.ch, c); }
static void putc_(int pat, int r, int ch, const EngCell *c) { if (us_put(song, pat, r, ch, c)) flash("MEMORY FULL"); }
static void cellPut(const EngCell *c) { putc_(curPat(), st.row, st.ch, c); }
static void changed(void) { st.dirty = 1; }
static void snap(void) {}                /* (no undo on the device yet) */

/* ================================================================== effects ================================ */
static int fxEntry(int f, int v)
{
    int k;
    if (f < 0) return 0;
    for (k = 0; k < NFXL; k++) if (FXL[k].f == f && FXL[k].hi >= 0 && FXL[k].lo >= 0 && v == (FXL[k].hi << 4 | FXL[k].lo)) return k;
    for (k = 0; k < NFXL; k++) if (FXL[k].f == f && FXL[k].hi >= 0 && FXL[k].lo < 0 && v >> 4 == FXL[k].hi) return k;
    for (k = 0; k < NFXL; k++) if (FXL[k].f == f && FXL[k].hi < 0) return k;
    return -1;
}
static int fxMax(int f) { return f == 12 || f == 9 || f == 18 || f == 40 || f == 37 ? 63 : 255; }
static const char *fxShort(int f, int v) { int k = fxEntry(f, v); return k < 0 ? "?" : FXL[k].sh; }
static const char *fxCode(const UiFx *x)
{
    if (x->f < 0) return "---";
    return F("%c%s", FXD[x->f], x->hi < 0 ? "XX" : F("%X%s", x->hi, x->lo < 0 ? "Y" : hex(x->lo, 1)));
}
static void fxApply(EngCell *c, int i, const UiFx *x)
{
    c->fx[i] = x->f;
    if (x->f < 0) c->v[i] = 0;
    else if (x->hi >= 0) c->v[i] = (uint8_t)(x->hi << 4 | (x->lo >= 0 ? x->lo : c->v[i] & 15));
    else if (x->f == 12 && !c->v[i]) c->v[i] = 63;
    else c->v[i] = (uint8_t)imin(c->v[i], fxMax(x->f));
}
static const char *fxStr(int f, int v) { return f < 0 ? "---" : F("%c%s", FXD[f], hex(v, 2)); }
static int fxi(int fld) { return fld == 3 ? 1 : 0; }   /* (the cell's effect slot) */
static uint16_t fxCol(int f, int v) { int k; if (f < 0) return Cdim; k = fxEntry(f, v); return k < 0 ? Cgrey : FXC[FXL[k].cat]; }

/* ================================================================== editing ================================ */
static void stop(void);
static void move(int dr) { st.row = sis(S_WRAP, "ON") ? mod(st.row + dr, ROWS) : clamp(st.row + dr, 0, ROWS - 1); }
static int stepv(void) { const char *v = sv(S_STEP); int n = 0; while (*v) n = n * 10 + *v++ - '0'; return n; }
static uint32_t prevOff;                 /* preview's key-off: when (0 none), on which track */
static int prevCh;
static void preview(void)
{
    EngCell c;
    if (!sis(S_PREV, "ON") || st.playing) return;
    cellGet(&c);
    if (c.note < 0) return;
    if (H.on) H.on(H.u, st.ch, c.ins ? c.ins : st.inst, c.note, 0);
    prevCh = st.ch; prevOff = now + 180; if (!prevOff) prevOff = 1;
}
static void moveField(int d)
{
    int f = Fn(), n = ntracks(), i = clamp(imax(0, tindex(st.ch)) * f + st.field + d, 0, n * f - 1);
    st.ch = track(i / f); st.field = i % f;
}
static int isPart(int k) { return k > 1 && k - 2 < NINS && song->inst[k - 2].four; }
static int insStep(int n, int d)
{
    int L = NINS, k = clamp(n + d, 1, L);
    while (isPart(k) && k > 1 && k < L) k += d >= 0 ? 1 : -1;
    if (isPart(k)) k--;
    return clamp(k, 1, L);
}
static void remapIns(int (*f)(int))
{
    int p, r, t;
    for (p = 0; p < SM_PATS; p++) {
        if (!sm_has(&song->a, p)) continue;
        for (r = 0; r < ROWS; r++) {
            EngCell row[ENG_TRACKS];
            int ch = 0;
            sm_row(&song->a, p, r, row);
            for (t = 0; t < ENG_TRACKS; t++) if (row[t].ins) { int v = f(row[t].ins); if (v != row[t].ins) { row[t].ins = (uint8_t)v; ch = 1; } }
            if (ch) sm_set_row(&song->a, p, r, row);
        }
    }
    st.inst = f(st.inst); if (!st.inst) st.inst = 1;
    st.mi = f(st.mi); if (!st.mi) st.mi = 1;
}

/* blocks */
static int blockRect(int *r0, int *r1, int *i0, int *i1)
{
    if (!st.blk) return 0;
    *i0 = imin(st.c0, st.c1); *i1 = imax(st.c0, st.c1);
    *r0 = imin(st.r0, st.r1); *r1 = imax(st.r0, st.r1);
    return 1;
}
static int inBlock(int r, int ch)
{
    int r0, r1, i0, i1, i = tindex(ch);
    return blockRect(&r0, &r1, &i0, &i1) && r >= r0 && r <= r1 && i >= i0 && i <= i1;
}
static void blockStart(void) { if (!st.blk) { int i = tindex(st.ch); st.blk = 1; st.r0 = st.r1 = st.row; st.c0 = st.c1 = i; } }
static void blockRows(int d) { blockStart(); st.r1 = clamp(st.r1 + d, 0, ROWS - 1); st.row = st.r1; }
static void blockCols(int d) { blockStart(); st.c1 = clamp(st.c1 + d, 0, ntracks() - 1); st.ch = track(st.c1); }
/* the clipboard: a block, or the whole pattern */
#define CLIP_CELLS 512
static EngCell clipc[CLIP_CELLS];
static int clipR, clipC, clipPat = -1, clipOn;
static void blockCopy(void)
{
    int r0, r1, i0, i1, r, i;
    if (!blockRect(&r0, &r1, &i0, &i1)) { clipPat = curPat(); clipOn = 1; flash("COPIED PATTERN"); return; }
    if ((r1 - r0 + 1) * (i1 - i0 + 1) > CLIP_CELLS) { flash("BLOCK TOO BIG"); return; }
    clipPat = -1; clipOn = 1; clipR = r1 - r0 + 1; clipC = i1 - i0 + 1;
    for (r = r0; r <= r1; r++) for (i = i0; i <= i1; i++) getc_(r, track(i), &clipc[(r - r0) * clipC + i - i0]);
    flash(F("COPIED %d×%d", clipR, clipC));
}
static void blockPaste(void)
{
    int i0, k, j, p = curPat();
    if (!clipOn) { flash("NOTHING COPIED"); return; }
    snap();
    if (clipPat >= 0) {                  /* (JS keeps the pattern's copy; here its number: a copy of it now) */
        int r, t;
        if (clipPat != p) for (r = 0; r < ROWS; r++) { EngCell row[ENG_TRACKS]; for (t = 0; t < ENG_TRACKS; t++) us_get(song, clipPat, r, t, &row[t]); if (sm_set_row(&song->a, p, r, row)) { flash("MEMORY FULL"); return; } }
        changed(); flash("PASTED PATTERN"); return;
    }
    i0 = tindex(st.ch);
    for (k = 0; k < clipR; k++) {
        int r = st.row + k;
        if (r >= ROWS) break;
        for (j = 0; j < clipC; j++) if (i0 + j < ntracks()) putc_(p, r, track(i0 + j), &clipc[k * clipC + j]);
    }
    changed(); flash(F("PASTED %d×%d", clipR, clipC));
}
/* f on each cell of the block (changed ones written back): the count f returns */
static int blockEach(int (*f)(EngCell *, int), int a)
{
    int r0, r1, i0, i1, r, i, n = 0, p = curPat();
    if (!blockRect(&r0, &r1, &i0, &i1)) return 0;
    for (r = r0; r <= r1; r++) for (i = i0; i <= i1; i++) { EngCell c; getc_(r, track(i), &c); if (f(&c, a)) { n++; putc_(p, r, track(i), &c); } }
    return n;
}
static int bClear(EngCell *c, int a) { (void)a; if (us_empty(c)) return 0; *c = US_EMPTY; return 1; }
static int bTrans(EngCell *c, int d) { if (c->note < 0) return 0; c->note = (int8_t)clamp(c->note + d, 12, 107); return 1; }
static int bIns(EngCell *c, int v) { if (c->note < 0) return 0; c->ins = (uint8_t)v; return 1; }
static void blockClear(void) { snap(); blockEach(bClear, 0); changed(); flash("BLOCK CLEARED"); }
static void blockTrans(int d) { int n; snap(); n = blockEach(bTrans, d); changed(); flash(F("%s%d · %d NOTES", d > 0 ? "+" : "", d, n)); }
static void blockIns(int d) { int v = insStep(st.inst, d), n; snap(); n = blockEach(bIns, v); st.inst = v; changed(); flash(F("%d NOTES → %s %s", n, hex(v, 2), INAME(v))); }

static void presetTurn(int d, int all)
{
    EngCell c;
    if (st.blk) { blockIns(d); return; }
    cellGet(&c); st.field = 1;
    if (all) {
        int v = clamp((c.ins ? c.ins : st.inst) + d, 1, NINS), k = 0, r, p = curPat();
        snap();
        for (r = 0; r < ROWS; r++) { EngCell x; getc_(r, st.ch, &x); if (x.note >= 0) { x.ins = (uint8_t)v; putc_(p, r, st.ch, &x); k++; } }
        st.inst = v; changed(); flash(F("CH%s %d -> %s %s", hex(st.ch + 1, 2), k, hex(v, 2), INAME(v))); return;
    }
    if (c.note >= 0 || c.ins > 0) { snap(); c.ins = (uint8_t)insStep(c.ins ? c.ins : st.inst, d); st.inst = c.ins; cellPut(&c); changed(); }
    else st.inst = insStep(st.inst, d);
    flash(F("%s %s", hex(st.inst, 2), INAME(st.inst)));
}
static void deleteNote(int all)
{
    EngCell c;
    snap(); cellGet(&c);
    if (all) { c = US_EMPTY; flash("CELL CLEARED"); }
    else if (st.field >= 2) { int i = fxi(st.field); c.fx[i] = -1; c.v[i] = 0; flash(F("FX%d CLEARED", st.field - 1)); }
    else { c.note = -1; c.ins = 0; flash("NOTE DELETED"); }
    cellPut(&c); changed(); if (st.rec) move(stepv());
}
static void fxValue(int fld, int d)
{
    EngCell c;
    int i = fxi(fld);
    snap(); cellGet(&c);
    st.scope = 0; if (st.compact) st.compact = 0;
    st.field = fld;
    if (c.fx[i] < 0) { c.fx[i] = 12; c.v[i] = d < 0 ? 62 : 63; flash(F("FX%d C SET VOLUME", fld - 1)); }
    else c.v[i] = (uint8_t)clamp(c.v[i] + d, 0, fxMax(c.fx[i]));
    cellPut(&c); changed();
}
static void fxType(int d, int cat)
{
    EngCell c;
    int i, k;
    snap(); cellGet(&c);
    st.scope = 0; if (st.compact) st.compact = 0;
    if (st.field < 2) st.field = 2;
    i = fxi(st.field);
    k = imax(0, fxEntry(c.fx[i], c.v[i]));
    if (cat) { int cc = FXL[k].cat, nc = mod(cc + d, NFXCATS); for (k = 0; k < NFXL && FXL[k].cat != nc; k++) {} if (k == NFXL) k = -1; }
    else k = mod(k + d, NFXL);
    if (k < 0) k = NFXL - 1;            /* (findIndex -1: FXL[-1] is undefined in JS; never with these tables) */
    fxApply(&c, i, &FXL[k]); flash(F("FX%d %s %s", st.field - 1, fxCode(&FXL[k]), FXL[k].name)); cellPut(&c); changed();
}
static void openFxPicker(void)
{
    EngCell c;
    if (st.page != P_PAT) st.page = P_PAT;
    st.scope = 0; if (st.compact) st.compact = 0;
    if (st.field < 2) st.field = 2;
    cellGet(&c);
    st.fxp = 1; st.fxk = imax(0, fxEntry(c.fx[fxi(st.field)], c.v[fxi(st.field)]));
}
static void fxpMove(int d, int cat)
{
    if (cat) { int cc = imax(0, FXL[st.fxk].cat), nc = mod(cc + d, NFXCATS), k; for (k = 0; k < NFXL && FXL[k].cat != nc; k++) {} st.fxk = k; }
    else st.fxk = clamp(st.fxk + d, 0, NFXL - 1);
}
static void fxpPick(void)
{
    EngCell c;
    const UiFx *x = &FXL[st.fxk];
    snap(); cellGet(&c); fxApply(&c, fxi(st.field), x); st.fxp = 0; cellPut(&c); changed();
    flash(F("FX%d %s", st.field - 1, fxCode(x)));
}
static void fxpCancel(void) { st.fxp = 0; flash("CANCELLED"); }
/* a key on the pattern page sets the cursor's note; with REC it moves on by STEP */
static void enterNote(int n, int adv)
{
    EngCell c;
    const EngIns *I = st.inst >= 1 && st.inst <= NINS ? &song->inst[st.inst - 1] : 0;
    snap(); cellGet(&c);
    c.note = (int8_t)n;
    if (n >= 0) c.ins = (uint8_t)st.inst;
    cellPut(&c);
    if (n >= 0 && I && I->four) {
        int p, k = -1;
        for (p = 0; p < 6; p++) if (HI4[p] == st.ch) k = p;
        if (SG->opl == 2) flash("4OP NEEDS OPL3: PLAYS AS 2-OP");
        else if (k < 0) flash("4OP: USE CH 01 03 05 10 12 14");
        else {
            EngCell lo;
            if (!(SG->four >> k & 1)) { SG->four |= (uint8_t)(1 << k); flash(F("4OP PAIR %d+%d ON", st.ch + 1, st.ch + 2)); }
            getc_(st.row, st.ch + 1, &lo); lo.ins = (uint8_t)(st.inst + 1); putc_(curPat(), st.row, st.ch + 1, &lo);
        }
    }
    changed(); if (adv) move(stepv());
}

/* instruments: 4-op halves, connections */
typedef struct { EngIns *h; int j; } Half;
static Half halfOf(void)
{
    Half r;
    EngIns *N = &song->inst[st.isel - 1];
    if (N->four && st.isel < NINS) { if (st.op < 2) { r.h = &song->inst[st.isel]; r.j = st.op; } else { r.h = N; r.j = st.op - 2; } return r; }
    r.h = N; r.j = imin(st.op, 1);
    return r;
}
static int insIx(const EngIns *N) { return (int)(N - song->inst); }
static int connOf(const EngIns *N) { return (N->con << 1) | song->inst[insIx(N) + 1].con; }
static int isCar(const EngIns *N, int g)
{
    static const uint8_t C4[4][3] = {{3, 9, 9}, {0, 3, 9}, {1, 3, 9}, {0, 2, 3}};
    int k;
    if (!N->four) return g == 1 || !!N->con;
    for (k = 0; k < 3; k++) if (C4[connOf(N)][k] == g) return 1;
    return 0;
}
static int algOf(const EngIns *N)
{
    int k;
    if (N->four && insIx(N) + 1 < NINS) { int c = connOf(N); for (k = 0; k < 4; k++) if (A4[k] == c) return 2 + k; return 1; }
    return N->con;
}
static int rk; static int rmAdd(int v) { return v > rk ? v + 1 : v; }
static int rmDel(int v) { return v == rk + 1 ? 0 : v > rk + 1 ? v - 1 : v; }
static void setAlg(int a)
{
    int k = st.isel;
    EngIns *N = &song->inst[k - 1];
    if (a >= 2 && SG->opl == 2) { flash("4OP NEEDS OPL3"); return; }
    if (a >= 2 && !N->four) {
        EngIns P;
        char nm[UI_NAME];
        if (NINS >= 255) { flash("NO ROOM FOR 4OP"); return; }
        P = *N; P.four = 0; P.fmm = 0;
        { const char *b = slice(cut(INAME(k), 54), 8); int n = (int)strlen(b); memcpy(nm, b, (size_t)n); memcpy(nm + n, " B", 3); }
        rk = k; remapIns(rmAdd);
        if (us_ins_insert(song, k + 1, &P, nm)) { flash("MEMORY FULL"); return; }
        N = &song->inst[k - 1]; N->four = 1;
    }
    if (a < 2 && N->four) { rk = k; remapIns(rmDel); us_ins_delete(song, k + 1); N = &song->inst[k - 1]; N->four = 0; st.op = imin(st.op, 1); }
    if (a >= 2) { int c = A4[a - 2]; N->con = (uint8_t)(c >> 1); song->inst[k].con = (uint8_t)(c & 1); } else N->con = (uint8_t)a;
    changed(); flash(F("ALG %s", ALGN[a]));
}

/* macro tables */
static EngTab *mtab(void) { return st.mk == MK_ARP ? &SG->arp[st.mt - 1] : &SG->vib[st.mt - 1]; }
static char *mtname(void) { return song->tname[st.mk == MK_ARP ? 0 : 1][st.mt - 1]; }
static void setName(char *d, const char *s) { int n = (int)strlen(s); if (n > UI_NAME - 1) n = UI_NAME - 1; memcpy(d, s, (size_t)n); d[n] = 0; }
static void shapeTable(int A, int k, EngTab *t, char *name)
{
    int i;
    memset(t, 0, sizeof *t); t->len = 1; t->spd = 1; t->loop = -1;
    if (A) { for (i = 0; i < ARP_SHAPES[k].n; i++) t->data[i] = ARP_SHAPES[k].v[i]; t->len = ARP_SHAPES[k].n; setName(name, ARP_SHAPES[k].name); t->loop = (int8_t)(k == 10 ? -1 : 0); }
    else { for (i = 0; i < VIB_SHAPES[k].n; i++) t->data[i] = VIB_SHAPES[k].v[i]; t->len = VIB_SHAPES[k].n; setName(name, VIB_SHAPES[k].name); t->loop = 0; t->delay = VIB_SHAPES[k].delay; }
}

/* FM register macros */
static EngIns *regIns(void) { return &song->inst[st.mi - 1]; }
static int regGet(const EngFmStep *s, int k)
{
    const uint8_t *D = s->d;
    int j = k >= 12 && k < 24 ? 1 : 0, q = k % 12;
    if (k < 24) {
        int a = D[j], kv = D[2 + j], ad = D[4 + j], sr = D[6 + j];
        switch (q) {
        case 0: return ad >> 4; case 1: return ad & 15; case 2: return sr >> 4; case 3: return sr & 15; case 4: return D[8 + j] & 7;
        case 5: return 63 - (kv & 63); case 6: return kv >> 6; case 7: return a & 15; case 8: return a >> 7; case 9: return a >> 6 & 1;
        case 10: return a >> 4 & 1; default: return a >> 5 & 1;
        }
    }
    return k == 24 ? D[10] & 1 : k == 25 ? D[10] >> 1 & 7 : k == 26 ? s->fs : k == 27 ? s->pan : D[10] & 0x80 ? 1 : D[10] & 0x40 ? 2 : D[10] & 0x20 ? 3 : 0;
}
static void regSet(EngFmStep *s, int k, int v)
{
    uint8_t *D = s->d;
    int j = k >= 12 && k < 24 ? 1 : 0, q = k % 12;
#define SET(i, sh, m) (D[i] = (uint8_t)((D[i] & ~((m) << (sh))) | ((v & (m)) << (sh))))
    if (k < 24) switch (q) {
        case 0: SET(4 + j, 4, 15); break; case 1: SET(4 + j, 0, 15); break; case 2: SET(6 + j, 4, 15); break;
        case 3: SET(6 + j, 0, 15); break; case 4: SET(8 + j, 0, 7); break; case 5: D[2 + j] = (uint8_t)((D[2 + j] & 0xC0) | (63 - v)); break;
        case 6: SET(2 + j, 6, 3); break; case 7: SET(j, 0, 15); break; case 8: SET(j, 7, 1); break; case 9: SET(j, 6, 1); break;
        case 10: SET(j, 4, 1); break; default: SET(j, 5, 1); break;
        }
    else if (k == 24) SET(10, 0, 1); else if (k == 25) SET(10, 1, 7); else if (k == 26) s->fs = (int16_t)v; else if (k == 27) s->pan = (uint8_t)v;
    else { static const uint8_t T4[4] = {0, 0x80, 0x40, 0x20}; D[10] = (uint8_t)((D[10] & 0x1F) | T4[v]); }
#undef SET
}
static void insBytes(const EngIns *ins, uint8_t d[11])
{
    const EngOp *m = &ins->op[0], *c = &ins->op[1];
#define R20(p) (uint8_t)((p)->am << 7 | (p)->vib << 6 | (p)->egt << 5 | (p)->ksr << 4 | (p)->mult)
    d[0] = R20(m); d[1] = R20(c); d[2] = (uint8_t)(m->ksl << 6 | m->tl); d[3] = (uint8_t)(c->ksl << 6 | c->tl);
    d[4] = (uint8_t)(m->ar << 4 | m->dr); d[5] = (uint8_t)(c->ar << 4 | c->dr); d[6] = (uint8_t)(m->sl << 4 | m->rr);
    d[7] = (uint8_t)(c->sl << 4 | c->rr); d[8] = m->ws; d[9] = c->ws; d[10] = (uint8_t)(ins->fb << 1 | ins->con);
#undef R20
}
/* JS keeps steps past len (M.steps.length >= len); here only len of them: nst[] remembers the extra */
static EngFmStep *regStep(EngFmm *M, int i)
{
    if (M->len <= i) {
        static EngFmStep T[256];
        int n = M->len, j;
        if (n) memcpy(T, M->steps, (size_t)n * sizeof *T);
        for (j = n; j <= i; j++) { memset(&T[j], 0, sizeof T[j]); insBytes(regIns(), T[j].d); T[j].dur = 1; }
        if (us_fmm_set(song, st.mi, T, i + 1)) { flash("MEMORY FULL"); return 0; }
        M = us_fmm(song, st.mi, 0);
    }
    return (EngFmStep *)(uintptr_t)&M->steps[i];
}
static void knob(int i, int d);
static void regKnob(int i, int d, int sh)
{
    EngFmm *M = us_fmm(song, st.mi, 1);
    if (i == 0) { st.rs = clamp(st.rs + d, 0, 254); return; }
    if (i == 1) {
        if (sh) { if (st.rc < 28) { snap(); M->dis[st.rc] = !M->dis[st.rc]; changed(); flash(F("%s%s", REGN[st.rc], M->dis[st.rc] ? " OFF" : " ON")); } return; }
        st.rc = clamp(st.rc + d, 0, 28); return;
    }
    if (i == UI_PRE) { st.mi = clamp(st.mi + d, 1, NINS); st.rs = 0; flash(F("INS %s %s", hex(st.mi, 2), INAME(st.mi))); return; }
    if (i == UI_MST) { knob(UI_MST, d); return; }
    snap();
    if (i == 2) {
        EngFmStep *s = regStep(M, st.rs);
        int k = st.rc, mx = REGMX[k], v;
        if (!s) return;
        v = regGet(s, k) + d * (sh ? (k == 26 ? 16 : 4) : 1);
        regSet(s, k, k == 26 ? clamp(v, -255, 255) : clamp(v, 0, mx));
    } else if (i == 3) {
        if (sh) M->ko = (uint8_t)clamp(M->ko + d, 0, M->len);
        else { EngFmStep *s = regStep(M, st.rs); if (s) s->dur = (uint8_t)clamp(s->dur + d, 0, 255); }
    } else if (i == UI_SEL) {
        int n = clamp(M->len + d, 0, 255);
        if (n > M->len) regStep(M, n - 1);
        else if (n < M->len) us_fmm_set(song, st.mi, M->steps, n);
        M = us_fmm(song, st.mi, 0);
        if (M->lb > M->len) M->lb = 0;
        if (M->ko > M->len) M->ko = 0;
        st.rs = imin(st.rs, imax(0, M->len - 1));
    } else if (i == UI_ALG) {
        if (sh) M->ll = (uint8_t)clamp(M->ll + d, 0, imax(0, M->len - M->lb + 1));
        else { M->lb = (uint8_t)clamp(M->lb + d, 0, M->len); if (!M->ll && M->lb) M->ll = 1; }
    }
    changed();
}

/* ================================================================== play ================================== */
/* COUNT-IN: recording starts after 1 or 2 bars of clicks (a beat = 4 rows), as the page's timers: beat k at k beats */
static struct { int n, k, loop; uint32_t t0; } cnt;
static uint32_t beatMs(void) { return (uint32_t)(SG->speed * 10000 / (SG->bpm ? SG->bpm : 125)); }
static void play(int loop)
{
    int bars = S[S_COUNT];
    if (st.rec && bars) { cnt.n = bars * 4; cnt.k = 0; cnt.loop = loop; cnt.t0 = now; st.counting = cnt.n; return; }
    st.playing = 1; st.loop = loop;
    if (H.play) H.play(H.u, st.ord, 0, loop);
}
static void counting(void)               /* (the clock: ui_time) */
{
    uint32_t b = beatMs();
    if (!st.counting) return;
    while (cnt.k < cnt.n && now - cnt.t0 >= (uint32_t)cnt.k * b) {
        if (H.blip) H.blip(H.u, cnt.k % 4 == 0, S[S_CLVL]);
        st.counting = cnt.n - cnt.k; flash(F("COUNT %d", cnt.n - cnt.k)); cnt.k++;
    }
    if (now - cnt.t0 >= (uint32_t)cnt.n * b) {
        st.counting = 0; st.playing = 1; st.loop = cnt.loop;
        if (H.play) H.play(H.u, st.ord, 0, cnt.loop);
    }
}
static void stop(void)
{
    st.counting = 0; st.playing = 0; st.prow = -1;
    if (H.stop) H.stop(H.u);
}
static void toggle(int loop) { if (st.playing || st.counting) stop(); else play(loop); }

/* ================================================================== names ================================== */
static void savePreset(void);
static void prefsChanged(void);
static void saveSlot(int k);
static void renameDone(int k, const char *nm);
static void fileDone(void);
static int nmlen(void) { return (int)strlen(st.nm); }
static void openName(int target)
{
    const char *s = target == 1 ? song->name : INAME(st.isel);
    st.nt = target; st.nw = 1;
    setName(st.nm, slice(s, 11)); st.nc = nmlen(); st.tk = -1;
}
static void commitName(void)
{
    char nm[UI_NAME];
    int a = 0, b = nmlen();
    while (a < b && st.nm[a] == ' ') a++;
    while (b > a && st.nm[b - 1] == ' ') b--;
    memcpy(nm, st.nm + a, (size_t)(b - a)); nm[b - a] = 0;
    if (!nm[0]) setName(nm, "NONAME");
    snap(); st.nw = 0;
    if (st.nt == 2) { renameDone(st.nslot, nm); return; }
    if (st.nt == 1) { setName(song->name, nm); changed(); saveSlot(st.nslot); fileDone(); return; }
    setName(INAME(st.isel), nm); changed(); savePreset();
}
static int nameIns(char ch)
{
    int n = nmlen();
    if (n >= 11) { flash("MAX 11 CHARS"); return 0; }
    memmove(st.nm + st.nc + 1, st.nm + st.nc, (size_t)(n - st.nc + 1));
    st.nm[st.nc++] = ch;
    return 1;
}
static const char *kch(int o)            /* the letters of key o (KCH) */
{
    static const uint8_t WH[16] = {0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24, 26}, BL[11] = {1, 3, 5, 8, 10, 13, 15, 17, 20, 22, 25};
    int i;
    for (i = 0; i < 16; i++) if (WH[i] == o) return i < (int)(sizeof WCH / sizeof *WCH) ? WCH[i] : "";
    for (i = 0; i < 11; i++) if (BL[i] == o) return i < (int)(sizeof BCH / sizeof *BCH) ? BCH[i] : "";
    return "";
}
static void nameKey(int o)
{
    const char *g = kch(o);
    int n = (int)strlen(g);
    if (!n) return;
    if (st.tk == o && now - st.tt < 1000 && st.nc > 0) { st.ti = (st.ti + 1) % n; st.nm[st.nc - 1] = g[st.ti]; }
    else { st.ti = 0; if (!nameIns(g[0])) return; }
    st.tk = o; st.tt = now;
}
static void nameBack(int all)
{
    if (all) { st.nm[0] = 0; st.nc = 0; }
    else if (st.nc > 0) { memmove(st.nm + st.nc - 1, st.nm + st.nc, (size_t)(nmlen() - st.nc + 1)); st.nc--; }
    st.tk = -1;
}

/* ================================================================== GLOBAL ================================== */
static void ask(const char *title, const char *yes, const char *no, void (*ok)(void), const char *noMsg)
{
    setName(A.title, ""); { int n = (int)strlen(title); if (n > 31) n = 31; memcpy(A.title, title, (size_t)n); A.title[n] = 0; }
    { int n = (int)strlen(yes); if (n > 23) n = 23; memcpy(A.yes, yes, (size_t)n); A.yes[n] = 0; }
    { int n = (int)strlen(no); if (n > 23) n = 23; memcpy(A.no, no, (size_t)n); A.no[n] = 0; }
    { int n = (int)strlen(noMsg); if (n > 31) n = 31; memcpy(A.noMsg, noMsg, (size_t)n); A.noMsg[n] = 0; }
    A.ok = ok; st.ask = 1;
}
static void askItem(const char *s) { if (A.n < 6) { int n = (int)strlen(s); if (n > 47) n = 47; memcpy(A.items[A.n], s, (size_t)n); A.items[A.n][n] = 0; A.n++; } }
static void askAnswer(int y) { st.ask = 0; if (y) { snap(); A.ok(); } else flash(A.noMsg); }
static void setRows(int n, int force)
{
    if (n == ROWS) return;
    if (n < ROWS && !force) {
        int p, r, t, used = 0;
        for (p = 0; p < SM_PATS && !used; p++) if (sm_has(&song->a, p)) for (r = n; r < ROWS && !used; r++) for (t = 0; t < ENG_TRACKS; t++) { EngCell c; us_get(song, p, r, t, &c); if (c.note != -1 || c.fx[0] >= 0 || c.fx[1] >= 0) { used = 1; break; } }
        if (used) { flash(F("NOTES BELOW ROW %s: HOME+TURN CUTS", hex(n, 2))); return; }
    }
    snap();
    if (us_rows(song, n)) { flash("MEMORY FULL"); return; }
    st.row = imin(st.row, n - 1); changed(); flash(F("ROWS %d", n));
}
static int hiNotes(void)                 /* notes on tracks 10-18 */
{
    int p, r, t;
    for (p = 0; p < SM_PATS; p++) if (sm_has(&song->a, p)) for (r = 0; r < ROWS; r++) for (t = 9; t < ENG_TRACKS; t++) { EngCell c; us_get(song, p, r, t, &c); if (c.note >= 0) return 1; }
    return 0;
}
static void opl2Issues(void)
{
    int p, r, t, notes = 0, fx = 0, wfx = 0, pfx = 0, k, w = 0, pn = 0;
    A.n = 0;
    for (p = 0; p < SM_PATS; p++) if (sm_has(&song->a, p)) for (r = 0; r < ROWS; r++) for (t = 0; t < ENG_TRACKS; t++) {
        EngCell c;
        int e;
        us_get(song, p, r, t, &c);
        if (t >= 9) { if (c.note != -1) notes++; if (c.fx[0] >= 0 || c.fx[1] >= 0) fx++; }
        for (e = 0; e < 2; e++) { int f = c.fx[e], v = c.v[e]; if (f == 19 && ((v >> 4) > 3 || (v & 15) > 3)) wfx++; if (f == 35 && (v >> 4) == 11 && (v & 15) != 0) pfx++; }
    }
    if (notes || fx) askItem(F("CH10–18: %s%s%s MUTED", notes ? F("%d NOTES", notes) : "", notes && fx ? " · " : "", fx ? F("%d FX", fx) : ""));
    for (k = 0; k < NINS; k++) if (song->inst[k].op[0].ws > 3 || song->inst[k].op[1].ws > 3) w++;
    if (w) askItem(F("%d INSTR USE WAVES 4–7 → 0–3", w));
    if (wfx) askItem(F("%d J WAVE FX ABOVE 3 → 0–3", wfx));
    for (k = 0; k < NINS; k++) if (song->inst[k].pan != 1) pn++;
    if (pn) askItem(F("%d INSTR PANNED L/R → MONO", pn));
    if (pfx) askItem(F("%d Z B PANNING FX IGNORED", pfx));
}
static void toOpl2(void)
{
    int c;
    SG->opl = 2; st.ch = imin(st.ch, 8);
    for (c = 9; c < 18; c++) mute[c] = 0;
    changed(); flash("OPL2 · 9 CHANNELS");
}
static void percIssues(int on)
{
    int p, r, t, n = 0, m = 0;
    A.n = 0;
    if (!on) return;
    for (p = 0; p < SM_PATS; p++) if (sm_has(&song->a, p)) for (r = 0; r < ROWS; r++) for (t = 15; t < 18; t++) { EngCell c; us_get(song, p, r, t, &c); if (c.note != -1) n++; }
    if (n) askItem(F("CH16–18: %d NOTES PLAY AS BD SD TT", n));
    if (SG->opl == 2) {
        for (p = 0; p < SM_PATS; p++) if (sm_has(&song->a, p)) for (r = 0; r < ROWS; r++) for (t = 6; t < 9; t++) { EngCell c; us_get(song, p, r, t, &c); if (c.note != -1) m++; }
        if (m) askItem(F("CH07–09: %d NOTES SILENT IN OPL2", m));
    }
}
static int pairIssues(int pp)
{
    int lo = HI4[pp] + 1, p, r, n = 0;
    A.n = 0;
    for (p = 0; p < SM_PATS; p++) if (sm_has(&song->a, p)) for (r = 0; r < ROWS; r++) { EngCell c; us_get(song, p, r, lo, &c); if (c.note >= 0) n++; }
    if (n) askItem(F("CH%s: %d NOTES WILL BE SILENT", dec2(lo + 1), n));
    return A.n;
}
static int pendOn, pendP;
static void setPerc(void)
{
    int on = pendOn;
    SG->perc = (uint8_t)on;
    if (!on && st.ch >= 18) st.ch = 0;
    changed(); flash(on ? "PERCUSSION ON · BD SD TT CY HH" : "PERCUSSION OFF");
}
static void setPair(void)
{
    int p = pendP, on = pendOn;
    SG->four = (uint8_t)(on ? SG->four | 1 << p : SG->four & ~(1 << p));
    changed(); flash(F("4OP %d-%d%s", HI4[p] + 1, HI4[p] + 2, on ? " ON" : " OFF"));
}
static void gloKnob(int i, int d, int sh)
{
    if (st.ask) return;
    if (i == UI_SEL || i == UI_PRE) { st.gpg = mod(st.gpg + d, 3); return; }
    if (i == UI_MST) { knob(UI_MST, d); return; }
    snap();
    if (st.gpg == 0) {
        if (i == 0) SG->bpm = (uint8_t)clamp(SG->bpm + d * (sh ? 10 : 1), 32, 255);
        else if (i == 1) SG->speed = (uint8_t)clamp(SG->speed + d, 1, 31);
        else if (i == 2) {
            int k, j = 3;
            for (k = 0; k < 8; k++) if (ROWOPT[k] == ROWS) j = k;
            k = clamp(j == 3 && ROWOPT[3] != ROWS ? 3 : j + d, 0, 7);
            setRows(ROWOPT[k], sh); return;
        } else SG->gvol = (uint8_t)clamp(SG->gvol + d * (sh ? 8 : 1), 0, 63);
    } else if (st.gpg == 1) {
        if (i == 0) {
            if (d > 0) { SG->opl = 3; flash("OPL3 · 18 CHANNELS"); }
            else if (SG->opl != 2) { opl2Issues(); if (A.n) { ask("SWITCH TO OPL2?", "OK, USE OPL2", "KEEP OPL3", toOpl2, "KEPT OPL3"); return; } toOpl2(); }
        } else if (i == 1) SG->lfo = (uint8_t)((SG->lfo & 1) | (d > 0 ? 2 : 0));
        else if (i == 2) SG->lfo = (uint8_t)((SG->lfo & 2) | (d > 0 ? 1 : 0));
        else SG->vtab = (uint8_t)clamp(SG->vtab + d * (sh ? 16 : 1), 0, 255);
    } else {
        if (i == 0) {
            int on = d > 0;
            if (on == !!SG->perc) return;
            percIssues(on); pendOn = on;
            if (A.n) { ask("PERCUSSION ON?", "OK, DRUMS ON", "KEEP IT OFF", setPerc, "PERCUSSION OFF"); return; }
            setPerc(); return;
        }
        if (i == 1) { st.p4 = clamp(st.p4 + d, 0, 5); return; }
        if (i == 2) {
            int p = st.p4, on = d > 0;
            if (SG->opl == 2) { flash("4OP NEEDS OPL3"); return; }
            if (on == !!(SG->four >> p & 1)) return;
            pendOn = on; pendP = p;
            if (on && pairIssues(p)) { ask("4OP PAIR ON?", "OK, PAIR THEM", "KEEP 2-OP", setPair, "KEPT 2-OP"); return; }
            setPair(); return;
        }
        SG->mspd = (uint8_t)clamp((SG->mspd ? SG->mspd : 1) + d, 1, 8);
    }
    changed();
}

/* ================================================================== settings menu ============================ */
static int menuRows(int *ix)
{
    int k, n = 0;
    for (k = 0; k < NSET; k++) if (SETDEF[k].tab == st.mtab) ix[n++] = k;
    return n;
}
static void openMenu(void) { st.menu = 1; st.mtab = 0; st.mrow = 0; st.fxp = 0; flash("SETTINGS"); }
static void closeMenu(void) { st.menu = 0; prefsChanged(); flash("SETTINGS SAVED"); }
static void menuValue(int d)
{
    int ix[NSET], k;
    menuRows(ix);
    k = ix[st.mrow];
    if (k == S_RESET) { if (d > 0) { int j; for (j = 0; j < NSET; j++) S[j] = SETDEF[j].def; applySettings(); flash("SETTINGS RESET"); } return; }
    if (k == S_INFO) { if (d > 0) openInfo(); return; }
    S[k] = (uint8_t)clamp(S[k] + d, 0, SETDEF[k].n - 1);
    applySettings();
}
static void menuKnob(int i, int d)
{
    int ix[NSET];
    if (i == UI_ALG) { st.mtab = mod(st.mtab + d, 5); st.mrow = 0; return; }
    if (i == UI_PRE || i == UI_SEL) { st.mrow = clamp(st.mrow + d, 0, menuRows(ix) - 1); return; }
    if (i == UI_MST) { knob(UI_MST, d); return; }
    menuValue(d);
}

/* ================================================================== presets ================================ */
/* PL(): the factory ones, then the user's (category USER) */
typedef struct { char name[UI_NAME]; uint8_t n; EngIns ins; } UserP;
static UserP userP[32];
static int nuser;
static uint32_t delArm;
#define NPL (NPRESETS + nuser)
static const char *plName(int k) { return k < NPRESETS ? PRESETS[k].name : userP[k - NPRESETS].name; }
static int plCat(int k) { return k < NPRESETS ? PRESETS[k].cat : 8; }
static int plUser(int k) { return k < NPRESETS ? -1 : k - NPRESETS; }
static const EngIns *plIns(int k) { return k < NPRESETS ? &PRESETS[k].ins : &userP[k - NPRESETS].ins; }
static int plNote(int k) { return k < NPRESETS ? PRESETS[k].n + (st.oct - 4) * 12 : userP[k - NPRESETS].n; }
static void previewPreset(void)
{
    if (H.on) H.on(H.u, st.ch, st.isel, plNote(st.pi), plIns(st.pi));
    prevCh = st.ch; prevOff = now + 450; if (!prevOff) prevOff = 1;
}
static void openPresets(void)
{
    int k, j = -1;
    st.pw = 1;
    for (k = 0; k < NPL; k++) if (!strcmp(plName(k), INAME(st.isel))) j = k;
    if (j >= 0) st.pi = j;
    previewPreset();
}
static void savePreset(void)
{
    UserP *u;
    if (nuser >= 32) { flash("USER SLOTS FULL (32)"); return; }
    u = &userP[nuser++];
    setName(u->name, INAME(st.isel)); u->n = (uint8_t)((st.oct + 1) * 12); u->ins = song->inst[st.isel - 1]; u->ins.fmm = 0;
    st.pi = NPL - 1; prefsChanged(); flash(F("SAVED U%s %s", dec2(nuser), INAME(st.isel)));
}
static void deletePreset(void)
{
    int e = plUser(st.pi);
    if (e < 0) { flash("FACTORY: READ ONLY"); return; }
    if (!delArm || now - delArm > 2000) { delArm = now; if (!delArm) delArm = 1; flash("EDIT AGAIN TO DELETE"); return; }
    delArm = 0;
    memmove(&userP[e], &userP[e + 1], (size_t)(nuser - e - 1) * sizeof *userP); nuser--; prefsChanged();
    st.pi = clamp(st.pi, 0, NPL - 1); flash(F("DELETED U%s", dec2(e + 1)));
}
static void loadPreset(void)
{
    int k = st.isel;
    EngIns c = *plIns(st.pi);
    char nm[UI_NAME];
    snap(); c.fmm = 0;
    setName(nm, plName(st.pi));
    us_fmm_clear(song, k); song->inst[k - 1] = c; setName(INAME(k), nm); st.pw = 0; changed(); flash(F("INS %s = %s", hex(k, 2), nm));
}

/* ================================================================== knobs ================================== */
static void knob(int i, int d)
{
    int sh = st.shift || keyShift;
    if (i == UI_MST) return;             /* (the master is the platform's) */
    if (sh && st.shift) st.used = 1;
    if (st.menu) { menuKnob(i, d); return; }
    if (st.fxp) { if (i == 0) fxpMove(d, 1); else if (i == UI_SEL || i == UI_PRE || i == UI_ALG) fxpMove(d, sh); return; }
    if (st.page == P_GLO) { gloKnob(i, d, sh); return; }
    if (st.page == P_PAT && st.scope && !st.nw) { if (i == 1 && !sh) stepCh(d); else if (i == UI_PRE) presetTurn(d, sh); return; }   /* (the waveform screen) */
    if (i == UI_SEL && st.page != P_MAC && !st.nw && !(st.page == P_INS && st.pw) && st.page != P_FILE) {
        if (st.page == P_PAT) { move(d * (sh ? 16 : 1)); preview(); }
        else if (st.page == P_INS) st.ipg = mod(st.ipg + d, 4);
        else st.ord = clamp(st.ord + d, 0, NORD - 1);
        return;
    }
    if (st.nw) {
        if (i == 0 || i == UI_SEL) { st.nc = clamp(st.nc + d, 0, nmlen()); st.tk = -1; }
        else if (i == 1) {
            int p, j = 0, nn = (int)strlen(NCH);
            if (st.nc >= nmlen() && !nameIns('A')) return;
            p = st.nc < nmlen() ? st.nc : st.nc - 1;
            while (j < nn && NCH[j] != st.nm[p]) j++;
            if (j == nn) j = -1;
            st.nm[p] = NCH[mod(j + d, nn)]; st.tk = -1;
        }
        return;
    }
    if (st.page == P_FILE) { if (i == 0 || i == UI_SEL || i == UI_PRE) st.fsel = clamp(st.fsel + d, 0, 3); return; }
    if (st.page == P_MAC && st.mk == MK_REG) { regKnob(i, d, sh); return; }
    if (st.page == P_MAC) {
        EngTab *t = mtab();
        int Ar = st.mk == MK_ARP, lim = Ar ? 48 : 64;
        if (i == 0) { st.mt = clamp(st.mt + d, 1, 16); st.shp = -1; return; }
        if (i == 1) { st.ms = clamp(st.ms + d, 0, 15); return; }
        snap();
        if (i == 2) { t->data[st.ms] = (int8_t)clamp(t->data[st.ms] + d * (sh ? (Ar ? 12 : 8) : 1), -lim, lim); if (st.ms >= t->len) t->len = (uint8_t)(st.ms + 1); mtname()[0] = 0; }
        else if (i == 3) { if (sh && !Ar) t->delay = (uint8_t)clamp(t->delay + d, 0, 64); else t->spd = (uint8_t)clamp(t->spd + d, 1, 16); }
        else if (i == UI_SEL) { t->len = (uint8_t)clamp(t->len + d, 1, 16); if (t->loop >= t->len) t->loop = (int8_t)(t->len - 1); }
        else if (i == UI_ALG) t->loop = (int8_t)clamp(t->loop + d, -1, t->len - 1);
        else if (i == UI_PRE && !sh) { st.mi = clamp(st.mi + d, 1, NINS); flash(F("PREVIEW %s %s", hex(st.mi, 2), INAME(st.mi))); return; }
        else if (i == UI_PRE) {
            int n = Ar ? NARP_SHAPES : NVIB_SHAPES, spd = t->spd;
            st.shp = mod(st.shp + d, n);
            shapeTable(Ar, st.shp, t, mtname()); t->spd = (uint8_t)spd;
            flash(Ar ? ARP_SHAPES[st.shp].name : VIB_SHAPES[st.shp].name);
        }
        changed(); return;
    }
    if (st.page == P_INS && st.pw) {
        if (i == UI_PRE || i == UI_SEL) { st.pi = clamp(st.pi + d, 0, NPL - 1); previewPreset(); }
        else if (i == 0) {
            int c = plCat(st.pi) + d, k, any;
            for (;;) { if (c < 0 || c >= 9) break; any = 0; for (k = 0; k < NPL; k++) if (plCat(k) == c) any = 1; if (any) break; c += d; }
            if (c >= 0 && c < 9) { for (k = 0; k < NPL; k++) if (plCat(k) == c) { st.pi = k; break; } previewPreset(); }
        }
        return;
    }
    if (i == UI_PRE) {
        if (st.page == P_PAT) presetTurn(d, sh);
        else if (st.page == P_INS) openPresets();
        else knob(1, d);
        return;
    }
    if (i == UI_ALG) {
        if (st.page == P_PAT) { if (sh) stepCh(d); else moveField(d); }
        else if (st.page == P_INS) { snap(); setAlg(clamp(algOf(&song->inst[st.isel - 1]) + d, 0, 5)); }
        else knob(2, d);
        return;
    }
    if (st.page == P_PAT) {
        if (i == 0 && sh) blockRows(d);
        else if (i == 1 && sh) blockCols(d);
        else if (i == 0) { int k; snap(); k = orderPos(st.ord); song->order[k] = (uint8_t)clamp(song->order[k] + d, 0, 127); changed(); flash(F("PATTERN %s", hex(curPat(), 2))); st.blk = 0; }
        else if (i == 1) stepCh(d);
        else if (i == 2) { if (st.blk) blockTrans(sh ? d * 12 : d); else fxType(d, sh); }
        else if (i == 3) fxValue(st.field == 3 ? 3 : 2, d * (sh ? 16 : 1));
    } else if (st.page == P_INS) {
        EngIns *N0 = &song->inst[st.isel - 1];
        Half hh = halfOf();
        EngIns *ins = hh.h;
        EngOp *o = &ins->op[hh.j];
        if (st.ipg == 0 && i == 0) {
            int n = st.isel + d;
            if (n > NINS && NINS < 255) {
                EngIns c = *N0;
                snap(); c.four = 0; c.fmm = 0;
                if (us_ins_insert(song, NINS + 1, &c, F("INS %s", hex(NINS + 1, 2)))) { flash("MEMORY FULL"); return; }
                changed(); flash(F("NEW INS %s", hex(NINS, 2))); st.isel = NINS; st.op = imin(st.op, 1); return;
            }
            st.isel = insStep(st.isel, d);
            if (!song->inst[st.isel - 1].four) st.op = imin(st.op, 1);
            return;
        }
        if (st.ipg == 0 && i == 2 && !sh) { st.flag = mod(st.flag + d, 4); return; }
        snap();
        if (st.ipg == 0) {
            if (i == 1) o->ws = (uint8_t)mod(o->ws + d, 8);
            else if (i == 2) { uint8_t v = d > 0 ? 1 : 0; if (st.flag == 0) o->am = v; else if (st.flag == 1) o->vib = v; else if (st.flag == 2) o->egt = v; else o->ksr = v; }
            else o->mult = (uint8_t)clamp(o->mult + d, 0, 15);
        } else if (st.ipg == 1) {
            uint8_t *p = i == 0 ? &o->ar : i == 1 ? &o->dr : i == 2 ? &o->sl : &o->rr;
            *p = (uint8_t)clamp(*p - d, 0, 15);
        } else if (st.ipg == 2) {
            if (i == 0) o->tl = (uint8_t)clamp(o->tl - d * (sh ? 8 : 1), 0, 63);
            else if (i == 1) { EngIns *Fb = N0->four ? &song->inst[st.isel] : ins; Fb->fb = (uint8_t)clamp(Fb->fb + d, 0, 7); }
            else if (i == 2) N0->ft = (int8_t)clamp(N0->ft + d * (sh ? 10 : 1), -99, 99);
            else { N0->pan = (uint8_t)mod(N0->pan + d, 3); if (N0->four) song->inst[st.isel].pan = N0->pan; }
        } else {
            if (i == 0) { int j, k = 0; for (j = 0; j < 4; j++) if (KSLO[j] == o->ksl) k = j; o->ksl = KSLO[clamp(k + d, 0, 3)]; }
            else if (i == 1) { setAlg(clamp(algOf(N0) + d, 0, 5)); return; }
            else if (i == 2) N0->arpT = (uint8_t)clamp(N0->arpT + d, 0, 16);
            else N0->vibT = (uint8_t)clamp(N0->vibT + d, 0, 16);
        }
        changed();
    } else {
        if (i == 0) st.ord = clamp(st.ord + d, 0, NORD - 1);
        else if (i == 1) { int v; snap(); v = clamp(song->order[st.ord] + d, 0, 127 + NORD); song->order[st.ord] = (uint8_t)v; changed(); flash(v < 128 ? F("PATTERN %s", hex(v, 2)) : F("JUMP TO %s", hex(v - 128, 2))); }
        else if (i == 2) {
            snap();
            if (d > 0 && NORD < 128) { song->order[NORD] = song->order[NORD - 1]; SG->norder++; }
            else if (d < 0 && NORD > 1) SG->norder--;
            st.ord = clamp(st.ord, 0, NORD - 1); changed(); flash(F("LENGTH %d", NORD));
        } else st.ord = clamp(st.ord + d * 4, 0, NORD - 1);
    }
}

/* ================================================================== notes ================================== */
#define NHELD (27 + 128)
static int held[NHELD];                  /* key k down (27 + n: MIDI note n): its track + 1 */
static int base(void) { return 53 + (st.oct - 4) * 12; }
static EngIns notePatch;
static void noteDown(int n, int k)
{
    int ins = st.page == P_INS ? st.isel : st.inst;
    const EngIns *patch = 0;
    if (st.nw) { nameKey(n - base()); held[k] = -1; return; }
    if (st.page == P_INS && st.pw) patch = plIns(st.pi);
    else if (st.page == P_MAC) {
        notePatch = song->inst[st.mi - 1];
        if (st.mk == MK_ARP) notePatch.arpT = (uint8_t)st.mt; else if (st.mk == MK_VIB) notePatch.vibT = (uint8_t)st.mt;
        patch = &notePatch;
    }
    if (H.on) H.on(H.u, st.ch, ins, n, patch);
    held[k] = st.ch + 1;
    if (st.page == P_PAT && st.field <= 1 && !st.scope) enterNote(n, st.rec);
}
static void noteUp(int k)
{
    int c = held[k] - 1, j;
    if (!held[k]) return;
    held[k] = 0;
    if (c < 0) return;
    for (j = 0; j < NHELD; j++) if (held[j] == c + 1) return;
    if (H.off) H.off(H.u, c);
}
static void noteOffEntry(void) { if (st.page == P_PAT && !st.scope) { enterNote(-2, st.rec); flash("NOTE OFF"); } }
/* while playing: the note sounding in the cursor's track (the last note above the play row in its pattern; -1 none) */
static int playKey(void)
{
    int p, r;
    EngCell c;
    if (!st.playing || st.prow < 0 || st.pord < 0 || st.pord >= NORD || song->order[st.pord] >= 0x80) return -1;
    p = song->order[st.pord];
    for (r = imin(st.prow, SG->rows - 1); r >= 0; r--) {
        us_get(song, p, r, st.ch, &c);
        if (c.note >= 0) return c.note;
        if (c.note == -2) return -1;
    }
    return -1;
}
/* the keys' lights: the keys held (and MIDI notes in the keyboard's range), and the playing note of the cursor's track */
uint32_t ui_keys(void)
{
    uint32_t m = 0;
    int k, b = base(), n = playKey() - b;
    for (k = 0; k < 27; k++) if (held[k] || (b + k >= 0 && b + k < 128 && held[27 + b + k])) m |= 1u << k;
    if (n >= 0 && n < 27) m |= 1u << n;
    return m;
}

/* ================================================================== the slots (FILE) ========================= */
static UiSlot slots[4];
static int slotHas[4];
static uint32_t slDel, slNew;            /* the first OCT- of a delete, OCT+ of a new song (0 none) */
static void prefsChanged(void) { if (H.prefs) H.prefs(H.u); }
static void refreshSlots(void) { int k; for (k = 0; k < 4; k++) slotHas[k] = H.slot_info ? H.slot_info(H.u, k, &slots[k]) : 0; }
static int firstEmpty(void) { int k; for (k = 0; k < 4; k++) if (!slotHas[k]) return k; return 0; }
static int owArmed(void) { return st.owK >= 0 && st.owK == st.fsel && now - st.owT < 4000; }
static void saveSlot(int k)
{
    int rc = H.slot_save ? H.slot_save(H.u, k) : -1;
    if (rc == -2) { flash("TOO BIG FOR A SLOT (60K)"); return; }
    if (rc) { flash("SAVE FAILED (FLASH)"); return; }
    st.slot = k; st.fsel = k; st.dirty = 0; st.owK = -1; refreshSlots(); prefsChanged();
    flash(F("SAVED SLOT %d · %dB", k + 1, (int)slots[k].size));
}
static void renameDone(int k, const char *nm)
{
    int rc = H.slot_rename ? H.slot_rename(H.u, k, nm) : -1;
    if (rc) { flash(rc == -2 ? "TOO BIG FOR A SLOT (60K)" : "RENAME FAILED"); return; }
    if (k == st.slot) setName(song->name, nm);
    refreshSlots(); flash(F("RENAMED %s", nm));
}
static void loadSlot(int k)
{
    int rc;
    if (!slotHas[k]) { flash(F("SLOT %d IS EMPTY", k + 1)); return; }
    snap(); if (st.playing) stop();
    rc = H.slot_load ? H.slot_load(H.u, k) : -1;
    if (rc == -1) { flash("LOAD FAILED"); return; }
    st.slot = k; st.ord = 0; st.row = 0; st.isel = 1; st.inst = 1; st.blk = 0; changed(); st.dirty = 0; prefsChanged();
    flash(rc == -2 ? "LOADED IN PART: NO MEMORY" : F("LOADED SLOT %d", k + 1)); st.page = P_PAT;
}
static void deleteSlot(int k)
{
    if (!slotHas[k]) { flash(F("SLOT %d IS EMPTY", k + 1)); return; }
    if (!slDel || now - slDel > 2000) { slDel = now ? now : 1; flash(F("OCT− AGAIN: DELETE %d", k + 1)); return; }
    slDel = 0;
    if (H.slot_delete) H.slot_delete(H.u, k);
    if (st.slot == k) st.slot = -1;
    refreshSlots(); prefsChanged(); flash(F("SLOT %d DELETED", k + 1));
}
static void newFromFile(void)            /* OCT+ twice: the empty song (newSong of web/demo.js, NEW_FMY), in no slot */
{
    int rc;
    if (!slNew || now - slNew > 2000) { slNew = now ? now : 1; flash("OCT+ AGAIN: NEW SONG"); return; }
    slNew = 0;
    snap(); if (st.playing) stop();
    rc = H.slot_load ? H.slot_load(H.u, -1) : -1;
    if (rc == -1) { flash("NEW SONG FAILED"); return; }
    st.slot = -1; st.ord = 0; st.row = 0; st.isel = 1; st.inst = 1; st.blk = 0; changed(); st.dirty = 0; prefsChanged();
    flash("NEW SONG"); st.page = P_PAT;
}
static int newGet(void *u, uint32_t off, uint8_t *d, uint32_t n) { (void)u; if (off > sizeof NEW_FMY || n > sizeof NEW_FMY - off) return -1; memcpy(d, NEW_FMY + off, n); return 0; }
int ui_new_song(UiSong *s) { return sf_read(s, newGet, 0, sizeof NEW_FMY); }
static void fileDone(void) { if (st.fsave) { st.fsave = 0; st.page = st.ret != P_FILE ? st.ret : P_PAT; } }
static void fileCancel(void) { st.fsave = 0; st.owK = -1; st.page = st.ret != P_FILE ? st.ret : P_PAT; flash("CANCELLED"); }
static void fileSave(int k)
{
    if (!slotHas[k]) { st.nslot = k; openName(1); return; }
    if (k == st.slot && !st.dirty) { saveSlot(k); fileDone(); return; }
    if (!owArmed()) { st.owK = k; st.owT = now; return; }
    st.owK = -1; saveSlot(k); fileDone();
}
static void renameSlot(int k)
{
    if (!slotHas[k]) { flash("EMPTY SLOT: SAVE TO NAME"); return; }
    st.nslot = k; st.nt = 2; st.nw = 1; setName(st.nm, slice(slots[k].name, 11)); st.nc = nmlen(); st.tk = -1;
}
static void openFile(void)               /* HOME+GLO */
{
    st.ret = st.page; st.fsave = 0; st.owK = -1; st.page = P_FILE; st.fsel = st.slot >= 0 ? st.slot : st.fsel; refreshSlots();
}

/* ------------------------------------------------------- kept between starts --- */
static char *app(char *p, char *end, const char *s) { while (*s && p < end) *p++ = *s++; return p; }
uint32_t ui_prefs(char *buf, uint32_t max)
{
    char *p = buf, *end = buf + max;
    int k;
    for (k = 0; k < NSET; k++) {
        if (k == S_RESET || k == S_INFO) continue;
        p = app(p, end, SETDEF[k].key); p = app(p, end, "="); p = app(p, end, sv(k)); p = app(p, end, "\n");
    }
    p = app(p, end, F("slot=%d\n", st.slot));
    return (uint32_t)(p - buf);
}
void ui_prefs_load(const char *buf, uint32_t n)
{
    uint32_t i = 0;
    while (i < n) {
        char key[24], val[24];
        int a = 0, b = 0, k, j;
        while (i < n && buf[i] != '=' && buf[i] != '\n') { if (a < 23) key[a++] = buf[i]; i++; }
        if (i < n && buf[i] == '=') i++;
        while (i < n && buf[i] != '\n') { if (b < 23) val[b++] = buf[i]; i++; }
        i++;
        key[a] = 0; val[b] = 0;
        if (!strcmp(key, "slot")) { int v = val[0] == '-' ? -1 : val[0] - '0'; st.slot = v >= 0 && v < 4 ? v : -1; continue; }
        for (k = 0; k < NSET; k++) if (!strcmp(SETDEF[k].key, key))
            for (j = 0; j < SETDEF[k].n; j++) if (!strcmp(SETDEF[k].opt[j], val)) S[k] = (uint8_t)j;
    }
    applySettings();
    st.compact = sis(S_HOMEV, "9CH");
}
static void putIns(uint8_t **p, const EngIns *I)
{
    int j;
    uint8_t *q = *p;
    for (j = 0; j < 2; j++) {
        const EngOp *o = &I->op[j];
        *q++ = o->am; *q++ = o->vib; *q++ = o->egt; *q++ = o->ksr; *q++ = o->mult; *q++ = o->ksl;
        *q++ = o->tl; *q++ = o->ar; *q++ = o->dr; *q++ = o->sl; *q++ = o->rr; *q++ = o->ws;
    }
    *q++ = I->fb; *q++ = I->con; *q++ = I->pan; *q++ = (uint8_t)I->ft; *q++ = I->arpT; *q++ = I->vibT; *q++ = I->four;
    *p = q;
}
#define UP_BYTES (UI_NAME - 1 + 1 + 31)
uint32_t ui_presets(uint8_t *buf, uint32_t max)
{
    uint8_t *p = buf;
    int k;
    if (max < 2 + (uint32_t)nuser * UP_BYTES) return 0;
    *p++ = 1; *p++ = (uint8_t)nuser;     /* version, count */
    for (k = 0; k < nuser; k++) {
        int i, e = 0;
        for (i = 0; i < UI_NAME - 1; i++) { if (!userP[k].name[i]) e = 1; *p++ = (uint8_t)(e ? 0 : userP[k].name[i]); }
        *p++ = userP[k].n;
        putIns(&p, &userP[k].ins);
    }
    return (uint32_t)(p - buf);
}
void ui_presets_load(const uint8_t *buf, uint32_t n)
{
    const uint8_t *p = buf;
    int k, c;
    if (n < 2 || buf[0] != 1 || n < 2 + (uint32_t)buf[1] * UP_BYTES || buf[1] > 32) return;
    c = buf[1]; p += 2; nuser = 0;
    for (k = 0; k < c; k++) {
        UserP *u = &userP[nuser++];
        EngIns *I = &u->ins;
        int j;
        memset(u, 0, sizeof *u);
        memcpy(u->name, p, UI_NAME - 1); u->name[UI_NAME - 1] = 0; p += UI_NAME - 1;
        u->n = *p++;
        for (j = 0; j < 2; j++) {
            EngOp *o = &I->op[j];
            o->am = *p++; o->vib = *p++; o->egt = *p++; o->ksr = *p++; o->mult = *p++; o->ksl = *p++;
            o->tl = *p++; o->ar = *p++; o->dr = *p++; o->sl = *p++; o->rr = *p++; o->ws = *p++;
        }
        I->fb = *p++; I->con = *p++; I->pan = *p++; I->ft = (int8_t)*p++; I->arpT = *p++; I->vibT = *p++; I->four = *p++;
    }
}
int ui_restore(void)
{
    int k = st.slot, rc;
    st.slot = -1;
    if (!sis(S_RESTORE, "ON") || k < 0) return -1;
    refreshSlots();
    if (!slotHas[k] || !H.slot_load) return -1;
    rc = H.slot_load(H.u, k);
    if (rc == -1) return -1;
    st.slot = k; st.dirty = 0;
    return 0;
}

/* ================================================================== buttons ================================ */
static uint32_t homeT, saveT, fxT;       /* their long presses: when they fire (0 none) */
static int holdMs(void) { const char *v = sv(S_HOLD); int n = 0; while (*v >= '0' && *v <= '9') n = n * 10 + *v++ - '0'; return n ? n : 450; }
static void homeTap(void)
{
    int onPat = st.page == P_PAT;
    if (st.ask) { askAnswer(0); return; }
    if (st.menu) { closeMenu(); return; }
    if (st.fxp) { fxpCancel(); return; }
    if (st.page == P_FILE && !st.nw) { if (owArmed()) { st.owK = -1; flash("OVERWRITE CANCELLED"); } else fileCancel(); return; }
    st.pw = 0; st.nw = 0;
    if (onPat && st.blk) { st.blk = 0; flash("BLOCK OFF"); return; }
    /* HOME short: 3 channels -> 9 channels (notes) -> the waveform of one channel -> of nine -> 3 channels */
    if (onPat) {
        if (st.scope == 2) { st.scope = 0; flash("3CH TRACK"); }
        else if (st.scope) { st.scope = 2; flash("SCOPE 9CH"); }
        else if (st.compact) { st.compact = 0; st.scope = 1; flash("SCOPE 1CH"); }
        else { st.compact = 1; st.field = 0; flash("9CH NOTES"); }
    }
    else st.page = P_PAT;
}
static void press(int n)
{
    int sh = st.shift;
    if (st.ask) { if (n == UB_OCTUP) askAnswer(1); else if (n == UB_OCTDN) askAnswer(0); return; }
    if (st.menu) { int ix[NSET]; menuRows(ix); if (n == UB_OCTUP || n == UB_OCTDN) menuValue(n == UB_OCTUP ? 1 : -1); else if (n == UB_SEL && ix[st.mrow] == S_INFO) openInfo(); return; }
    if (st.fxp) { if (n == UB_SEL || n == UB_FX) fxpPick(); else fxpCancel(); return; }
    if (st.nw) { if (n == UB_ENV) { st.nw = 0; flash("CANCELLED"); } else if (n == UB_EDIT) nameBack(sh); return; }
    if (st.page == P_FILE) {
        if (owArmed()) { st.owK = -1; flash("OVERWRITE CANCELLED"); return; }
        if (n == UB_SEL) { loadSlot(st.fsel); return; }
        if (n == UB_EDIT) { renameSlot(st.fsel); return; }
        if (n == UB_OCTDN) { deleteSlot(st.fsel); return; }
        if (n == UB_OCTUP) { newFromFile(); return; }
        if (n == UB_FX || n == UB_ENV) { flash("USB: USE THE WORKBENCH PAGE"); return; }
        fileCancel(); return;
    }
    if (st.pw && st.page == P_INS) {
        if (n == UB_SEL) { loadPreset(); return; }
        if (n == UB_ENV) { st.pw = 0; flash("CANCELLED"); return; }
        if (n == UB_EDIT) { deletePreset(); return; }
    }
    if (n != UB_HOME && sh) st.used = 1;
    if (n == UB_EDIT && st.page == P_MAC && st.mk == MK_REG) {
        EngFmm *M = us_fmm(song, st.mi, 0);
        if (!M) return;
        snap();
        if (sh) { us_fmm_clear(song, st.mi); flash("MACRO CLEARED"); }
        else if (M->len) {
            static EngFmStep T[256];
            int L = M->len, r = st.rs;
            memcpy(T, M->steps, (size_t)L * sizeof *T);
            if (r < L) { memmove(&T[r], &T[r + 1], (size_t)(L - r - 1) * sizeof *T); L--; }
            else L--;                    /* (JS splices past the end: nothing, the length one less) */
            us_fmm_set(song, st.mi, T, L);
            st.rs = imin(st.rs, imax(0, L - 1)); flash("STEP DELETED");
        }
        changed(); return;
    }
    if (n == UB_EDIT) {
        if (st.page == P_MAC) {
            EngTab *t = mtab();
            snap();
            if (sh) { memset(t->data, 0, 16); t->len = 1; t->loop = -1; t->delay = 0; mtname()[0] = 0; flash("TABLE CLEARED"); }
            else { t->data[st.ms] = 0; mtname()[0] = 0; flash(F("STEP %d = 0", st.ms)); }
            changed(); return;
        }
        if (st.page == P_PAT) { if (st.scope) return; if (st.blk) blockClear(); else deleteNote(sh); }
        else if (st.page == P_SEQ) { if (NORD > 1) { snap(); memmove(&song->order[st.ord], &song->order[st.ord + 1], (size_t)(NORD - st.ord - 1)); SG->norder--; st.ord = clamp(st.ord, 0, NORD - 1); changed(); flash("DELETED"); } }
    } else if (n == UB_ENV) { if (st.page == P_INS) st.ipg = (st.ipg + 1) % 4; else st.page = P_INS; }
    else if (n == UB_SEQ) st.page = P_SEQ;
    else if (n == UB_GLO) {
        if (sh) openFile();
        else if (st.page == P_GLO) st.gpg = (st.gpg + 1) % 3;
        else { st.ret = st.page; st.page = P_GLO; }
    } else if (n == UB_SEL) {
        if (st.page == P_INS) { int f4 = song->inst[st.isel - 1].four; st.op = (st.op + 1) % (f4 ? 4 : 2); flash(f4 ? F("OP%d", st.op + 1) : st.op ? "CARRIER (OP2)" : "MODULATOR (OP1)"); }
        else if (st.page == P_PAT) { int G[9], ng = ngroups(), gi = imax(0, groupOf(st.ch)); group((gi + (sh ? ng - 1 : 1)) % ng, G); st.ch = G[0]; }
    } else if (n == UB_FX) {
        if (st.page != P_PAT) st.page = P_PAT;
        else { st.scope = 0; if (st.compact) st.compact = 0; st.field = st.field < 2 ? 2 : st.field == 2 ? 3 : 0; flash(st.field ? F("FX%d", st.field - 1) : "NOTE"); }
    } else if (n == UB_ARP) {
        if (st.page == P_MAC) { static const char *const MN[3] = {"ARPEGGIO TABLES", "VIBRATO TABLES", "FM REGISTER MACRO"}; st.mk = (st.mk + 1) % 3; st.ms = 0; st.shp = -1; flash(MN[st.mk]); }
        else { st.page = P_MAC; st.pw = 0; st.mi = clamp(st.inst, 1, NINS); }
    } else if (n == UB_LFO) { static const char *const LN[4] = {"LFO SOFT", "VIB DEEP", "AM DEEP", "AM+VIB DEEP"}; snap(); SG->lfo = (uint8_t)((SG->lfo + 1) % 4); changed(); flash(LN[SG->lfo]); }
    else if (n == UB_REC) {
        if (sh) { uint32_t m = 0; int c; mute[st.ch] = !mute[st.ch]; for (c = 0; c < 20; c++) if (mute[c]) m |= 1u << c; if (H.mute) H.mute(H.u, m); flash(mute[st.ch] ? F("MUTE CH%s", hex(st.ch + 1, 2)) : "UNMUTE"); }
        else st.rec = !st.rec;
    } else if (n == UB_PLAY) toggle(sh);
    else if (n == UB_OCTDN || n == UB_OCTUP) {
        int up = n == UB_OCTUP;
        if (sh && st.page == P_PAT) { if (!up) blockCopy(); else blockPaste(); }
        else if (st.page == P_SEQ && up) {
            if (NORD < 128) { snap(); memmove(&song->order[st.ord + 2], &song->order[st.ord + 1], (size_t)(NORD - st.ord - 1)); song->order[st.ord + 1] = song->order[st.ord]; SG->norder++; st.ord++; changed(); flash("INSERTED"); }
        } else if (st.page == P_SEQ) {
            if (NORD > 1) { snap(); memmove(&song->order[st.ord], &song->order[st.ord + 1], (size_t)(NORD - st.ord - 1)); SG->norder--; st.ord = clamp(st.ord, 0, NORD - 1); changed(); flash("DELETED"); }
            else flash("LAST POSITION");
        } else { st.oct = clamp(st.oct + (up ? 1 : -1), 1, 7); flash(F("OCTAVE %s%d", st.oct - 4 > 0 ? "+" : "", st.oct - 4)); }
    }
}
static void save(void)
{
    if (st.fxp) { fxpPick(); return; }
    if (st.nw) { commitName(); return; }
    refreshSlots();
    if (st.page == P_FILE) { fileSave(st.fsel); return; }
    st.ret = st.page; st.fsave = 1; st.page = P_FILE; st.owK = -1;
    st.fsel = st.slot >= 0 ? st.slot : firstEmpty();
    flash("PICK SLOT, THEN SAVE");
}
void ui_down(int n)
{
    lastInput = now;
    if (n == UB_PLAY) { if (about == 1) about = 0; toggle(st.shift); if (st.shift) st.used = 1; return; }   /* (PLAY plays or stops on every screen, menus and INFO included) */
    if (aboutInput(AK_BTN, n, 0)) return;
    if (n == UB_HOME) { st.shift = 1; st.used = 0; homeT = now + (uint32_t)holdMs() + 250u; if (!homeT) homeT = 1; }
    else if (n == UB_SAVE) { saveT = now + 550u; if (!saveT) saveT = 1; if (st.shift) st.used = 1; }
    else if (n == UB_FX && !st.fxp && !st.menu && !st.nw && st.page == P_PAT) { fxT = now + (uint32_t)holdMs(); if (!fxT) fxT = 1; }
    else press(n);
}
void ui_up(int n)
{
    lastInput = now;
    if (aboutUp == n) { aboutUp = -1; return; }
    if (n == UB_HOME) { homeT = 0; st.shift = 0; if (!st.used) homeTap(); }
    if (n == UB_FX && fxT) { fxT = 0; press(UB_FX); }
    if (n == UB_SAVE && saveT) {
        saveT = 0;
        if (st.shift && !st.nw) {}
        else if (st.nw) commitName();
        else if (st.page == P_INS && !st.pw) openName(0);
        else save();
    }
}
/* KNOB ACCEL: a turn within 45 ms of the same knob's last moves 4 times as far (the page's rule; MASTER is the
 * platform's). The device reads its encoders once a loop: a knob turned on two reads running is a fast one */
static uint32_t knobT[UI_MST + 1];
void ui_knob(int k, int d)
{
    int fast = 0;
    lastInput = now;
    if (k >= 0 && k < UI_MST) { fast = sis(S_ACCEL, "ON") && now - knobT[k] < 45u; knobT[k] = now; }
    if (fast) d *= 4;
    if (k != UI_MST && aboutInput(AK_KNOB, k, d)) return;
    knob(k, d);
}
/* MIDI IN (OFF, OMNI, CH1..16): notes play as the keys do; MIDI TO REC OFF keeps them out of the pattern */
void ui_midi(uint32_t pkt)
{
    int s = (int)(pkt >> 8 & 0xFFu), n = (int)(pkt >> 16 & 0x7Fu), v = (int)(pkt >> 24 & 0x7Fu), ty = s & 0xF0, ch = (s & 15) + 1;
    if (S[S_MIDIIN] == 0 || (S[S_MIDIIN] != 1 && S[S_MIDIIN] - 1 != ch)) return;
    if (ty != 0x90 && ty != 0x80) return;
    lastInput = now;
    if (ty == 0x90 && v > 0) {
        int rec = st.rec;
        if (aboutInput(AK_KEY, n, 0)) return;
        if (sis(S_MIDIREC, "OFF")) st.rec = 0;
        noteDown(n, 27 + n);
        st.rec = rec;
    } else noteUp(27 + n);
}
int ui_led_mode(void) { return S[S_LEDS]; }
int ui_one_core(void) { return sis(S_CORE, "SINGLE"); }
void ui_key(int k, int down)
{
    lastInput = now;
    if (k < 0 || k > 26) return;
    if (down) { if (st.shift) { st.used = 1; noteOffEntry(); return; } if (aboutInput(AK_KEY, k, 0)) return; noteDown(base() + k, k); }
    else noteUp(k);
}
void ui_time(uint32_t t)
{
    now = t;
    if (about == 1 && now - aboutT >= 3000u) about = 0;
    if (homeT && (int32_t)(now - homeT) >= 0) { homeT = 0; if (st.shift && !st.used) { st.used = 1; if (st.menu) closeMenu(); else openMenu(); } }
    if (saveT && (int32_t)(now - saveT) >= 0) { saveT = 0; flash("NO UNDO"); }
    if (fxT && (int32_t)(now - fxT) >= 0) { fxT = 0; openFxPicker(); }
    if (prevOff && (int32_t)(now - prevOff) >= 0) { prevOff = 0; if (H.off) H.off(H.u, prevCh); }
    counting();
}
void ui_pos(int ord, int row, uint32_t trig)
{
    int c;
    st.prow = row; st.pord = ord;
    for (c = 0; c < 20; c++) if (trig >> c & 1) meter[c] = 1;
    if (st.playing && st.page != P_INS) { st.ord = ord; st.row = row; }
}
void ui_song_changed(void)
{
    st.ord = 0; st.row = 0; st.ch = 0; st.field = 0; st.isel = 1; st.inst = 1; st.blk = 0; st.fxp = 0;
    if (st.playing) stop();
}
void ui_init(UiSong *s, const UiHost *h, uint32_t t)
{
    int k;
    song = s; H = *h; now = t;
    memset(&st, 0, sizeof st);
    st.ret = P_PAT; st.slot = -1; st.mi = 1; st.mk = MK_ARP; st.mt = 1; st.shp = -1; st.op = 1; st.oct = 4; st.inst = 1;
    st.isel = 1; st.prow = -1; st.tk = -1; st.owK = -1; slDel = 0;
    for (k = 0; k < NSET; k++) S[k] = SETDEF[k].def;
    applySettings();
    st.compact = sis(S_HOMEV, "9CH");
    lastInput = now; helpT = now;
    about = 1; ap = 0; aboutUp = -1; aboutT = now;
}
int ui_playing(void) { return st.playing; }
void ui_say(const char *m) { flash(m); }
void ui_slots_changed(int k, int gone) { refreshSlots(); flash(F(gone ? "SLOT %d DELETED (USB)" : "SLOT %d RECEIVED (USB)", k + 1)); }
void ui_about_start(uint32_t t) { if (about == 1) aboutT = t; }
int ui_octave(void) { return st.oct; }

/* ================================================================== screens ================================ */
static int curInsOf(int ch)
{
    int r;
    for (r = 0; r < ROWS; r++) { EngCell c; getc_(r, ch, &c); if (c.note >= 0 && c.ins) return c.ins; }
    return 0;
}
static void meters(const int *G, int ng)
{
    int n = ntracks(), w = 234 / n - 2, k, j;
    rect(0, 228, 240, 12, Cpanel);
    for (k = 0; k < n; k++) {
        int c = track(k), x = 3 + k * (w + 2), h = fround(meter[c] * 7), in = 0;
        rect(x, 230, w, 7, isDrum(c) ? Cline : Ctrack);
        if (h > 0) rect(x, 237 - h, w, h, meter[c] > .6f ? Cyellow : Cgreen);
        if (mute[c]) rect(x, 233, w, 1, Cred);
        for (j = 0; j < ng; j++) if (G[j] == c) in = 1;
        if (in) rect(x, 238, w, 1, c == st.ch ? Ccyan : Cgrey);
    }
}
static void drawFxPicker(void)
{
    EngCell c;
    int i = fxi(st.field), vis = 16, top, k;
    const UiFx *x = &FXL[st.fxk];
    cellGet(&c);
    CARDS("TARGET", "NOW", "PICK", "GROUP", F("FX%d", st.field - 1), fxStr(c.fx[i], c.v[i]), slice(fxCode(x), 3), x->cat < 0 ? "—" : F("%d", x->cat + 1));
    status(F("CH%s ROW %s · FX%d COMMAND", dec2(st.ch + 1), hex(st.row, 2), st.field - 1), F("%d/%d", st.fxk + 1, NFXL), Ccyan);
    bar(37, F("‹ %s ›", x->cat < 0 ? "NONE" : FXCATS[x->cat]), "K1 GROUP", Cyellow, Cdim);
    top = clamp(st.fxk - 7, 0, imax(0, NFXL - vis));
    for (k = 0; k < vis && top + k < NFXL; k++) {
        const UiFx *q = &FXL[top + k];
        int y = 48 + k * 11, on = top + k == st.fxk;
        if (on) rect(0, y, 240, 10, Ccyan); else if (q->cat == x->cat) rect(0, y, 240, 10, Cbeat);
        txt(fxCode(q), 3, y + 2, on ? Cbg : q->cat < 0 ? Cdim : FXC[q->cat], 8); txt(cut(q->name, 150), 28, y + 2, on ? Cbg : Cwhite, 8);
        if (q->cat >= 0) { const char *cc = cut(FXCATS[q->cat], 56); txt(cc, 238 - tw(cc, 1), y + 2, on ? Cbg : Cdim, 8); }
    }
    foot("SEL/FX/SAVE PICK · OTHER CANCEL", Cwhite);
}
/* the waveform screen (HOME short, 3rd and 4th view): each track's OPL channel as the chip played it, 22.05 kHz,
 * from the host (UiHost.scope) once a frame so that every strip of a frame draws the same waves */
#define SCN 448
static int16_t scb[9][SCN];
static int scn, sctr[9], scok[9], scWas;
static void scopeFetch(void)
{
    int sv = st.page == P_PAT && st.scope && !about && !st.menu && !st.nw, G[9], k;
    if (sv != scWas) { if (H.scope_on) H.scope_on(H.u, sv); scWas = sv; }
    scn = 0;
    if (!sv) return;
    if (st.scope == 1) { G[0] = st.ch; scn = 1; } else scn = curGroup(G);
    for (k = 0; k < scn; k++) { sctr[k] = G[k]; scok[k] = H.scope ? H.scope(H.u, G[k], scb[k], SCN) : 0; }
}
/* track ch's samples: 1 there, 0 nothing yet (a flat line), -1 no OPL channel (OFF) */
static int scopeOf(int ch, const int16_t **D)
{
    int k;
    for (k = 0; k < scn; k++) if (sctr[k] == ch) { *D = scb[k]; return scok[k]; }
    return 0;
}
/* w pixels from a rising zero crossing, every step-th sample; y the centre line, half the most up or down */
static void scopeWave(const int16_t *D, int ok, int x, int y, int w, int half, int step, uint16_t col)
{
    int span = w * step, t0 = 0, py = 0, pk = 2048, i, k;   /* (scaled to the loudest sample, 2048 at least) */
    if (ok <= 0) { rect(x, y, w, 1, Cdim); return; }
    for (i = 0; i < SCN; i++) pk = imax(pk, iabs(D[i]));
    for (i = 1; i + span <= SCN; i++) if (D[i - 1] < 0 && D[i] >= 0) { t0 = i; break; }
    for (k = 0; k < w; k++) {
        int yy = y - clamp(D[t0 + k * step] * half / pk, -half, half), a;
        if (!k) py = yy;
        a = imin(py, yy); rect(x + k, a, 1, imax(py, yy) - a + 1, col); py = yy;
    }
}
static const char *trkLabel(int c) { return isDrum(c) ? DRN[c - 15] : dec2(c + 1); }
static void drawScope(void)
{
    int one = st.scope == 1, ch = st.ch, ins = curInsOf(ch), G[9], ng, j, ok;
    const int16_t *D = 0;
    CARDS("SCOPE", isDrum(ch) ? "DRUM" : "CHANNEL", "INS", "PATTERN", one ? "1CH" : "9CH", trkLabel(ch), ins ? hex(ins, 2) : "--", hex(curPat(), 2));
    status(F("R%s O%d/%d %s", hex(st.row, 2), st.ord, NORD - 1, ins ? slice(INAME(ins), 10) : ""),
           st.rec ? "● REC" : st.playing ? "► PLAY" : F("%d/%d", SG->bpm, SG->speed), st.rec ? Cred : st.playing ? Cgreen : Cdim);
    if (one) {
        int x;
        ok = scopeOf(ch, &D);
        rect(0, 132, 240, 1, Cline);
        for (x = 0; x < 240; x += 30) rect(x, 129, 1, 7, Cline);
        if (ok < 0) ctxt("OFF", 120, 128, Cdim, 8); else scopeWave(D, ok, 0, 132, 240, 88, 1, mute[ch] ? Cdim : Cgreen);
        if (mute[ch]) txt("MUTE", 3, 40, Cred, 8);
        foot("K2 CHANNEL · SEL GROUP · HOME VIEW", Cgrey);
        return;
    }
    ng = curGroup(G);
    for (j = 0; j < ng; j++) {
        int c = G[j], x = (j % 3) * 80, y = 37 + j / 3 * 64;
        ok = scopeOf(c, &D);
        frameRect(x, y, 79, 63, c == st.ch ? Ccyan : Cline);
        txt(trkLabel(c), x + 3, y + 3, mute[c] ? Cred : c == st.ch ? Ccyan : Cgrey, 8);
        rect(x + 1, y + 37, 77, 1, Cline);
        if (ok < 0) ctxt("OFF", x + 40, y + 33, Cdim, 8); else scopeWave(D, ok, x + 1, y + 37, 77, 24, 2, mute[c] ? Cdim : c == st.ch ? Cyellow : Cgreen);
    }
}
static void drawPat(void)
{
    EngCell c;
    int G[9], ng, dv, narrow, cw, x0, j, i, half = 10, showPlay, r0, r1, i0, i1;
    static const int offs[4] = {0, 20, 34, 54}, doffs[4] = {0, 19, 32, 38};
    const char *ins;
    if (st.fxp) { drawFxPicker(); return; }
    if (st.scope) { drawScope(); return; }
    cellGet(&c);
    ins = st.inst >= 1 && st.inst <= NINS ? INAME(st.inst) : 0;
    CARDS("PATTERN", isDrum(st.ch) ? "DRUM" : "CHANNEL", F("FX1 %s", fxShort(c.fx[0], c.v[0])), F("FX2 %s", fxShort(c.fx[1], c.v[1])),
          hex(curPat(), 2), isDrum(st.ch) ? DRN[st.ch - 15] : dec2(st.ch + 1), fxStr(c.fx[0], c.v[0]), fxStr(c.fx[1], c.v[1]));
    if (st.field >= 2 && !st.compact) frameRect((st.field == 2 ? 2 : 3) * 60, 0, 59, 25, Cyellow);
    blockRect(&r0, &r1, &i0, &i1);
    status(F("R%s O%d/%d I%s %s", hex(st.row, 2), st.ord, NORD - 1, hex(st.inst, 2), ins ? slice(ins, 7) : ""),
           st.blk ? F("BLOCK %d×%d", r1 - r0 + 1, i1 - i0 + 1) : st.rec ? "● REC" : st.playing ? "► PLAY" : st.compact ? "9CH" : F("%d/%d", SG->bpm, SG->speed),
           st.blk ? Cyellow : st.rec ? Cred : st.playing ? Cgreen : Cdim);
    ng = curGroup(G); dv = isDrum(G[0]); narrow = st.compact && !dv; cw = dv ? 44 : narrow ? 25 : 74; x0 = narrow ? 14 : 15;
    rect(0, 36, 240, 10, Cbar);
    for (j = 0; j < ng; j++) {
        int ch = G[j], x = x0 + j * cw, lo = isLo4(ch);
        if (ch == st.ch) rect(x - 1, 36, cw - 1, 10, Cchsel);
        txt(dv ? DRN[ch - 15] : dec2(ch + 1), x + (narrow ? 6 : 0), 38, mute[ch] ? Cred : ch == st.ch ? Ccyan : lo ? Cdim : Cgrey, 8);
        if (!narrow) {
            int k = mute[ch] ? 0 : curInsOf(ch), w = cw - 18;
            const char *s = k >= 1 && k <= NINS ? INAME(k) : 0;
            txt(mute[ch] ? "MUTE" : lo ? "◄4OP" : pairOf(ch) >= 0 ? cut(F("4OP %s", s ? s : ""), w) : s ? cut(s, w) : "", x + 16, 38,
                mute[ch] ? Cred : lo || pairOf(ch) >= 0 ? Cmag : ch == st.ch ? Cwhite : Cdim, 8);
        }
    }
    showPlay = st.playing && st.pord == st.ord;
    for (i = 0; i < 20; i++) {
        int r = st.row - half + i, y = 46 + i * 9;
        int haveBg = 1;
        uint16_t bg = 0;
        if (r < 0 || r >= ROWS) continue;
        if (showPlay && r == st.prow) bg = Cplay; else if (r == st.row) bg = Ccur; else if (r % 4 == 0) bg = Cbeat; else haveBg = 0;
        if (y + 9 <= fy0 || y >= fy0 + fh) continue;
        if (haveBg) rect(0, y, 240, 9, bg);
        txt(sis(S_ROWNUM, "DEC") ? dec2(r % 100) : hex(r, 2), 1, y + 1, r % 16 == 0 ? Cyellow : Cdim, 8);
        for (j = 0; j < ng; j++) {
            int ch = G[j], x = x0 + j * cw, lo = isLo4(ch), f;
            EngCell cl;
            const char *parts[4];
            uint16_t cols[4];
            getc_(r, ch, &cl);
            if (inBlock(r, ch)) rect(x - 1, y, cw - 1, 9, Cchsel);
            rect(x - 2, y, 1, 9, Cline);
            parts[0] = noteName(cl.note); parts[1] = cl.ins ? hex(cl.ins, 2) : "--";
            if (dv) { parts[2] = cl.fx[0] < 0 ? "·" : F("%c", FXD[cl.fx[0]]); parts[3] = cl.fx[1] < 0 ? "·" : F("%c", FXD[cl.fx[1]]); }
            else { parts[2] = fxStr(cl.fx[0], cl.v[0]); parts[3] = fxStr(cl.fx[1], cl.v[1]); }
            cols[0] = cl.note == -1 ? Cdim : cl.note == -2 ? Cred : Cwhite; cols[1] = cl.ins ? (lo ? Cmag : Ccyan) : Cdim;
            cols[2] = fxCol(cl.fx[0], cl.v[0]); cols[3] = fxCol(cl.fx[1], cl.v[1]);
            for (f = 0; f < (narrow ? 1 : 4); f++) {
                int fx = x + (narrow ? 3 : dv ? doffs[f] : offs[f]);
                if (r == st.row && ch == st.ch && f == st.field) { rect(fx - 1, y, tw(parts[f], 1) + 2, 9, Ccyan); txt(parts[f], fx, y + 1, Cbg, 8); }
                else txt(parts[f], fx, y + 1, mute[ch] ? c565(0x7777AA) : cols[f], 8);
            }
        }
    }
    if (st.blk) {
        int js0 = -1, js1 = -1, a = r0 - (st.row - half), b2 = r1 - (st.row - half);
        for (j = 0; j < ng; j++) { int t = tindex(G[j]); if (t >= i0 && t <= i1) { if (js0 < 0) js0 = j; js1 = j; } }
        if (js0 >= 0 && b2 >= 0 && a < 20) {
            int xa = x0 + js0 * cw - 2, xb = x0 + (js1 + 1) * cw - 2, ya = 46 + imax(0, a) * 9, yb = 46 + imin(20, b2 + 1) * 9;
            frameRect(xa, ya, xb - xa + 1, yb - ya, Cyellow);
        }
    }
    meters(G, ng);
}

/* sin(2 pi t), t in turns (single precision: the device has no double) */
static float sinT(float t)
{
    float x, x2;
    t -= (float)(int)t;
    if (t < 0) t += 1;
    if (t > 0.5f) return -sinT(t - 0.5f);
    if (t > 0.25f) t = 0.5f - t;         /* sin(pi - x) */
    x = t * 6.2831853f; x2 = x * x;
    return x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110)))));
}
static float wave(int ws, float p)
{
    float s = sinT(p), v;
    switch (ws) {
    case 0: return s;
    case 1: return s > 0 ? s : 0;
    case 2: return s < 0 ? -s : s;
    case 3: return (p - (float)(int)(p * 2) * 0.5f) < .25f ? (s < 0 ? -s : s) : 0;
    case 4: return p < .5f ? sinT(2 * p) : 0;
    case 5: v = sinT(2 * p); return p < .5f ? (v < 0 ? -v : v) : 0;
    case 6: return p < .5f ? 1 : -1;
    default: { float a = 1 - p * 2, b = (p - .5f) * 2; return p < .5f ? a * a * a : -(b * b * b); }
    }
}
static void opTabs(const EngIns *ins)
{
    int j;
    if (song->inst[st.isel - 1].four) {
        static const char *const T4[4] = {"OP1 M1", "OP2 C1", "OP3 M2", "OP4 C2"};
        for (j = 0; j < 4; j++) { int x = j * 60, on = st.op == j; rect(x, 37, 59, 10, on ? Cmag : Cbar); txt(T4[j], x + 4, 39, on ? Cbg : Cgrey, 8); }
        return;
    }
    for (j = 0; j < 2; j++) {
        int x = j * 120, on = st.op == j;
        rect(x, 37, 119, 10, on ? Ccyan : Cbar); txt(j ? "OP2 CAR" : "OP1 MOD", x + 4, 39, on ? Cbg : Cgrey, 8);
        if (j == 0 && st.ipg == 2 && !ins->con) txt("= DEPTH", x + 56, 39, on ? Cbg : Cdim, 8);
    }
}
static const char *ft2s(int ft) { return F("%s%d", ft > 0 ? "+" : "", ft); }
static void box(int bx, int by, const char *l) { rect(bx, by, 40, 15, Ccyan); ctxt(l, bx + 20, by + 4, Cbg, 8); }
static void arrow(int x1, int x2, int yy) { rect(x1, yy, x2 - x1, 1, Cwhite); rect(x2 - 3, yy - 2, 1, 5, Cwhite); rect(x2 - 2, yy - 1, 1, 3, Cwhite); }
static const char *tlDb(int tl)          /* '-' + (tl * 0.75).toFixed(1) + 'DB': quarters, exact; toFixed rounds the tie up */
{
    int t = (tl * 75 + 5) / 10;
    return F("-%d.%dDB", t / 10, t % 10);
}
static void drawPresets(void);
static void drawIns(void)
{
    EngIns *N0 = &song->inst[st.isel - 1];
    Half hh = halfOf();
    EngIns *ins = hh.h;
    EngOp *o = &ins->op[hh.j];
    int ft = N0->ft, b4 = N0->four ? (st.op < 2 ? 0 : 2) : 0, pg = st.ipg, j, k;
    if (st.pw) { drawPresets(); return; }
    if (pg == 0) {
        int fv = st.flag == 0 ? o->am : st.flag == 1 ? o->vib : st.flag == 2 ? o->egt : o->ksr;
        CARDS("INSTR", "WAVE", F("%s%s", FLAG_SH[st.flag], st.shift ? " SET" : " ‹›"), "MULT", hex(st.isel, 2), F("%d", o->ws), fv ? "ON" : "OFF", F("×%s", MULTN[o->mult]));
    } else if (pg == 1) CARDS("ATTACK", "DECAY", "SUSTAIN", "RELEASE", ATKS[o->ar], DECS[o->dr], F("%d", 15 - o->sl), DECS[o->rr]);
    else if (pg == 2) { static const char *const LCR[3] = {"L", "C", "R"}; CARDS("LEVEL", "FEEDBACK", "FINE TUNE", "PAN", F("%d", 63 - o->tl), F("%d", (N0->four ? &song->inst[st.isel] : ins)->fb), ft2s(ft), LCR[N0->pan % 3]); }
    else {
        int kk = 0;
        char *cn;
        for (k = 0; k < 4; k++) if (KSLO[k] == o->ksl) kk = k;
        if (N0->four) { const char *a = ALGN[algOf(N0)] + 4; int n = 0, cut1 = 0; cn = nb(); while (*a) { if (*a == '/' && !cut1) { cut1 = 1; a++; continue; } cn[n++] = *a++; } cn[n] = 0; }
        else cn = N0->con ? "ADD" : "FM";
        CARDS("KEY SCALE", "CONNECT", "ARP TABLE", "VIB TABLE", KSLN[kk], cn, N0->arpT ? hex(N0->arpT, 2) : "OFF", N0->vibT ? hex(N0->vibT, 2) : "OFF");
    }
    status(F("INS %s %s%s", hex(st.isel, 2), INAME(st.isel), N0->four ? " · 4OP" : ""), F("%s %d/4", PG[pg], pg + 1), N0->four ? Cmag : Ccyan);
    opTabs(ins);
    for (j = 0; j < 2; j++) {
        EngOp *op = &ins->op[j];
        int x = j * 120 + 1, sel = hh.j == j, cw = 118;
        if (pg == 0) {
            int i, py = 0, w = cw - 8;
            rect(x, 49, cw, 64, Cbar); txt(WNAME[op->ws], x + 3, 51, sel ? Cwhite : Cgrey, 8); txt(F("W%d", op->ws), x + cw - 14, 51, Cdim, 8);
            for (i = 0; i <= w; i++) {   /* plot(p => wave(ws, p * 2 % 1), x + 4, w, 86, 19) */
                float p = (float)i / (float)w, q = p * 2;
                int y;
                if (q >= 1) q -= 1;
                y = fround(86 - wave(op->ws, q) * 19);
                if (i) pline(x + 4 + i - 1, py, x + 4 + i, y, sel ? Cgreen : c565(0x33AA66));
                py = y;
            }
            txt("MULT", x + 3, 121, Cgrey, 8); txt(F("×%s", MULTN[op->mult]), x + 34, 117, sel ? Cyellow : Cgrey, 12);
            for (k = 0; k < 4; k++) { int fv = k == 0 ? op->am : k == 1 ? op->vib : k == 2 ? op->egt : op->ksr; chip(x + 2 + k * 29, 138, 26, FLAG_SH[k], fv, sel && k == st.flag); }
        } else if (pg == 1) {
            /* in fifteenths of a pixel: seg(v) = 4 + (15 - v) * 1.6, slY = 60 + 66 * sl / 15, all exact */
            int top = 60 * 15, bot = 126 * 15, slY = top + 66 * op->sl, px = (x + 4) * 15, py = bot;
            uint16_t col = sel ? Cyellow : c565(0xAAAA44);
#define SEG(v) (60 + (15 - (v)) * 24)
#define TO(nx, ny) do { int nx_ = (nx), ny_ = (ny); pline(rdiv(px, 15), rdiv(py, 15), rdiv(nx_, 15), rdiv(ny_, 15), col); px = nx_; py = ny_; } while (0)
            rect(x, 49, cw, 82, Cbar);
            TO(px + (op->ar == 15 ? 15 : SEG(op->ar)), top); TO(px + SEG(op->dr), slY); if (op->egt) TO(px + 18 * 15, slY);
            TO(imin(px + SEG(op->rr) + 30, (x + cw - 3) * 15), bot);
#undef TO
#undef SEG
            if (!op->egt) txt("NO HOLD", x + cw - 44, 51, Cmag, 8);
            for (k = 0; k < 4; k++) {
                static const char *const L4[4] = {"A", "D", "S", "R"};
                int v = k == 0 ? 15 - op->ar : k == 1 ? 15 - op->dr : k == 2 ? 15 - op->sl : 15 - op->rr, y = 136 + k * 12;
                const char *t = k == 0 ? ATKS[op->ar] : k == 1 ? DECS[op->dr] : k == 2 ? F("LVL %d", 15 - op->sl) : DECS[op->rr];
                txt(L4[k], x + 2, y, sel ? Cwhite : Cgrey, 8); hbar(x + 11, y + 1, 46, v, 15, sel ? Cyellow : Cdim); txt(t, x + 62, y, sel ? Ccyan : Cdim, 8);
            }
        } else if (pg == 2) {
            rect(x, 49, cw, 40, Cbar); txt(isCar(N0, b4 + j) ? "OUT LEVEL" : "MOD DEPTH", x + 3, 51, Cgrey, 8);
            txt(F("%d", 63 - op->tl), x + 3, 61, sel ? Cyellow : Cgrey, 12); txt(tlDb(op->tl), x + 40, 65, Cdim, 8);
            hbar(x + 3, 80, cw - 6, 63 - op->tl, 63, sel ? Cgreen : Cdim);
        } else {
            static const int DBO[4] = {0, 66, 33, 132};   /* dB/oct * 2.2, tenths */
            int kk = 0;
            for (k = 0; k < 4; k++) if (KSLO[k] == op->ksl) kk = k;
            rect(x, 49, cw, 52, Cbar); txt("KEY SCALE LVL", x + 3, 51, Cgrey, 8);
            txt(F("%s DB/OCT", KSLN[kk]), x + 3, 62, sel ? Cyellow : Cgrey, 8);
            pline(x + 8, 76, x + cw - 8, rdiv(760 + DBO[op->ksl], 10), sel ? Cgreen : Cdim);
            txt("LOW", x + 3, 92, Cdim, 8); txt("HIGH", x + cw - 26, 92, Cdim, 8);
        }
    }
    if (pg == 0) { rect(0, 157, 240, 22, Cpanel); txt(cut(FLAG_TIP[st.flag], 236), 2, 159, Cgrey, 8); txt("HOME+KNOB3 = ON/OFF", 2, 169, Cdim, 8); }
    if (pg == 2) {
        int y = 93, fbv = (N0->four ? &song->inst[st.isel] : ins)->fb, fx;
        rect(1, y, 238, 82, Cbar);
        txt(N0->four ? "FEEDBACK M1" : "FEEDBACK", 5, y + 4, Cgrey, 8); txt(F("%d", fbv), 92, y + 4, Cyellow, 8); hbar(108, y + 5, 126, fbv, 7, Cyellow);
        txt("FINE TUNE", 5, y + 22, Cgrey, 8); txt(F("%sC", ft2s(ft)), 64, y + 22, Cyellow, 8);
        rect(108, y + 23, 126, 5, Cline); rect(171, y + 21, 1, 9, Cgrey); fx = 171 + rdiv(ft * 62, 99); rect(imin(fx, 171), y + 23, iabs(fx - 171), 5, Ccyan);
        txt("PANNING", 5, y + 41, Cgrey, 8);
        for (k = 0; k < 3; k++) { static const char *const LCR[3] = {"L", "C", "R"}; chip(108 + k * 43, y + 39, 39, LCR[k], N0->pan == k, 0); }
        txt("CONNECT", 5, y + 62, Cgrey, 8); txt(N0->four ? ALGN[algOf(N0)] : ins->con ? "ADD OP1+OP2" : "FM OP1→OP2", 108, y + 62, Ccyan, 8);
    }
    if (pg == 3) {
        int y = 105;
        rect(1, y, 238, 88, Cbar); txt("CONNECTION", 5, y + 3, Cgrey, 8);
        if (N0->four) {
            static const int8_t RW[4][3][4] = {{{1, 2, 3, 4}}, {{1}, {2, 3, 4}}, {{1, 2}, {3, 4}}, {{1}, {2, 3}, {4}}};
            static const uint8_t NR[4] = {1, 2, 2, 3};
            int a = connOf(N0), nr = NR[a], r, n;
            for (r = 0; r < nr; r++) {
                int yy = y + 12 + r * 22 + (3 - nr) * 11, len = 0;
                while (len < 4 && RW[a][r][len]) len++;
                for (n = 0; n < len; n++) {
                    int bx = 14 + (4 - len + n) * 44;
                    rect(bx, yy, 32, 15, Cmag); ctxt(F("OP%d", RW[a][r][n]), bx + 16, yy + 4, Cbg, 8);
                    if (n < len - 1) arrow(bx + 32, bx + 44, yy + 7);
                }
                arrow(14 + 3 * 44 + 32, 194, yy + 7);
            }
            rect(194, y + 12 + (3 - nr) * 11 + 7, 1, (nr - 1) * 22 + 1, Cwhite); txt("OUT", 200, y + 38, Cwhite, 8);
            txt(F("%s%s", ALGN[algOf(N0)], a == 1 || a == 2 ? " (*)" : ""), 20, y + 76, Cyellow, 8); txt("FEEDBACK ON M1 ONLY", 120, y + 76, Cdim, 8);
        } else if (!ins->con) { box(20, y + 30, "OP1"); arrow(60, 98, y + 37); box(100, y + 30, "OP2"); arrow(140, 186, y + 37); txt("OUT", 190, y + 34, Cwhite, 8); txt("FM: OP1 BENDS OP2", 20, y + 60, Cyellow, 8); }
        else { box(40, y + 16, "OP1"); box(40, y + 44, "OP2"); arrow(80, 140, y + 23); arrow(80, 140, y + 51); rect(140, y + 23, 1, 29, Cwhite); arrow(140, 186, y + 37); txt("OUT", 190, y + 34, Cwhite, 8); txt("ADD: BOTH HEARD", 20, y + 70, Cyellow, 8); }
    }
}
static const char *pnum(int k) { return plUser(k) < 0 ? dec2(k + 1) : F("U%s", dec2(plUser(k) + 1)); }
static void drawPresets(void)
{
    int cat = plCat(st.pi), nin = 0, idx = 0, k, vis = 15, top;
    for (k = 0; k < NPL; k++) if (plCat(k) == cat) { if (k == st.pi) idx = nin; nin++; }
    CARDS("CATEGORY", "PRESET", "TARGET", "USER", slice(PRESET_CATS[cat], 9), pnum(st.pi), hex(st.isel, 2), F("%d/32", nuser));
    status(F("PRESET → INS %s %s", hex(st.isel, 2), INAME(st.isel)), F("%d/%d", idx + 1, nin), Ccyan);
    bar(37, F("‹ %s ›", PRESET_CATS[cat]), "K1 CATEGORY", Cyellow, Cdim);
    top = clamp(st.pi - 7, 0, imax(0, NPL - vis));
    for (k = 0; k < vis && top + k < NPL; k++) {
        int q = top + k, y = 48 + k * 12, on = q == st.pi, us = plUser(q) >= 0;
        if (on) rect(0, y, 240, 11, Ccyan); else if (plCat(q) == cat) rect(0, y, 240, 11, Cbeat);
        txt(pnum(q), 3, y + 2, on ? Cbg : us ? Cmag : Cdim, 8); txt(plName(q), 26, y + 2, on ? Cbg : Cwhite, 8);
        txt(cut(PRESET_CATS[plCat(q)], 72), 120, y + 2, on ? Cbg : us ? Cmag : Cdim, 8);
        txt(plIns(q)->con ? "ADD" : "FM", 220, y + 2, on ? Cbg : Cgreen, 8);
    }
    foot(plUser(st.pi) >= 0 ? "SEL LOAD · ENV CANCEL · EDIT×2 DEL" : "SEL LOAD · ENV CANCEL", Cwhite);
}
static void drawName(void)
{
    static const char *const wn[16] = {"F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5"};
    static const uint8_t WH[16] = {0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24, 26};
    int songN = st.nt == 1, pend = st.tk >= 0 && now - st.tt < 1000, k, n = nmlen();
    char *bl;
    const char *slot = songN ? F("SLOT %d", st.nslot + 1) : F("U%s", dec2(nuser + 1));
    CARDS("NAME", "CURSOR", songN ? "TARGET" : "SLOT", "LENGTH", n ? slice(st.nm, 4) : "—", F("%d", st.nc), !songN && nuser >= 32 ? "FULL" : songN ? F("%d", st.nslot + 1) : slot, F("%d/11", n));
    status(songN ? F("SAVE SONG → SLOT %d", st.nslot + 1) : F("SAVE PRESET %s FROM INS %s", slot, hex(st.isel, 2)), "NAME", Cyellow);
    rect(2, 40, 236, 32, Cbar);
    for (k = 0; k < 11; k++) {
        int x = 10 + k * 20;
        rect(x, 65, 16, 1, k < n ? Cgrey : Cdim);
        if (pend && k == st.nc - 1) rect(x - 1, 45, 18, 18, Cyellow);
        if (k < n) txt(st.nm[k] == ' ' ? "␣" : F("%c", st.nm[k]), x + 3, 47, pend && k == st.nc - 1 ? Cbg : Cwhite, 12);
    }
    if (now % 1000 < 600) rect(10 + st.nc * 20 - 3, 44, 2, 22, Ccyan);
    for (k = 0; k < 16; k++) {
        int x = 2 + (k % 4) * 60, y = 76 + (k / 4) * 22, last = st.tk == WH[k] && pend, i, m = 0;
        const char *w = k < (int)(sizeof WCH / sizeof *WCH) ? WCH[k] : "";
        char *t = nb();
        for (i = 0; w[i]; i++) { if (w[i] == ' ') { memcpy(t + m, "␣", 3); m += 3; } else t[m++] = w[i]; }
        t[m] = 0;
        rect(x, y, 56, 19, last ? Ccyan : Cbar); txt(wn[k], x + 3, y + 6, last ? Cbg : Cdim, 8); txt(t, x + 19, y + 3, last ? Cbg : Cwhite, 12);
    }
    bl = nb(); { int m = 0, i; const char *h = "BLACK: "; while (*h) bl[m++] = *h++; for (i = 0; i < (int)(sizeof BCH / sizeof *BCH); i++) { const char *b = BCH[i]; if (i) bl[m++] = ' '; while (*b && m < 90) bl[m++] = *b++; } bl[m] = 0; }
    txt(bl, 3, 166, Cdim, 8);
    rect(0, 180, 240, 60, Cpanel);
    txt("SAVE   CONFIRM", 4, 184, Cwhite, 8); txt("ENV    CANCEL", 4, 194, Cgrey, 8); txt("EDIT   BACKSPACE", 4, 204, Cgrey, 8); txt("KNOB1  CURSOR", 4, 214, Cgrey, 8); txt("KNOB2  SCROLL LETTER", 4, 224, Cgrey, 8);
}
static const char *fmtv(int k, int v, int has)
{
    if (!has) return "—";
    if (k == 28) return TRIGN[v];
    if (k == 27) return v >= 0 && v < 3 ? PANN[v] : "?";
    if (k == 26) return F("%s%d", v > 0 ? "+" : "", v);
    return F("%d", v);
}
static void drawReg(void)
{
    EngIns *ins = regIns();
    EngFmm *M = ins->fmm ? &song->fmm[st.mi - 1] : 0, blank;
    int rs = st.rs, k = st.rc, len, off, gx = 8, cw = 14, top = 51, bot = 160, w0 = rs / 16 * 16, mx = REGMX[k], neg = k == 26, j;
    const EngFmStep *s;
    if (!M) { memset(&blank, 0, sizeof blank); M = &blank; }
    len = M->len; s = rs < len ? &M->steps[rs] : 0; off = k < 28 && M->dis[k];
    CARDS("REG INS", "STEP", cut(REGN[k], 54), st.shift ? "KEY-OFF" : "DURATION", hex(st.mi, 2), len ? F("%d/%d", rs + 1, len) : "0", off ? "OFF" : fmtv(k, s ? regGet(s, k) : 0, s != 0),
          st.shift ? (M->ko ? hex(M->ko, 2) : "OFF") : s ? F("%d", s->dur) : "—");
    status(F("%s L%d LOOP %s KO %s", INAME(st.mi), len, M->lb ? F("%s+%d", hex(M->lb, 2), M->ll) : "-", M->ko ? hex(M->ko, 2) : "-"), "REG", Ccyan);
    bar(37, F("► REG MACRO   %d/29", k + 1), "ARP SWITCHES", Cwhite, Cdim);
    rect(gx - 2, top - 2, 16 * cw + 2, bot - top + 4, Cbar);
    if (neg) rect(gx - 2, (top + bot) >> 1, 16 * cw + 2, 1, Cdim);
    for (j = 0; j < 16; j++) {
        int n = w0 + j, x = gx + j * cw, inL = n < len, on = n == rs;
        if (inL) {
            const EngFmStep *st0 = &M->steps[n];
            int val = regGet(st0, k), dh = imin(10, st0->dur);
            uint16_t col = off ? Cdim : on ? Ccyan : Cgreen;
            if (neg) { int mid = (top + bot) >> 1, h = rdiv(imin(255, iabs(val)) * (bot - top), 510); rect(x + 2, val > 0 ? mid - h : mid + 1, cw - 4, imax(1, h), col); }
            else { int h = imax(1, rdiv(val * (bot - top - 4), mx)); rect(x + 2, bot - h, cw - 4, h, col); }
            rect(x + 2, bot + 14 - dh, cw - 4, dh, st0->dur ? Cyellow : Cred);
        }
        if (on) frameRect(x, top - 1, cw, bot - top + 2, Cwhite);
        { const char *h = hex(n + 1, 2); int L = (int)strlen(h); txt(h + L - 2, x + 1, 178, on ? Cwhite : inL ? Cgrey : Cline, 8); }
    }
    txt("DUR", gx - 4, 163, Cdim, 8);
    if (M->lb && M->ll) { int a = M->lb - 1 - w0, b2 = M->lb - 1 + M->ll - w0; if (b2 > 0 && a < 16) { int x1 = gx + imax(0, a) * cw, x2 = gx + imin(16, b2) * cw; rect(x1, 190, x2 - x1 - 2, 1, Cgreen); txt("LOOP", x1 + 2, 193, Cgreen, 8); } }
    if (M->ko && M->ko - 1 >= w0 && M->ko - 1 < w0 + 16) { int x = gx + (M->ko - 1 - w0) * cw; rect(x, 188, 1, 14, Cred); txt("KO", x + 3, 193, Cred, 8); }
    txt(off ? F("%s IS OFF · HOME+K2 TURNS ON", REGN[k]) : "HOME+K2 TURNS THIS COLUMN OFF", 4, 206, off ? Cyellow : Cdim, 8);
    foot(len ? "K1 STEP K2 COL K3 VALUE K4 DUR" : "TURN K3 OR SELECT TO ADD STEPS", Cwhite);
}
static void drawMac(void)
{
    int Ar = st.mk == MK_ARP, lim = Ar ? 24 : 32, gx = 8, cw = 14, top = 51, bot = 177, mid = rdiv(top + bot, 2), k, nu = 0;
    EngTab *t = mtab();
    static char used[96];
    char *nm = mtname();
    if (st.mk == MK_REG) { drawReg(); return; }
    used[0] = 0;
    for (k = 0; k < NINS; k++) if ((Ar ? song->inst[k].arpT : song->inst[k].vibT) == st.mt) { if (strlen(used) < 80) { if (nu) strcat(used, " "); strcat(used, hex(k + 1, 2)); } nu++; }
    CARDS(Ar ? "ARP TABLE" : "VIB TABLE", "STEP", Ar ? "SEMITONE" : "DEPTH", st.shift && !Ar ? "DELAY" : "SPEED",
          hex(st.mt, 2), F("%X/%X", st.ms, t->len - 1), F("%s%d", t->data[st.ms] > 0 ? "+" : "", t->data[st.ms]), st.shift && !Ar ? F("%d", t->delay) : F("%d", t->spd));
    status(F("%s L%d LP%s%s", nm[0] ? nm : F("TABLE %s", hex(st.mt, 2)), t->len, t->loop < 0 ? "-" : hex(t->loop, 1), Ar ? "" : F(" D%d", t->delay)), Ar ? "ARP" : "VIB", Ar ? Cyellow : Cmag);
    bar(37, Ar ? "► ARP   VIB" : "  ARP ► VIB", "ARP SWITCHES", Cwhite, Cdim);
    rect(gx - 2, top - 2, 16 * cw + 2, bot - top + 4, Cbar); rect(gx - 2, mid, 16 * cw + 2, 1, Cdim);
    for (k = 0; k < 16; k++) {
        int x = gx + k * cw, v = t->data[k], inL = k < t->len, on = k == st.ms, h = rdiv(clamp(v, -lim, lim) * (bot - top), 2 * lim);
        uint16_t col = !inL ? c565(0x2A2A8A) : on ? Ccyan : Ar ? Cyellow : Cmag;
        if (v) rect(x + 2, v > 0 ? mid - h : mid + 1, cw - 4, imax(1, iabs(h)), col); else rect(x + 2, mid - 1, cw - 4, 3, col);
        if (on) frameRect(x, top - 1, cw, bot - top + 2, Cwhite);
        txt(hex(k, 1), x + 4, 181, on ? Cwhite : inL ? Cgrey : c565(0x3A3A9A), 8);
    }
    if (t->loop >= 0) { int x1 = gx + t->loop * cw, x2 = gx + t->len * cw; rect(x1, 192, x2 - x1 - 2, 1, Cgreen); rect(x1, 189, 1, 4, Cgreen); rect(x2 - 3, 189, 1, 4, Cgreen); txt("LOOP", x1 + 2, 195, Cgreen, 8); }
    else txt("ONE SHOT", gx, 193, Cdim, 8);
    txt(cut(nu ? F("USED BY %s", used) : "NOT USED (ENV PAGE 4)", 232), gx - 4, 206, nu ? Cgreen : Cdim, 8);
    foot(F("PREVIEW %s %s", hex(st.mi, 2), INAME(st.mi)), Cwhite);
}
static const char *fix1(int a, int b)    /* (a / b).toFixed(1), a / b >= 0: exact */
{
    int t = rdiv(a * 10, b);
    return F("%d.%d", t / 10, t % 10);
}
static void drawGlo(void)
{
    int g = st.gpg, j, p, k;
    static const char *const TB[3] = {"TEMPO", "CHIP", "VOICES"};
    if (g == 0) CARDS("BPM", "SPEED", "ROWS", "G.VOLUME", F("%d", SG->bpm), F("%d", SG->speed), F("%d", ROWS), F("%d", SG->gvol));
    else if (g == 2) CARDS("PERC", "4OP PAIR", "PAIR", "MACRO SPD", SG->perc ? "ON" : "OFF", F("%d-%d", HI4[st.p4] + 1, HI4[st.p4] + 2), SG->four >> st.p4 & 1 ? "ON" : "OFF", F("×%d", SG->mspd ? SG->mspd : 1));
    else CARDS("CHIP", "AM DEPTH", "VIB DEPTH", "FX SHAPE", SG->opl == 2 ? "OPL2" : "OPL3", SG->lfo & 2 ? "4.8DB" : "1DB", SG->lfo & 1 ? "14C" : "7C", hex(SG->vtab, 2));
    status(F("GLOBAL · %s", song->name[0] ? song->name : "NONAME"), F("%s %d/3", TB[g], g + 1), Ccyan);
    for (j = 0; j < 3; j++) { int x = j * 80, on = g == j; rect(x, 37, 79, 10, on ? Ccyan : Cbar); txt(TB[j], x + 4, 39, on ? Cbg : Cgrey, 8); }
    if (g == 2) {
        int o2 = SG->opl == 2;
        const char *t = "K2 PICK · K3 ON/OFF";
        rect(1, 49, 238, 82, Cbar); txt("4OP PAIRS (OPL3)", 5, 52, Cgrey, 8); txt(t, 236 - tw(t, 1), 52, Cdim, 8);
        for (p = 0; p < 6; p++) {
            int x = 5 + (p % 3) * 77, y = 64 + (p / 3) * 22, on = !o2 && (SG->four >> p & 1);
            rect(x, y, 72, 18, on ? Cmag : Cline); txt(F("%s+%s", dec2(HI4[p] + 1), dec2(HI4[p] + 2)), x + 5, y + 6, on ? Cbg : Cdim, 8); txt(on ? "4OP" : "2OP", x + 48, y + 6, on ? Cbg : Cdim, 8);
            if (p == st.p4) frameRect(x - 2, y - 2, 76, 22, Cwhite);
        }
        txt(o2 ? "NOT AVAILABLE IN OPL2" : "NOTES GO ON THE FIRST TRACK OF A PAIR", 5, 112, o2 ? Cyellow : Cdim, 8); txt("ALGORITHM ON ENV PICKS A 4OP SOUND", 5, 122, Cdim, 8);
        rect(1, 134, 238, 60, Cpanel); txt("PERCUSSION (RHYTHM) MODE", 5, 137, Cgrey, 8); txt(SG->perc ? "ON" : "OFF", 236 - tw(SG->perc ? "ON" : "OFF", 1), 137, SG->perc ? Cgreen : Cdim, 8);
        for (k = 0; k < 5; k++) { int x = 5 + k * 47; rect(x, 149, 43, 18, SG->perc ? Cchsel : Cline); txt(DRN[k], x + 4, 152, SG->perc ? Cwhite : Cdim, 8); txt(F("%d", 16 + k), x + 4, 160, Cdim, 8); }
        txt(SG->perc ? "SEL ON PATTERN: DRUM VIEW LAST" : "TRACKS 16–20 BECOME DRUMS", 5, 172, Cdim, 8); txt(o2 ? "6 MELODIC + 5 DRUMS" : "15 MELODIC + 5 DRUMS", 5, 182, Cdim, 8);
        rect(1, 197, 238, 28, Cpanel); txt(F("MACRO SPEED ×%d", SG->mspd ? SG->mspd : 1), 5, 200, Cgrey, 8); txt("ARP · VIB · REG MACROS PER TICK", 5, 211, Cdim, 8);
        return;
    }
    if (g == 0) {
        /* tick = 2500 / bpm ms, a row tick * speed: all of it as exact fractions */
        int bpm = SG->bpm, spd = SG->speed, secs = rdiv(NORD * ROWS * spd * 5, bpm * 2);
        const char *L[5], *V[5];
        L[0] = "TICK"; V[0] = F("%s MS (%d HZ)", fix1(2500, bpm), rdiv(2 * bpm, 5));
        L[1] = "ROW"; V[1] = F("%d MS · %d TICKS", rdiv(2500 * spd, bpm), spd);
        L[2] = "PATTERN"; V[2] = F("%s S · %d ROWS", fix1(ROWS * spd * 5, bpm * 2), ROWS);
        L[3] = "SONG"; V[3] = F("%d:%s · %d POSITIONS", secs / 60, dec2(secs % 60), NORD);
        L[4] = "BEAT"; V[4] = F("%s BPM AT 4 ROWS", fix1(6 * bpm, spd));
        rect(1, 49, 238, 70, Cbar);
        for (k = 0; k < 5; k++) { txt(L[k], 5, 52 + k * 13, Cgrey, 8); txt(cut(V[k], 170), 64, 52 + k * 13, Cwhite, 8); }
        rect(1, 122, 238, 46, Cpanel); txt("GLOBAL VOLUME", 5, 126, Cgrey, 8); txt(F("%d", SG->gvol), 110, 126, Cyellow, 8); hbar(130, 127, 104, SG->gvol, 63, Cgreen);
        txt("START LEVEL. % AND &6–&B CHANGE IT", 5, 140, Cdim, 8); txt("WHILE THE SONG PLAYS.", 5, 150, Cdim, 8);
        rect(1, 171, 238, 54, Cpanel); txt("ROWS PER PATTERN", 5, 175, Cgrey, 8);
        for (k = 0; k < 8; k++) chip(5 + k * 29, 187, 26, F("%d", ROWOPT[k]), ROWS == ROWOPT[k], 0);
        txt("SHORTER CUTS ROWS: HOLD HOME", 5, 205, Cdim, 8); txt("F SPEED/BPM STILL WORKS IN SONGS", 5, 215, Cdim, 8);
    } else {
        int o3 = SG->opl != 2, hi = 0, w4 = 0, vsize, vfac, i, py = 0;
        static uint8_t VT[256];
        static const char *const L3[2][3] = {{"9 CHANNELS", "4 WAVEFORMS", "MONO"}, {"18 CHANNELS", "8 WAVEFORMS", "STEREO PAN"}};
        rect(1, 49, 238, 66, Cbar);
        for (k = 0; k < 2; k++) {
            int on = (k == 1) == o3, x = 5 + k * 117;
            rect(x, 52, 113, 58, on ? Cchsel : Cline);
            txt(k ? "OPL3" : "OPL2", x + 4, 55, on ? Cwhite : Cdim, 12);
            for (i = 0; i < 3; i++) txt(L3[k][i], x + 4, 74 + i * 11, on ? Ccyan : Cdim, 8);
        }
        txt("◄ K1", 5 + 117 - 26, 55, Cdim, 8); txt("K1 ►", 5 + 117 + 113 - 28, 55, Cdim, 8);
        if (!o3) { hi = hiNotes(); for (k = 0; k < NINS; k++) if (song->inst[k].op[0].ws > 3 || song->inst[k].op[1].ws > 3) w4 = 1; }
        if (!o3 && (hi || w4)) txt(hi ? "CH10–18 NOTES ARE SILENT" : "WAVES 4–7 PLAY AS 0–3", 5, 118, Cyellow, 8);
        rect(1, 130, 238, 26, Cpanel); txt("CHIP LFO", 5, 134, Cgrey, 8); txt(SG->lfo & 2 ? "AM 4.8 DB" : "AM 1.0 DB", 64, 134, Cwhite, 8); txt(SG->lfo & 1 ? "VIB 14 CENT" : "VIB 7 CENT", 150, 134, Cwhite, 8);
        txt("LFO BUTTON CYCLES BOTH", 5, 145, Cdim, 8);
        eng_vtab(SG->vtab, VT, &vsize, &vfac);
        rect(1, 159, 238, 68, Cpanel); txt(F("FX SHAPE %s%s · FOR 4XY MXY", hex(SG->vtab, 2), SG->vtab ? "" : " SINE"), 5, 162, Cgrey, 8);
        for (i = 0; i < 228; i++) {
            int p2 = i * 128 / 228, v = VT[p2 & (vsize - 1)] * (p2 & vsize ? 1 : -1), y = rdiv(194 * 255 - v * 26, 255);
            if (i) pline(5 + i, py, 6 + i, y, Cmag);
            py = y;
        }
        txt(F("×%d SPEED", vfac), 190, 162, Cdim, 8);
    }
}
static void drawAsk(void)
{
    int h = 64 + A.n * 11, k, y;
    rect(8, 60, 224, h, Cplay); frameRect(10, 62, 220, h - 4, Cwhite);
    ctxt(A.title, 120, 68, Cwhite, tw(A.title, 2) <= 210 ? 12 : 8);
    for (k = 0; k < A.n; k++) txt(cut(F("· %s", A.items[k]), 210), 16, 88 + k * 11, Cyellow, 8);
    y = 92 + A.n * 11;
    txt("OCT+", 16, y, Cwhite, 8); txt(A.yes, 46, y, Cgrey, 8); txt("OCT−", 16, y + 11, Cwhite, 8); txt(A.no, 46, y + 11, Cgrey, 8);
}
/* SYSTEM · CPU LOAD: the host's figures, read once a frame (ui_frame) while the menu is open */
static int cpuV = -1, cpuPk = -1, cpuN = 1;
static void drawMenu(void)
{
    int ix[NSET], n = menuRows(ix), r = ix[st.mrow], k;
    const char *v = sv(r);
    char *a = nb(), *b = nb();
    { const char *q = v; int m = 0, done = 0; while (*q) { if (*q == ' ' && !done) { done = 1; q++; continue; } a[m++] = *q++; } a[m] = 0; }
    { const char *q = SETDEF[r].opt[SETDEF[r].def]; int m = 0, done = 0; while (*q) { if (*q == ' ' && !done) { done = 1; q++; continue; } b[m++] = *q++; } b[m] = 0; }
    CARDS("SETTINGS", "ROW", "VALUE", "DEFAULT", TABAB[st.mtab], F("%d", st.mrow + 1), a, b);
    status(SETDEF[r].label, "HOME CLOSES", Ccyan);
    for (k = 0; k < 5; k++) { int x = k * 48, on = st.mtab == k; rect(x, 37, 47, 10, on ? Ccyan : Cbar); ctxt(TABAB[k], x + 24, 39, on ? Cbg : Cgrey, 8); }
    for (k = 0; k < n; k++) {
        int q = ix[k], y = 50 + k * 15, on = k == st.mrow;
        const char *val = q == S_INFO ? "FMY262 V0.8.1 · 44.1K" : q == S_CPU ? (cpuV >= 0 ? F("%d%% PK %d%% %dC", cpuV, cpuPk, cpuN) : "—") : sv(q);
        int dflt = q == S_CPU ? cpuV < 0 : q == S_INFO ? 0 : S[q] == SETDEF[q].def;   /* (the page: the value against its default's words) */
        rect(1, y, 238, 13, on ? Ccyan : Cbar); txt(SETDEF[q].label, 5, y + 3, on ? Cbg : Cwhite, 8);
        txt(val, 235 - tw(val, 1), y + 3, on ? Cbg : dflt ? Cgrey : Cyellow, 8);
        if (on && SETDEF[q].n > 1) txt("‹", 235 - tw(val, 1) - 10, y + 3, Cbg, 8);
    }
    foot(SETDEF[r].tip, Cdim);
}
static void drawSeq(void)
{
    int secs = rdiv(NORD * ROWS * SG->speed * 5, SG->bpm * 2), per = 44, start = st.ord / per * per, i, nu = 0, k;
    uint8_t seen[128];
    int o = song->order[st.ord];
    memset(seen, 0, sizeof seen);
    for (k = 0; k < NORD; k++) if (song->order[k] < 128 && !seen[song->order[k]]) { seen[song->order[k]] = 1; nu++; }
    CARDS("POS", "PATTERN", "LENGTH", "TIME", hex(st.ord, 2), o >= 128 ? F("J%s", hex(o - 128, 2)) : hex(o, 2), F("%d", NORD),
          secs >= 600 ? F("%dM", rdiv(secs, 60)) : F("%d:%s", secs / 60, dec2(secs % 60)));
    status(F("PATS %d · %d BPM SPD %d · %s", nu, SG->bpm, SG->speed, SG->opl == 2 ? "OPL2" : "OPL3"), st.playing ? "► PLAY" : "", Cgreen);
    for (i = 0; i < per && start + i < NORD; i++) {
        int n = start + i, x = 1 + (i % 4) * 60, y = 38 + (i / 4) * 16, on = n == st.ord, pl = st.playing && n == st.pord, v = song->order[n];
        rect(x, y, 58, 15, on ? Ccyan : Cbar); txt(hex(n, 2), x + 3, y + 4, on ? Cbg : Cdim, 8);
        txt(v >= 128 ? F("JMP %s", hex(v - 128, 2)) : F("PAT %s", hex(v, 2)), x + 20, y + 4, on ? Cbg : v >= 128 ? Cyellow : Cwhite, 8);
        if (pl) rect(x, y + 13, 58, 2, Cred);
    }
    foot("OCT+ INSERT · OCT− DELETE POSITION", Cwhite);
}
static void drawFile(void)
{
    int k, cur = st.slot, has = slotHas[st.fsel], mine = has && st.fsel == cur;
    const UiSlot *sl = &slots[st.fsel];
    static const char *const HL[6][2] = {{"SAVE", 0}, {"SEL", "LOAD"}, {"EDIT", "RENAME"}, {"OCT−", "DELETE (TWICE)"}, {"FX", "EXPORT → USB"}, {"ENV", "IMPORT FROM USB"}};
    CARDS("SLOT", "SONG", "PATTERNS", "SIZE", F("%d%s", st.fsel + 1, st.fsel == cur ? "●" : ""), has ? slice(sl->name[0] ? sl->name : "?", 4) : "—",
          has ? F("%d", sl->pats) : "—", has ? F("%dK", rdiv((int)sl->size, 1024)) : "—");
    status(!has ? "EMPTY · SAVE ASKS FOR A NAME" : mine && !st.dirty ? "THIS SONG · NO CHANGES" : mine ? "THIS SONG · CHANGED" : "ANOTHER SONG",
           !has ? "NEW" : mine && !st.dirty ? "SAVED" : "OVERWRITE", !has ? Cgreen : mine && !st.dirty ? Ccyan : Cred);
    for (k = 0; k < 4; k++) {
        int y = 38 + k * 30, on = k == st.fsel;
        rect(1, y, 238, 28, on ? Ccyan : Cbar); txt(F("%d", k + 1), 7, y + 7, on ? Cbg : Cyellow, 12);
        if (slotHas[k]) { txt(slots[k].name, 26, y + 3, on ? Cbg : Cwhite, 12); txt(F("%d POS · %d PAT", slots[k].len, slots[k].pats), 26, y + 19, on ? Cbg : Cgrey, 8); }
        else txt("— EMPTY —", 26, y + 10, on ? Cbg : Cdim, 8);
        if (k == cur) txt("●", 230, y + 3, on ? Cbg : Cgreen, 8);
    }
    rect(1, 160, 238, 66, Cline);
    for (k = 0; k < 6; k++) {
        const char *v = HL[k][1] ? HL[k][1] : !has ? "NAME → SAVE" : mine && !st.dirty ? "SAVE (NO CHANGES)" : "OVERWRITE (TWICE)";
        txt(HL[k][0], 5, 163 + k * 10, Cwhite, 8); txt(v, 41, 163 + k * 10, Cgrey, 8);
    }
    foot("OCT+ NEW SONG (TWICE) · OTHERS CANCEL", Cdim);
    if (owArmed()) {
        rect(14, 70, 212, 70, Cplay); frameRect(16, 72, 208, 66, Cwhite);
        ctxt("OVERWRITE?", 120, 78, Cwhite, 12);
        ctxt(cut(F("SLOT %d: %s → %s", st.fsel + 1, sl->name[0] ? sl->name : "?", song->name[0] ? song->name : "NONAME"), 196), 120, 99, Cyellow, 8);
        ctxt("SAVE AGAIN TO CONFIRM", 120, 115, Cwhite, 8); ctxt("ANY OTHER BUTTON CANCELS", 120, 125, Cwhite, 8);
    }
}
static void drawAbout(void)
{
    uint16_t bg = c565(DOS_RGB[D_BG]), ln = c565(DOS_RGB[D_LINE]), ti = c565(DOS_RGB[D_TITLE]), tx = c565(DOS_RGB[D_TEXT]),
             hi = c565(DOS_RGB[D_HI]), dm = c565(DOS_RGB[D_DIM]);
    int P, i;
    const char *t;
    rect(0, 0, 240, 240, bg); frameRect(5, 5, 230, 230, ln); frameRect(8, 8, 224, 224, ln);
    if (about == 1 || ap == 0) {
        ctxt(ABOUT[0], 120, 62, ti, 28); ctxt(ABOUT[1], 120, 108, tx, 8); ctxt(ABOUT[2], 120, 124, hi, 8);
        if (about == 2) ctxt(ABOUT[3], 120, 150, dm, 8);
        ctxt(about == 1 ? "PRESS ANY KEY" : "SEL: OPEN SOURCE · OTHERS: BACK", 120, 214, dm, 8);
        return;
    }
    P = ap - 1;
    t = " OPEN SOURCE ";
    rect(120 - rdiv(tw(t, 1), 2), 5, tw(t, 1), 7, bg); ctxt(t, 120, 5, ti, 8);
    for (i = 0; i < LPP && P + i < NLICS; i++) { const char *l = LICS[P + i]; txt(l, 14, 22 + i * 14, l[0] == ' ' ? dm : tx, 8); }
    {   /* the scroll bar: the shown lines out of all */
        int H = LPP * 14 - 4, bh = rdiv(H * (NLICS < LPP ? NLICS : LPP), NLICS), by;
        if (bh < 8) bh = 8;
        by = 20 + (aboutLast() > 1 ? rdiv((H - bh) * P, aboutLast() - 1) : 0);
        rect(224, 20, 2, H, bg); rect(224, by, 2, bh, ln);
    }
    ctxt("OCT+ DOWN · OCT− UP · ELSE CLOSE", 120, 220, dm, 8);
}
static int asleep(void)
{
    static const int MIN[5] = {0, 5, 15, 30, 60};
    int m = MIN[S[S_SLEEP]];
    return m && now - lastInput > (uint32_t)m * 60000u;
}
void ui_frame(void)
{
    int c;
    fixCh();
    scopeFetch();
    {   /* CLICK: the host told when it changes (ON, or REC while recording) */
        static int was = -1;
        int on = sis(S_CLICK, "ON") || (sis(S_CLICK, "REC") && st.rec), k = on * 4 + S[S_CLVL];
        if (k != was) { was = k; if (H.click) H.click(H.u, on, S[S_CLVL]); }
    }
    if (st.menu) { cpuV = H.cpu ? H.cpu(H.u, &cpuPk, &cpuN) : -1; if (cpuV < 0) cpuPk = -1; }
    for (c = 0; c < 18; c++) meter[c] *= 0.9f;
    if (st.page != helpPage) { helpPage = st.page; helpT = now; }
}
void ui_draw(uint16_t *px, int y0, int h)
{
    uint32_t t;
    fb = px; fy0 = y0; fh = h; bufi = 0;
    rect(0, 0, 240, 240, Cbg);
    if (asleep()) { rect(0, 0, 240, 240, 0); return; }
    if (about) drawAbout(); else if (st.menu) drawMenu(); else if (st.nw) drawName(); else if (st.page == P_GLO) drawGlo(); else if (st.page == P_PAT) drawPat();
    else if (st.page == P_INS) drawIns(); else if (st.page == P_MAC) drawMac(); else if (st.page == P_FILE) drawFile(); else drawSeq();
    t = now - st.msgT;
    if (st.msg[0] && t < 1000 && !about) { const char *m = cut(st.msg, 220); int w = tw(m, 1) + 12; rect(120 - rdiv(w, 2), 112, w, 15, Cgrey); ctxt(m, 120, 116, Cbar, 8); }
    if (st.ask && !about) drawAsk();
    if (sis(S_HELP, "ON") && !about && !st.menu && !st.nw && st.page != P_FILE && now - helpT < 1800) {
        const char *const *L = st.page == P_PAT ? HELP_PAT : st.page == P_INS ? HELP_INS : st.page == P_MAC ? HELP_MAC : st.page == P_SEQ ? HELP_SEQ : HELP_GLO;
        int i;
        rect(20, 150, 200, 40, Cpanel); frameRect(20, 150, 200, 40, Ccyan);
        for (i = 0; i < 3; i++) ctxt(L[i], 120, 155 + i * 11, i ? Cwhite : Cyellow, 8);
    }
}
uint32_t ui_leds(uint32_t rgb[UB_N])
{
    uint32_t m = 0;
#define LED(b, on, c) do { if (on) m |= 1u << (b); rgb[b] = (c); } while (0)
    LED(UB_HOME, st.shift || (st.page == P_PAT && (st.compact || st.scope)), st.shift ? 0xFFD34A : 0x4BE38A);
    LED(UB_REC, st.rec, 0xFF5A36);
    LED(UB_PLAY, st.playing, 0x4BE38A);
    LED(UB_SEQ, st.page == P_SEQ, 0x4BE38A);
    LED(UB_GLO, st.page == P_GLO || st.page == P_FILE, st.page == P_FILE ? 0xFFD34A : 0x4BE38A);
    LED(UB_ENV, st.page == P_INS, 0x4BE38A);
    LED(UB_SEL, st.page == P_INS && st.op == 1, 0x4BE38A);
    LED(UB_FX, st.page == P_PAT && st.field >= 2, st.field == 3 ? 0xFFD34A : 0x4BE38A);
    LED(UB_LFO, !!SG->lfo, 0x4BE38A);
    LED(UB_ARP, st.page == P_MAC, st.mk == MK_ARP ? 0xFFD34A : st.mk == MK_VIB ? 0xFF55FF : 0x55FFFF);
    LED(UB_SAVE, 0, 0xFFD34A);
    LED(UB_OCTDN, st.oct < 4, 0xFFD34A);
    LED(UB_OCTUP, st.oct > 4, 0xFFD34A);
    LED(UB_EDIT, 0, 0);
#undef LED
    return m;
}
