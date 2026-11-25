/* FMY262: a song as a file ("FMY1"), for the song slots and (later) USB. Little-endian bytes, the patterns without
 * their empty cells:
 *   "FMY1" u8 version(1) | name 20 | u16 rows | bpm speed lfo opl perc four gvol vtab mspd | u16 norder | order[norder]
 *   arp[16] vib[16]: len spd delay loop data[16] | their names [2][16] 11 each
 *   u8 ninst, each: op[2] (am vib egt ksr mult ksl tl ar dr sl rr ws) fb con pan ft arpT vibT four | name 11 |
 *     u8 macro (0/1), then len lb ll ko dis[28] and len steps (d[11] fs(i16) pan dur)
 *   u8 npatterns, each: u8 pattern | u16 cells | cells: u8 row, u8 track | 32 note+ins | 64 fx1 | 128 fx2, then
 *     what it has: note(i8) ins | fx1 v1 | fx2 v2
 * The writer is given its bytes in order (once to count them, once to keep them); the reader takes them from a
 * function (the flash, a file), so a song is never in RAM twice. */
#ifndef SONGFILE_H
#define SONGFILE_H
#include "uisong.h"

#define SF_MAGIC "FMY1"
/* the song in bytes, given to out (u its own) in pieces in order: the total */
uint32_t sf_write(const UiSong *s, void (*out)(void *u, const uint8_t *b, uint32_t n), void *u);
/* get(u, off, dst, n): n bytes from off, 0 = there */
typedef int (*sf_get)(void *u, uint32_t off, uint8_t *dst, uint32_t n);
/* a song from size bytes: 0 = read (into s); -1 = not a song / damaged (s untouched: checked first); -2 = it did
 * not fit the arena (s holds as much as fitted) */
int sf_read(UiSong *s, sf_get get, void *u, uint32_t size);
/* its name (21 bytes) and counts, from the file's head: 0 = a song */
int sf_peek(sf_get get, void *u, uint32_t size, char name[21], int *patterns, int *positions);
#endif
