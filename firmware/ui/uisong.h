/* FM-1 OPL3 tracker: the song being edited. The engine plays it as it is (UiSong.e points into it); the screen
 * (ui.c) changes it. Patterns and FM macro steps are in the song arena (firmware/engine/songmem.c), the rest in
 * plain arrays. */
#ifndef UISONG_H
#define UISONG_H
#include "eng.h"
#include "songmem.h"
#include "psong.h"

#define UI_NAME 12                     /* 11 characters and the 0 */
#define UI_ORDERS 128

typedef struct {
    EngSong e;                         /* the engine's view: order, inst point here, cell reads the arena */
    SmArena a;
    uint8_t order[UI_ORDERS];
    EngIns inst[255];
    EngFmm fmm[SM_FMMS];               /* instrument k's macro: inst[k].fmm = &fmm[k] when it has one */
    char iname[255][UI_NAME];
    char tname[2][16][UI_NAME];        /* the arp and vib tables' names */
    char name[UI_NAME + 9];            /* the song's (20) */
} UiSong;

/* an empty song in mem (cap bytes, 4-aligned) */
void us_init(UiSong *s, void *mem, uint32_t cap);
/* empty again (its arena kept), rows a pattern */
void us_begin(UiSong *s, int rows);
/* a built-in song: 0, or the cells that did not fit */
int us_load(UiSong *s, const PSong *P);

/* cells: an empty one where none; us_put 0, or -1 when the arena is full (nothing changed) */
void us_get(const UiSong *s, int pat, int row, int track, EngCell *c);
int us_put(UiSong *s, int pat, int row, int track, const EngCell *c);
int us_empty(const EngCell *c);
extern const EngCell US_EMPTY;

/* instrument k (1..ninst) gets an FM macro (none: an empty one, len 0): its steps are the arena's */
EngFmm *us_fmm(UiSong *s, int k, int make);
/* its steps replaced by n of st (st may be its own steps); 0, -1 full */
int us_fmm_set(UiSong *s, int k, const EngFmStep *st, int n);
void us_fmm_clear(UiSong *s, int k);
/* an instrument inserted before k (1..ninst+1) as a copy of src, or deleted: macro objects and names move with them
 * (patterns are the caller's to renumber); 0, -1 no room */
int us_ins_insert(UiSong *s, int k, const EngIns *src, const char *name);
void us_ins_delete(UiSong *s, int k);
/* every pattern to rows (16..256): 0, -1 full */
int us_rows(UiSong *s, int rows);
#endif
