/* eng_host [-a] SONG SCRIPT: plays a song (tests/t42.cjs's binary form of it) through firmware/engine as the script
 * says, and prints every register write and every row as tests/t42.cjs's JavaScript side prints them:
 *   "W <sample> <reg hex> <value hex>", "P <ord> <row> <trig bits hex>".
 * -a: the song's patterns and macros loaded into firmware/engine/songmem.c's arena first, played from there (its
 * size on stderr).
 * eng_host -f FMY SCRIPT (built with -DENG_FMY and firmware/ui's songfile.c, uisong.c): the song from an FMY1 file
 * (firmware/ui/songfile.h) through sf_read, played from its arena; with FMY_OUT=path, sf_write's bytes of it there.
 * Script lines: song | play ORD ROW LOOP | stop | render N | on C INST NOTE | off C | mute MASK | tune CENTS */
#include "eng.h"
#include "songmem.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifdef ENG_FMY
#include "songfile.h"
static const uint8_t *fmy; static uint32_t fmyn;
static int fget(void *u, uint32_t off, uint8_t *d, uint32_t n) { (void)u; if (off > fmyn || n > fmyn - off) return -1; memcpy(d, fmy + off, n); return 0; }
static void fput(void *u, const uint8_t *b, uint32_t n) { fwrite(b, 1, n, (FILE *)u); }
#endif

static uint8_t *buf;
static size_t at, len;
static int u8(void) { if (at >= len) { fprintf(stderr, "song file short\n"); exit(2); } return buf[at++]; }
static int s8(void) { return (int8_t)u8(); }
static int u16(void) { int a = u8(); return a | u8() << 8; }

typedef struct { uint16_t npat; uint8_t *have; EngCell **cells; } Pats;
static Pats P;

static int cell(const EngSong *s, int pat, int row, int track, EngCell *out)
{
    (void)s;
    if (pat < 0 || pat >= P.npat || !P.have[pat]) return 0;
    *out = P.cells[pat][row * ENG_TRACKS + track];
    return 1;
}

static uint64_t sample;
static void wr(void *u, uint16_t r, uint8_t v) { (void)u; printf("W %llu %x %x\n", (unsigned long long)sample, r, v); }
static void pos(void *u, int ord, int row, uint32_t trig) { (void)u; printf("P %d %d %x\n", ord, row, (unsigned)trig); }
static void chip(void *u, int16_t *lr, uint32_t n) { (void)u; memset(lr, 0, 4 * n); sample += n; }

