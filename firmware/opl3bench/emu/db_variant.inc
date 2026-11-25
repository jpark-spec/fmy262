/* OPL3 BENCH: one build of DBOPL (dbopl/dbopl.c) under its own names, behind three calls. The unit including this
 * defines DBV(x) (its prefix) and DBOPL_RAM / DBOPL_SPEC as it wants (dbopl.c's top says what they do).
 * Built with DBOPL_PRE (fm1.toml o2_cflags): the float-made tables from dbopl/dbopl_pre.h, 44.1 kHz only. */
#include <stdint.h>
#define Chip__Chip DBV(Chip__Chip)
#define Chip__Setup DBV(Chip__Setup)
#define Chip__WriteReg DBV(Chip__WriteReg)
#define Chip__WriteAddr DBV(Chip__WriteAddr)
#define Chip__GenerateBlock2 DBV(Chip__GenerateBlock2)
#define Chip__GenerateBlock3 DBV(Chip__GenerateBlock3)
#define DBOPL_InitTables DBV(DBOPL_InitTables)
#define DbScope DBV(Scope)
/* the handlers too: static in each unit, but one name each in the RAM-code check (fm1.toml ram_code_allow) */
#define Channel__BlockTemplate_sm2FM DBV(Channel__BlockTemplate_sm2FM)
#define Channel__BlockTemplate_sm2AM DBV(Channel__BlockTemplate_sm2AM)
#define Channel__BlockTemplate_sm3FM DBV(Channel__BlockTemplate_sm3FM)
#define Channel__BlockTemplate_sm3AM DBV(Channel__BlockTemplate_sm3AM)
#define Channel__BlockTemplate_sm3FMFM DBV(Channel__BlockTemplate_sm3FMFM)
#define Channel__BlockTemplate_sm3AMFM DBV(Channel__BlockTemplate_sm3AMFM)
#define Channel__BlockTemplate_sm3FMAM DBV(Channel__BlockTemplate_sm3FMAM)
#define Channel__BlockTemplate_sm3AMAM DBV(Channel__BlockTemplate_sm3AMAM)
#define Channel__BlockTemplate_sm2Percussion DBV(Channel__BlockTemplate_sm2Percussion)
#define Channel__BlockTemplate_sm3Percussion DBV(Channel__BlockTemplate_sm3Percussion)
#define Operator__TemplateVolumeOFF DBV(Operator__TemplateVolumeOFF)
#define Operator__TemplateVolumeRELEASE DBV(Operator__TemplateVolumeRELEASE)
#define Operator__TemplateVolumeSUSTAIN DBV(Operator__TemplateVolumeSUSTAIN)
#define Operator__TemplateVolumeDECAY DBV(Operator__TemplateVolumeDECAY)
#define Operator__TemplateVolumeATTACK DBV(Operator__TemplateVolumeATTACK)
#if defined(DBOPL_SCOPE) && !defined(PLAT_HOST) && !defined(DBOPL_SCOPE_POOL)
#define DBOPL_SCOPE_POOL __attribute__((section(".pool")))   /* (18 KB: the pool, zeroed) */
#endif
#if !defined(PLAT_HOST) && !defined(DBOPL_POOL)
#define DBOPL_POOL __attribute__((section(".pool")))          /* (the second core's buffers: the pool, zeroed) */
#endif
#include "dbopl.c"

#ifdef PLAT_HOST
static Chip db;
static Bit32s db_buf[2 * 256];
#else
static Chip db __attribute__((section(".pool")));          /* fm1-base's zeroed pool (plat.h PLAT_POOL) */
static Bit32s db_buf[2 * 256] __attribute__((section(".pool")));
#endif
void DBV(init)(uint32_t rate)
{
    DBOPL_InitTables();
    memset(&db, 0, sizeof db);
    Chip__Chip(&db);
    Chip__Setup(&db, rate);              /* (rate must be DBOPL_PRE_RATE: 44100) */
}
void DBV(write)(uint16_t reg, uint8_t v) { Chip__WriteReg(&db, reg, v); }
/* the second core (FMY262): run hands it fn(arg) (1, or 0 = do it here), wait waits (0, or -1 = it dropped it: do it
 * here); 0, 0 = one core. The output is the same either way, sample for sample. Set it while no render runs */
void DBV(split)(int (*run)(void (*)(uint32_t), uint32_t), int (*wait)(void)) { SplitRun = run; SplitWait = run ? wait : 0; }
void DBV(render)(int16_t *lr, uint32_t n)   /* n <= 256 */
{
    /* through a pointer the compiler cannot see through: with DBOPL_RAM the block is RAM code, out of a direct
     * call's reach from here (plat.h PLAT_FAR) */
    void (*volatile gen)(Chip *, Bitu, Bit32s *) = Chip__GenerateBlock3;
    uint32_t i;
    gen(&db, n, db_buf);
    for (i = 0; i < 2 * n; i++) {
        Bit32s s = db_buf[i];
        lr[i] = (int16_t)(s < -32768 ? -32768 : s > 32767 ? 32767 : s);
    }
}

#ifdef DBOPL_SCOPE
/* the scope (DBOPL_SCOPE): on/off (off: the mix as before, not a cycle more), and an OPL channel's last n samples
 * (0..17, bank 1 = 9..17; at 22.05 kHz, oldest first) into dst; n <= DBOPL_SCOPE_N - 64. Read while the render runs:
 * a sample may be torn at the newest end, never a crash */
void DBV(scope_on)(int on) { if (on && !DbScope.on) memset(DbScope.buf, 0, sizeof DbScope.buf); DbScope.on = on; }
void DBV(scope_read)(int opl_ch, int16_t *dst, uint32_t n)
{
    static const uint8_t IX[9] = {0, 2, 4, 1, 3, 5, 6, 7, 8};   /* (dbopl.c ChanOffsetTable: a 4-op pair side by side) */
    uint32_t w = DbScope.w, i;
    int k;
    if (opl_ch < 0 || opl_ch >= 18) { for (i = 0; i < n; i++) dst[i] = 0; return; }
    k = DbScope.own[IX[opl_ch % 9] + (opl_ch >= 9 ? 9 : 0)];
    for (i = 0; i < n; i++) dst[i] = DbScope.buf[k][(w - n + i) & (DBOPL_SCOPE_N - 1)];
}
#endif
