/* opl_compare.cpp's handle on Nuked OPL3 fast (its type names clash with Nuked's own) */
#include <stdlib.h>
#include "nuked_fast/nukedopl3_fast.h"
void *nf_new(int rate) { opl3_chip *c = calloc(1, sizeof *c); OPL3Fast_Reset(c, (uint32_t)rate); return c; }
void nf_write(void *c, uint16_t a, uint8_t v) { OPL3Fast_WriteReg((opl3_chip *)c, a, v); }
void nf_gen(void *c, int16_t *lr) { OPL3Fast_GenerateResampled((opl3_chip *)c, lr); }
