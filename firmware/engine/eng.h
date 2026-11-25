/* FM-1 OPL3 tracker: the playback engine, web/engine.js in C. Same register writes in the same order at the same
 * sample, for the same song and messages (tests/t42.cjs compares the two).
 *
 * Plays a song through a register-write callback; the OPL emulator and the memory the song lives in are the
 * caller's. Pattern cells are read through EngSong.cell, so the storage of the patterns is the caller's too.
 *
 * Numbers: built with ENG_EXACT (host verification) the pitch math is double and libm's, as JavaScript's;
 * without it (the device: a single-precision FPU, no soft double) float and fm1-base's fastmath.h. The tick clock is
 * 32.32 fixed point in both, as in engine.js. */
#ifndef ENG_H
#define ENG_H
#include <stdint.h>

#ifdef ENG_EXACT
typedef double eng_real;
#else
typedef float eng_real;
#endif
typedef uint64_t eng_clock;            /* samples, 32.32 (engine.js the same, in a double) */

#define ENG_TRACKS 20

typedef struct { uint8_t am, vib, egt, ksr, mult, ksl, tl, ar, dr, sl, rr, ws; } EngOp;

typedef struct {                       /* FM register macro step (AT2 tREGISTER_TABLE_DEF) */
    uint8_t d[11];                     /* the instrument's 11 register bytes (demo.js insBytes) */
    int16_t fs;                        /* frequency slide */
    uint8_t pan, dur;
} EngFmStep;

typedef struct {
    uint8_t len, lb, ll, ko;           /* steps, loop begin, loop length, key-off position */
    uint8_t dis[28];                   /* columns switched off */
    const EngFmStep *steps;            /* len of them */
} EngFmm;

typedef struct {
    EngOp op[2];                       /* modulator, carrier */
    uint8_t fb, con, pan;              /* pan 0 L, 1 C, 2 R */
    int8_t ft;                         /* cents */
    uint8_t arpT, vibT;                /* macro tables, 1..16 (0 none) */
    uint8_t four;                      /* the first instrument of a 4-op pair */
    const EngFmm *fmm;                 /* NULL: none */
} EngIns;

typedef struct { uint8_t len, spd, delay; int8_t loop; int8_t data[16]; } EngTab;

typedef struct { int8_t note; uint8_t ins; int8_t fx[2]; uint8_t v[2]; } EngCell;   /* note -1 none, -2 key off; fx -1 none */

typedef struct EngSong {
    uint16_t rows;                     /* 16..256 */
    uint8_t bpm, speed, lfo, opl, perc, four, gvol, vtab, mspd;
    uint16_t norder;
    const uint8_t *order;              /* 0..7F pattern, 80h+n jump to position n */
    uint16_t ninst;
    const EngIns *inst;
    EngTab arp[16], vib[16];
    /* the cell at (pattern, row, track) into *out: 0 if that pattern is none */
    int (*cell)(const struct EngSong *s, int pat, int row, int track, EngCell *out);
    const void *user;
    uint8_t vdir;                      /* 1: AT2 volume scaling off (the volume is the operator level itself) */
} EngSong;

typedef struct { uint8_t on; uint16_t ord, row; uint8_t n; } EngLoop;   /* one Z C/D loop counter (engine.js s.lc) */
#define ENG_LOOPS 8

typedef struct {
    int16_t inst;
    eng_real pitch, vibo, vbase;   /* vbase: the vibrato table's base pitch (AT2 vib_freq) */
    int16_t base, vol, mvol;
    uint8_t ne, ef[2], ev[2];          /* this row's effects (engine.js s.e) */
    uint8_t on, pend, mute, own, kol, zero, vlock, plock, tmute, fineV, fineT, had, fch;   /* fch: an effect changed the pitch */
    uint16_t fn;
    uint8_t blk;
    const EngIns *patch;               /* NULL, &copy (own) or a caller's preview patch */
    EngIns copy;
    int16_t fxo, tro, as, a1, a2, fsl, pspd, ptgt;   /* ptgt -1: none */
    int16_t vspd, vdep, vpos, tspd, tdep, tpos, rtc, trp, ftn;
    int32_t mp, md;
    int16_t nd, ndn, nc, ls, panOv, vst, arpOv, vibOv, ap, ac, vp, vc, vd;
    EngLoop lc[ENG_LOOPS];
} EngCh;

typedef struct Eng {
    uint32_t sr;
    void (*w)(void *u, uint16_t reg, uint8_t v);              /* an OPL register write */
    void (*pos)(void *u, int ord, int row, uint32_t trig);    /* a row played; trig: tracks triggered (bits) */
    void (*chip)(void *u, int16_t *lr, uint32_t n);           /* render n stereo samples of the chip */
    void *u;
    const EngSong *song;
    EngCh ch[ENG_TRACKS];
    uint8_t bd, perc, f4, opl3, playing, loop;
    int ord, row, tick, speed, bpm, extra, gvol, tune, vsize, vfac;
    uint32_t xf;
    eng_clock acc, spt;
    int jump, brk, loopTo;
    int8_t gsl_d[ENG_TRACKS];          /* global slide per track: direction (0 none), value */
    uint8_t gsl_v[ENG_TRACKS];
    int8_t pmap[ENG_TRACKS];           /* 4-op preview moved to track 14 (-1 none) */
    uint8_t VT[256];
} Eng;

void eng_init(Eng *e, uint32_t sr, void (*w)(void *, uint16_t, uint8_t), void *u);
/* the messages of engine.js handle() */
void eng_song(Eng *e, const EngSong *s);
void eng_tune(Eng *e, int cents);
void eng_play(Eng *e, int ord, int row, int loop);
void eng_stop(Eng *e);
void eng_on(Eng *e, int c, int inst, int note, const EngIns *patch);   /* patch NULL: the song's instrument */
void eng_off(Eng *e, int c);
void eng_mute(Eng *e, uint32_t mask);
int eng_track_chan(const Eng *e, int track);   /* track's OPL channel 0..17 (bank 1 = 9..17), -1 none: the waveform screen */
/* n samples: the engine's ticks and register writes 32 samples at a time, e->chip rendering between them */
void eng_render(Eng *e, int16_t *lr, uint32_t n);
/* the vibrato/tremolo shape table of GLOBAL's FX SHAPE v (engine.js speedTab): VT, its size and speed factor */
void eng_vtab(int v, uint8_t T[256], int *vsize, int *vfac);

#endif
