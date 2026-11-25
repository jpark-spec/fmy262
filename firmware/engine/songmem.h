/* FM-1 OPL3 tracker: a song's patterns and FM register macro steps in one byte arena, cells that hold nothing left
 * out. The device has no external RAM: 96 KB of .data/.bss and a 336 KB pool, where a full song (128 patterns of 256
 * rows of 20 tracks, 3.9 MB as web/ keeps it) can't go.
 *
 * The arena holds its objects (patterns 0..127, then the macro steps of instruments 1..255) in index order with one
 * gap: an object grows or shrinks at the gap, which first moves next to it (a memmove of the objects in between), so
 * edits in one place cost a memmove of that object's tail only. Objects start on 4-byte boundaries.
 *
 * A pattern: uint16 rs[rows + 1] (row r's cells at rs[r] .. rs[r + 1], from the pattern's start), then the cells,
 * each a byte and what it says is there:
 *   bits 0-4 track (0..19), bit 5 note and instrument (2 bytes), bit 6 effect 1 (2), bit 7 effect 2 (2)
 * so a note with its instrument takes 3 bytes, a full cell 7. Cells of a row are in track order; an effect that is
 * none (-1) takes its value with it (0).
 *
 * Nothing here locks: on the device the arena is the audio interrupt's (the engine reads it through sm_cell), so an
 * edit from the main loop goes under plat_lock. Its memmoves are at most the arena's size. */
#ifndef SONGMEM_H
#define SONGMEM_H
#include "eng.h"

#define SM_PATS 128
#define SM_FMMS 255
#define SM_OBJS (SM_PATS + SM_FMMS)

typedef struct {
    uint8_t *mem;
    uint32_t cap;                      /* bytes (a multiple of 4) */
    uint32_t off[SM_OBJS];             /* each object's place in mem */
    uint32_t len[SM_OBJS];             /* its bytes, a multiple of 4 (0: none) */
    uint32_t used;                     /* the objects' bytes in all */
    int gap;                           /* the gap lies after object gap (-1: before object 0) */
    uint16_t rows;                     /* every pattern's rows */
    EngFmm *fmm;                       /* SM_FMMS of them, or NULL: their steps pointers kept on the arena */
} SmArena;

/* mem: cap bytes (4-aligned); no patterns, no macros */
void sm_init(SmArena *a, void *mem, uint32_t cap, int rows, EngFmm *fmm);

int sm_has(const SmArena *a, int pat);                     /* pattern pat exists */
/* the cell: 1, or 0 if the pattern doesn't exist (*out then untouched) */
int sm_get(const SmArena *a, int pat, int row, int track, EngCell *out);
/* a row's 20 cells: 1, or 0 if the pattern doesn't exist */
int sm_row(const SmArena *a, int pat, int row, EngCell out[ENG_TRACKS]);

/* the edits: 0, or -1 when the arena is full (nothing changed) */
int sm_new(SmArena *a, int pat);                           /* pattern pat, empty (one there already: kept) */
void sm_del(SmArena *a, int pat);                          /* pattern pat gone */
int sm_set(SmArena *a, int pat, int row, int track, const EngCell *c);   /* the pattern made if none */
int sm_set_row(SmArena *a, int pat, int row, const EngCell c[ENG_TRACKS]);
int sm_rows(SmArena *a, int rows);                         /* every pattern to rows (16..256): rows cut or added empty */
int sm_fmm(SmArena *a, int ins, const EngFmStep *st, int n);   /* instrument ins (1..255)'s macro steps (n 0: none) */

uint32_t sm_free(const SmArena *a);                        /* bytes left */
uint32_t sm_bytes(const SmArena *a, int obj);              /* an object's bytes */

/* EngSong.cell over the arena (EngSong.user = the arena) */
int sm_cell(const EngSong *s, int pat, int row, int track, EngCell *out);

#endif
