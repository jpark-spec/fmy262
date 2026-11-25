/* Makes dbopl_pre.h: the tables dbopl.c builds with doubles, and Chip__Setup's rate values, for the FM-1 (no
 * double-precision FPU). Host only:  cc -O2 -Iemu/dbopl tools/dbopl_gen.c -o /tmp/dbopl_gen && /tmp/dbopl_gen 44100 > emu/dbopl/dbopl_pre.h  (in firmware/opl3bench) */
#include <stdio.h>
#include <stdlib.h>
#include "dbopl.c"
static void arr(const char *type, const char *name, const long *v, int n)
{
    int i;
    printf("static const %s %s[%d] = {", type, name, n);
    for (i = 0; i < n; i++)
        printf("%s%ld,", i % 12 ? " " : "\n    ", v[i]);
    printf("\n};\n");
}
int main(int argc, char **argv)
{
    static Chip c;
    static long v[8 * 512];
    unsigned rate = argc > 1 ? (unsigned)atoi(argv[1]) : 44100u;
    int i;
    DBOPL_InitTables();
    Chip__Chip(&c);
    Chip__Setup(&c, rate);
    printf("/* made by dbopl_gen.c %u: do not edit */\n#define DBOPL_PRE_RATE %uu\n", rate, rate);
    for (i = 0; i < 8 * 512; i++) v[i] = WaveTable[i];
    arr("Bit16s", "pre_WaveTable", v, 8 * 512);
    for (i = 0; i < 384; i++) v[i] = MulTable[i];
    arr("Bit16u", "pre_MulTable", v, 384);
    printf("static const Bit32u pre_noiseAdd = %uu, pre_lfoAdd = %uu;\n", (unsigned)c.noiseAdd, (unsigned)c.lfoAdd);
    for (i = 0; i < 16; i++) v[i] = (long)c.freqMul[i];
    arr("Bit32u", "pre_freqMul", v, 16);
    for (i = 0; i < 76; i++) v[i] = (long)c.linearRates[i];
    arr("Bit32u", "pre_linearRates", v, 76);
    for (i = 0; i < 76; i++) v[i] = (long)c.attackRates[i];
    arr("Bit32u", "pre_attackRates", v, 76);
    return 0;
}
