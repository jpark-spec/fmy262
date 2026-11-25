/* FMY262: the song slots in flash (slots.h) */
#include "slots.h"
#include <string.h>

/* the head (64 bytes at a region's start): "FMS1" (written last; zeroed = dead) | slot | 3 spare | seq | size | crc of
 * the song's bytes | the rest 0xFF */
#define MAGIC 0x31534D46u               /* "FMS1" */

uint32_t sl_crc(uint32_t crc, const uint8_t *p, uint32_t n)   /* CRC-32 (zlib's), a nibble at a time */
{
    static const uint32_t T[16] = {0x00000000, 0x1DB71064, 0x3B6E20C8, 0x26D930AC, 0x76DC4190, 0x6B6B51F4, 0x4DB26158,
                                   0x5005713C, 0xEDB88320, 0xF00F9344, 0xD6D6A3E8, 0xCB61B38C, 0x9B64C2B0, 0x86D3D2D4,
                                   0xA00AE278, 0xBDBDF21C};
    crc = ~crc;
    while (n--) { crc ^= *p++; crc = (crc >> 4) ^ T[crc & 15]; crc = (crc >> 4) ^ T[crc & 15]; }
    return ~crc;
}

static uint32_t rd32(const uint8_t *p) { return (uint32_t)p[0] | (uint32_t)p[1] << 8 | (uint32_t)p[2] << 16 | (uint32_t)p[3] << 24; }
static void put32(uint8_t *p, uint32_t v) { p[0] = (uint8_t)v; p[1] = (uint8_t)(v >> 8); p[2] = (uint8_t)(v >> 16); p[3] = (uint8_t)(v >> 24); }

/* a region's logical byte at off: its sector's first 3,840 bytes, sector after sector */
static uint32_t phys(const SlStore *t, int r, uint32_t off) { return t->base[r] + off / SL_USE * 4096u + off % SL_USE; }

typedef struct { const SlStore *t; int r; } Src;
static int get(void *u, uint32_t off, uint8_t *dst, uint32_t n)   /* the song's bytes (after the head) */
{
    const Src *s = (const Src *)u;
    off += SL_HEAD;
    while (n) {
        uint32_t k = SL_USE - off % SL_USE;
        const uint8_t *p = s->t->f.ptr(s->t->f.u, phys(s->t, s->r, off));
        if (k > n) k = n;
        if (!p) return -1;
        memcpy(dst, p, k);
        dst += k; off += k; n -= k;
    }
    return 0;
}

static uint32_t crcOf(const SlStore *t, int r, uint32_t size)
{
    Src s = {t, r};
    uint8_t b[64];
    uint32_t c = 0, o = 0;
    while (o < size) {
        uint32_t n = size - o < sizeof b ? size - o : sizeof b;
        if (get(&s, o, b, n)) return ~c;   /* (unreadable: never matches) */
        c = sl_crc(c, b, n); o += n;
    }
    return c;
}

/* region r's head, if it is a whole song: slot, seq, size */
static int head(const SlStore *t, int r, int *slot, uint32_t *seq, uint32_t *size)
{
    const uint8_t *h = t->f.ptr(t->f.u, t->base[r]);
    if (!h || rd32(h) != MAGIC || h[4] >= SL_SLOTS) return 0;
    *slot = h[4]; *seq = rd32(h + 8); *size = rd32(h + 12);
    if (*size > SL_ROOM || crcOf(t, r, *size) != rd32(h + 16)) return 0;
    return 1;
}

static void scan(SlStore *t)
{
    int r, k;
    uint32_t best[SL_SLOTS] = {0};
    for (k = 0; k < SL_SLOTS; k++) t->at[k] = -1;
    t->seq = 0;
    for (r = 0; r < SL_REGIONS; r++) {
        int slot;
        uint32_t seq, size;
        if (!head(t, r, &slot, &seq, &size)) continue;
        if (seq > t->seq) t->seq = seq;
        if (t->at[slot] < 0 || seq > best[slot]) { t->at[slot] = r; best[slot] = seq; }
    }
    for (k = 0; k < SL_SLOTS; k++) {
        SlInfo *I = &t->info[k];
        memset(I, 0, sizeof *I);
        if (t->at[k] < 0) continue;
        {
            Src s = {t, t->at[k]};
            const uint8_t *h = t->f.ptr(t->f.u, t->base[t->at[k]]);
            I->seq = rd32(h + 8); I->size = rd32(h + 12);
            if (sf_peek(get, &s, I->size, I->name, &I->pats, &I->len)) t->at[k] = -1;   /* (a song this firmware cannot read) */
        }
    }
}

