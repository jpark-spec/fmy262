/* FM-1 OPL3 tracker: a song built into the firmware (tools/song2c.cjs writes them: firmware/player/songs.h),
 * read into the arena and RAM by whoever plays or edits it */
#ifndef PSONG_H
#define PSONG_H
#include "eng.h"
typedef struct { uint8_t track; EngCell c; } PCell;
typedef struct {
    uint16_t rows;
    uint8_t bpm, speed, lfo, opl, perc, four, gvol, vtab, mspd;
    uint16_t norder;
    const uint8_t *order;
    uint16_t ninst;
    const EngIns *inst;
} PHead;
typedef struct {
    const char *name;
    const PCell *cells;                  /* the cells holding something, row by row */
    const uint16_t *const *rows;         /* per pattern (0: none): rows + 1 indices into cells */
    uint16_t npat;
    PHead h;
    const EngTab *arp, *vib;
    const char *const *iname;            /* the instruments' names (h.ninst) */
    const char *const *aname, *const *vname;   /* the tables' (16 each) */
} PSong;
#endif
