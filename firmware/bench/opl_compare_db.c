/* opl_compare.cpp's handle on DOSBox DBOPL in C (Chocolate Doom 2.0.0's conversion, vendor/dbopl-c) */
#include <stdlib.h>
#include <string.h>
#include "dbopl.h"
void Chip__GenerateBlock3(Chip *self, Bitu total, Bit32s *output);   /* (defined in dbopl.c, not declared in its header) */
typedef struct { Chip c; Bit32s buf[2 * 512]; } db_t;
void *db_new(int rate)
{
    db_t *d = calloc(1, sizeof *d);
    DBOPL_InitTables();
    Chip__Chip(&d->c);
    Chip__Setup(&d->c, (Bit32u)rate);
    return d;
}
void db_write(void *p, uint16_t a, uint8_t v) { Chip__WriteReg(&((db_t *)p)->c, a, v); }
void db_gen(void *p, int16_t *lr, int n)          /* n <= 512 */
{
    db_t *d = p;
    int i;
    Chip__GenerateBlock3(&d->c, (Bitu)n, d->buf);
    for (i = 0; i < 2 * n; i++) {
        Bit32s s = d->buf[i];
        lr[i] = (int16_t)(s < -32768 ? -32768 : s > 32767 ? 32767 : s);
    }
}