void sl_init(SlStore *t, const SlFlash *f, const uint32_t base[SL_REGIONS])
{
    memset(t, 0, sizeof *t);
    t->f = *f;
    memcpy(t->base, base, sizeof t->base);
    scan(t);
}

int sl_info(const SlStore *t, int k, SlInfo *out)
{
    if (k < 0 || k >= SL_SLOTS || t->at[k] < 0) return 0;
    if (out) *out = t->info[k];
    return 1;
}

/* ---------------------------------------------------------- writing a region --- */
typedef struct {
    SlStore *t;
    int r, err;
    uint32_t off, crc;                  /* the next logical byte (from the head), the song's CRC so far */
    uint8_t buf[256];
    uint32_t k, b0;                     /* bytes buffered, from logical b0 */
    const uint8_t *name;                /* rename: these 20 bytes at the song's bytes 5..24 */
    uint32_t pos;                       /* the song's bytes given so far */
} Wr;

static void wflush(Wr *w)
{
    uint32_t o = w->b0, i = 0;
    while (i < w->k && !w->err) {
        uint32_t n = SL_USE - o % SL_USE;
        if (n > w->k - i) n = w->k - i;
        if (o % SL_USE == 0 && o && w->t->f.erase(w->t->f.u, phys(w->t, w->r, o))) w->err = 1;   /* a new sector */
        else if (w->t->f.write(w->t->f.u, phys(w->t, w->r, o), w->buf + i, n)) w->err = 1;
        o += n; i += n;
    }
    w->b0 = o; w->k = 0;
}

static void wout(void *u, const uint8_t *b, uint32_t n)
{
    Wr *w = (Wr *)u;
    while (n--) {
        uint8_t c = *b++;
        if (w->name && w->pos >= 5 && w->pos < 25) c = w->name[w->pos - 5];
        w->pos++;
        w->crc = sl_crc(w->crc, &c, 1);
        w->buf[w->k++] = c;
        if (w->k == sizeof w->buf) wflush(w);
    }
}

static int freeRegion(const SlStore *t)
{
    int i, k;
    for (i = 0; i < SL_REGIONS; i++) {
        int r = (t->next + i) % SL_REGIONS, used = 0;
        for (k = 0; k < SL_SLOTS; k++) used |= t->at[k] == r;
        if (!used) return r;
    }
    return -1;                          /* (cannot be: 5 regions, 4 slots) */
}

static void kill(SlStore *t, int r)     /* the head's magic zeroed: dead */
{
    uint8_t z[4] = {0, 0, 0, 0};       /* (in RAM: a flash write's source must be) */
    t->f.write(t->f.u, t->base[r], z, 4);
}

/* the new copy in region r is whole (size bytes, CRC crc): its head, then every older copy of slot k dead */
static int finish(SlStore *t, int k, int r, uint32_t size, uint32_t crc)
{
    uint8_t h[SL_HEAD];
    int i;
    if (crcOf(t, r, size) != crc) return -1;   /* read back: the flash holds it */
    memset(h, 0xFF, sizeof h);
    h[4] = (uint8_t)k; h[5] = h[6] = h[7] = 0;
    put32(h + 8, t->seq + 1); put32(h + 12, size); put32(h + 16, crc);
    if (t->f.write(t->f.u, t->base[r] + 4, h + 4, SL_HEAD - 4)) return -1;
    put32(h, MAGIC);
    if (t->f.write(t->f.u, t->base[r], h, 4)) return -1;   /* now it counts */
    for (i = 0; i < SL_REGIONS; i++) {
        int slot;
        uint32_t seq, sz;
        if (i != r && head(t, i, &slot, &seq, &sz) && slot == k) kill(t, i);
    }
    t->next = (r + 1) % SL_REGIONS;
    scan(t);
    return t->at[k] == r ? 0 : -1;
}