int main(int argc, char **argv)
{
    static EngSong S;
    static Eng E;
    static int16_t lr[2 * 4096];
    FILE *f;
    char line[256];
    int i, j, k;
    EngSong *song = &S;
    int arena = argc > 1 && !strcmp(argv[1], "-a"), fm = argc > 1 && !strcmp(argv[1], "-f");
    if (arena || fm) { argv++; argc--; }
    if (argc < 3) { fprintf(stderr, "usage: eng_host [-a] SONG SCRIPT\n"); return 2; }
    f = fopen(argv[1], "rb");
    if (!f) { perror(argv[1]); return 2; }
    fseek(f, 0, SEEK_END); len = (size_t)ftell(f); fseek(f, 0, SEEK_SET);
    buf = malloc(len);
    if (fread(buf, 1, len, f) != len) return 2;
    fclose(f);
#ifdef ENG_FMY
    if (fm) {
        static UiSong U;
        static uint32_t umem[3 << 16];
        int rc;
        us_init(&U, umem, sizeof umem);
        fmy = buf; fmyn = (uint32_t)len;
        rc = sf_read(&U, fget, 0, fmyn);
        if (rc) { fprintf(stderr, "sf_read %d\n", rc); return 3; }
        if (getenv("FMY_OUT")) { FILE *o = fopen(getenv("FMY_OUT"), "wb"); sf_write(&U, fput, o); fclose(o); }
        song = &U.e;
        goto play;
    }
#else
    (void)fm;
#endif
    if (u8() != 'E' || u8() != 'N' || u8() != 'G' || u8() != '1') { fprintf(stderr, "not ENG1\n"); return 2; }
    S.rows = (uint16_t)u16(); S.bpm = (uint8_t)u8(); S.speed = (uint8_t)u8(); S.lfo = (uint8_t)u8(); S.opl = (uint8_t)u8();
    S.perc = (uint8_t)u8(); S.four = (uint8_t)u8(); S.gvol = (uint8_t)u8(); S.vtab = (uint8_t)u8(); S.mspd = (uint8_t)u8(); S.vdir = (uint8_t)u8();
    S.norder = (uint16_t)u16();
    {
        uint8_t *o = malloc(S.norder + 1);
        for (i = 0; i < S.norder; i++) o[i] = (uint8_t)u8();
        S.order = o;
    }
    P.npat = (uint16_t)u16();
    P.have = calloc(P.npat + 1, 1); P.cells = calloc(P.npat + 1, sizeof *P.cells);
    for (i = 0; i < P.npat; i++) {
        if (!(P.have[i] = (uint8_t)u8())) continue;
        P.cells[i] = malloc(sizeof(EngCell) * S.rows * ENG_TRACKS);
        for (j = 0; j < S.rows * ENG_TRACKS; j++) {
            EngCell *c = &P.cells[i][j];
            c->note = (int8_t)s8(); c->ins = (uint8_t)u8(); c->fx[0] = (int8_t)s8(); c->v[0] = (uint8_t)u8();
            c->fx[1] = (int8_t)s8(); c->v[1] = (uint8_t)u8();
        }
    }
    S.ninst = (uint16_t)u16();
    {
        EngIns *in = calloc(S.ninst + 1, sizeof *in);
        for (i = 0; i < S.ninst; i++) {
            EngIns *n = &in[i];
            for (j = 0; j < 2; j++) {
                EngOp *o = &n->op[j];
                o->am = (uint8_t)u8(); o->vib = (uint8_t)u8(); o->egt = (uint8_t)u8(); o->ksr = (uint8_t)u8();
                o->mult = (uint8_t)u8(); o->ksl = (uint8_t)u8(); o->tl = (uint8_t)u8(); o->ar = (uint8_t)u8();
                o->dr = (uint8_t)u8(); o->sl = (uint8_t)u8(); o->rr = (uint8_t)u8(); o->ws = (uint8_t)u8();
            }
            n->fb = (uint8_t)u8(); n->con = (uint8_t)u8(); n->pan = (uint8_t)u8(); n->ft = (int8_t)s8();
            n->arpT = (uint8_t)u8(); n->vibT = (uint8_t)u8(); n->four = (uint8_t)u8();
            if (u8()) {
                EngFmm *m = calloc(1, sizeof *m);
                EngFmStep *st;
                m->len = (uint8_t)u8(); m->lb = (uint8_t)u8(); m->ll = (uint8_t)u8(); m->ko = (uint8_t)u8();
                for (j = 0; j < 28; j++) m->dis[j] = (uint8_t)u8();
                st = calloc(m->len + 1u, sizeof *st);
                for (j = 0; j < m->len; j++) {
                    for (k = 0; k < 11; k++) st[j].d[k] = (uint8_t)u8();
                    st[j].fs = (int16_t)u16(); st[j].pan = (uint8_t)u8(); st[j].dur = (uint8_t)u8();
                }
                m->steps = st; n->fmm = m;
            }
        }
        S.inst = in;
    }
    for (i = 0; i < 32; i++) {
        EngTab *t = i < 16 ? &S.arp[i] : &S.vib[i - 16];
        t->len = (uint8_t)u8(); t->spd = (uint8_t)u8(); t->loop = (int8_t)s8(); t->delay = (uint8_t)u8();
        for (j = 0; j < 16; j++) t->data[j] = (int8_t)s8();
    }
    S.cell = cell;
    if (arena) {                         /* the same song from the arena */
        static SmArena A;
        static EngFmm fm[SM_FMMS];
        static uint32_t mem[3 << 16];    /* 768 KB: room for any song the test makes */
        EngIns *in = (EngIns *)(void *)S.inst;
        EngCell row[ENG_TRACKS];
        int p, r, t;
        sm_init(&A, mem, sizeof mem, S.rows, fm);
        for (p = 0; p < P.npat && p < SM_PATS; p++) {
            if (!P.have[p]) continue;
            if (sm_new(&A, p)) { fprintf(stderr, "arena full\n"); return 3; }
            for (r = 0; r < S.rows; r++) {
                for (t = 0; t < ENG_TRACKS; t++) row[t] = P.cells[p][r * ENG_TRACKS + t];
                if (sm_set_row(&A, p, r, row)) { fprintf(stderr, "arena full\n"); return 3; }
            }
        }
        for (i = 0; i < S.ninst && i < SM_FMMS; i++)
            if (in[i].fmm) {
                fm[i] = *in[i].fmm;
                if (sm_fmm(&A, i + 1, in[i].fmm->steps, in[i].fmm->len)) { fprintf(stderr, "arena full\n"); return 3; }
                in[i].fmm = &fm[i];
            }
        fprintf(stderr, "arena %u bytes\n", (unsigned)(sizeof mem - sm_free(&A)));
        S.cell = sm_cell; S.user = &A;
    }

#ifdef ENG_FMY
play:
#endif
    eng_init(&E, 44100, wr, 0);
    E.pos = pos; E.chip = chip;
    f = fopen(argv[2], "r");
    if (!f) { perror(argv[2]); return 2; }
    while (fgets(line, sizeof line, f)) {
        int a, b, c;
        unsigned m;
        if (!strncmp(line, "song", 4)) eng_song(&E, song);
        else if (sscanf(line, "play %d %d %d", &a, &b, &c) == 3) eng_play(&E, a, b, c);
        else if (!strncmp(line, "stop", 4)) eng_stop(&E);
        else if (sscanf(line, "render %d", &a) == 1)
            while (a > 0) { int n = a < 256 ? a : 256; eng_render(&E, lr, (uint32_t)n); a -= n; }
        else if (sscanf(line, "on %d %d %d", &a, &b, &c) == 3) eng_on(&E, a, b, c, 0);
        else if (sscanf(line, "off %d", &a) == 1) eng_off(&E, a);
        else if (sscanf(line, "mute %x", &m) == 1) eng_mute(&E, m);
        else if (sscanf(line, "tune %d", &a) == 1) eng_tune(&E, a);
    }
    fclose(f);
    return 0;
}
