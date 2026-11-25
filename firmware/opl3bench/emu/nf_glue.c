/* OPL3 BENCH: Nuked OPL3 fast (vendor/libADLMIDI/src/chips/nuked_fast, LGPL-2.1) behind three calls, in a unit of
 * its own (its type names are Nuked's own) */
#include "nukedopl3_fast.h"
#ifdef PLAT_HOST
static opl3_chip nf;
#else
static opl3_chip nf __attribute__((section(".pool")));   /* fm1-base's zeroed pool (plat.h PLAT_POOL) */
#endif
void nf_init(uint32_t rate) { OPL3Fast_Reset(&nf, rate); }
void nf_write(uint16_t reg, uint8_t v) { OPL3Fast_WriteReg(&nf, reg, v); }
void nf_render(int16_t *lr, uint32_t n)
{
    uint32_t i;
    for (i = 0; i < n; i++)
        OPL3Fast_GenerateResampled(&nf, lr + 2 * i);
}