static void wstart(Wr *w, SlStore *t, int r)
{
    memset(w, 0, sizeof *w);
    w->t = t; w->r = r; w->off = SL_HEAD; w->b0 = SL_HEAD;
}

/* a song into slot k: from s (written by sf_write) or copied from region src under a new name */
static int store(SlStore *t, int k, const UiSong *s, int src, const char *name)
{
    Wr w;
    uint8_t nm[20];
    uint32_t size;
    int i, r = freeRegion(t);
    if (k < 0 || k >= SL_SLOTS || r < 0) return -1;
    size = s ? sf_write(s, 0, 0) : t->info[k].size;
    if (size > SL_ROOM) return -2;
    wstart(&w, t, r);
    if (name) { int e = 0; for (i = 0; i < 20; i++) { if (!e && !name[i]) e = 1; nm[i] = (uint8_t)(e ? 0 : name[i]); } w.name = nm; }
    if (t->f.erase(t->f.u, t->base[r])) return -1;
    if (s) sf_write(s, wout, &w);
    else {
        Src from = {t, src};
        uint8_t b[64];
        uint32_t o = 0;
        while (o < size && !w.err) {
            uint32_t n = size - o < sizeof b ? size - o : sizeof b;
            if (get(&from, o, b, n)) w.err = 1; else wout(&w, b, n);
            o += n;
        }
    }
    wflush(&w);
    if (w.err || w.pos != size) return -1;
    return finish(t, k, r, size, w.crc);
}

/* ------------------------------------------------- a song file coming in pieces (USB) --- */
static Wr in;
static int inK = -1;
static uint32_t inSize;

int sl_wbegin(SlStore *t, int k, uint32_t size)
{
    int r = freeRegion(t);
    inK = -1;
    if (k < 0 || k >= SL_SLOTS || r < 0) return -1;
    if (!size || size > SL_ROOM) return -2;
    wstart(&in, t, r);
    if (t->f.erase(t->f.u, t->base[r])) return -1;
    inK = k; inSize = size;
    return 0;
}

int sl_wdata(SlStore *t, uint32_t off, const uint8_t *src, uint32_t n)
{
    if (inK < 0 || in.t != t || off != in.pos || off + n > inSize) return -1;
    wout(&in, src, n);
    if (in.pos == inSize) wflush(&in);
    return in.err ? -1 : 0;
}

int sl_wcommit(SlStore *t, uint32_t crc)
{
    int k = inK, rc;
    Src s = {t, in.r};
    inK = -1;
    if (k < 0 || in.t != t) return -1;
    wflush(&in);
    if (in.err || in.pos != inSize || in.crc != crc) return -1;
    if (sf_peek(get, &s, inSize, 0, 0, 0)) return -3;   /* not a song this firmware reads: the old copy stays */
    rc = finish(t, k, in.r, inSize, crc);
    return rc;
}

int sl_read(const SlStore *t, int k, uint32_t off, uint8_t *dst, uint32_t n)
{
    Src s;
    if (!sl_info(t, k, 0) || off > t->info[k].size || n > t->info[k].size - off) return -1;
    s.t = t; s.r = t->at[k];
    return get(&s, off, dst, n);
}

int sl_save(SlStore *t, int k, const UiSong *s) { return store(t, k, s, -1, 0); }

int sl_rename(SlStore *t, int k, const char *name)
{
    if (!sl_info(t, k, 0)) return -3;
    return store(t, k, 0, t->at[k], name);
}

int sl_load(SlStore *t, int k, UiSong *s)
{
    Src src;
    if (!sl_info(t, k, 0)) return -3;
    src.t = t; src.r = t->at[k];
    return sf_read(s, get, &src, t->info[k].size);
}

int sl_delete(SlStore *t, int k)
{
    int i;
    if (k < 0 || k >= SL_SLOTS) return -1;
    for (i = 0; i < SL_REGIONS; i++) {
        int slot;
        uint32_t seq, sz;
        if (head(t, i, &slot, &seq, &sz) && slot == k) kill(t, i);
    }
    scan(t);
    return t->at[k] < 0 ? 0 : -1;
}
