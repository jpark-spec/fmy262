/* FMY262: the four song slots in flash. Five regions of 16 sectors (4 KiB) take turns: a save goes to a region no
 * slot is using, its head written last, and only then is the slot's old copy marked dead, so a power cut during a
 * save leaves the old song. Each sector's bytes 0xF00..0xFFF stay erased (the update loader looks there for its record
 * in the XDATA windows): 3,840 bytes a sector, 61,376 for a song after the 64-byte head.
 * Platform-free: the flash is three functions (the FM-1's plat_data_*, a RAM model in the tests). Main loop only. */
#ifndef SLOTS_H
#define SLOTS_H
#include "songfile.h"

#define SL_SLOTS 4
#define SL_REGIONS 5
#define SL_SECTS 16                     /* sectors a region */
#define SL_USE 3840u                    /* bytes used of each 4 KiB sector */
#define SL_HEAD 64u
#define SL_ROOM (SL_SECTS * SL_USE - SL_HEAD)

typedef struct {
    int (*erase)(void *u, uint32_t off);                          /* the 4 KiB sector at off: 0 = done */
    int (*write)(void *u, uint32_t off, const void *src, uint32_t n);   /* src in RAM; bits 1 -> 0 only: 0 = done */
    const uint8_t *(*ptr)(void *u, uint32_t off);                 /* read in place */
    void *u;
} SlFlash;

typedef struct { char name[21]; int pats, len; uint32_t size, seq; } SlInfo;

typedef struct {
    SlFlash f;
    uint32_t base[SL_REGIONS];
    int at[SL_SLOTS];                   /* the region with slot k's song, -1 none */
    SlInfo info[SL_SLOTS];
    uint32_t seq;                       /* the newest save's */
    int next;                           /* where the next save starts looking */
} SlStore;

/* the regions' flash offsets (4 KiB aligned): what they hold, read */
void sl_init(SlStore *t, const SlFlash *f, const uint32_t base[SL_REGIONS]);
int sl_info(const SlStore *t, int k, SlInfo *out);   /* 1 = slot k holds a song */
/* 0 = saved (name: the song's name in the slot, 0 = its own); -1 flash error (the old copy kept); -2 too big */
int sl_save(SlStore *t, int k, const UiSong *s);
int sl_load(SlStore *t, int k, UiSong *s);           /* sf_read's; -3 empty */
int sl_delete(SlStore *t, int k);                    /* 0 = gone (or was) */
int sl_rename(SlStore *t, int k, const char *name);  /* the song in slot k saved again under name: sl_save's */
/* a song file coming in pieces (USB): begin with its size (0 ready, -2 too big), the bytes in order, commit with its
 * CRC-32: 0 = slot k holds it now; -1 a flash error / a gap / a CRC mismatch, -3 not a song file: the old copy kept */
int sl_wbegin(SlStore *t, int k, uint32_t size);
int sl_wdata(SlStore *t, uint32_t off, const uint8_t *src, uint32_t n);
int sl_wcommit(SlStore *t, uint32_t crc);
int sl_read(const SlStore *t, int k, uint32_t off, uint8_t *dst, uint32_t n);   /* slot k's song file: 0 = read */
uint32_t sl_crc(uint32_t crc, const uint8_t *p, uint32_t n);
#endif
