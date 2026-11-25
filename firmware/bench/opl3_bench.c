/* OPL3 CPU-load benchmark for the FM-1 (or any host).
 * Keys all 18 channels with a bright 2-op patch (worst case for Nuked OPL3) and times N samples.
 * On the host: cc -O2 -I../../opl3 opl3_bench.c ../../opl3/opl3.c -o bench && ./bench
 * On the FM-1: build inside the Workbench/AC79 SDK, define BENCH_NOW() as a cycle or microsecond
 * counter of the pi32v2 core and BENCH_PRINT for the SDK's log; report us_per_second_of_audio. */
#include <stdint.h>
#include "opl3.h"
#ifndef BENCH_NOW
#include <stdio.h>
#include <time.h>
static uint64_t now_us(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return (uint64_t)t.tv_sec * 1000000u + t.tv_nsec / 1000; }
#define BENCH_NOW() now_us()
#define BENCH_PRINT(...) printf(__VA_ARGS__)
#endif
#ifndef BENCH_TICK_US
#define BENCH_TICK_US 1  /* microseconds per BENCH_NOW() unit; set 1000 if the SDK only offers a ms counter */
#endif
static opl3_chip chip;
static int16_t buf[2 * 256];
static const uint8_t slot[9] = { 0, 1, 2, 8, 9, 10, 16, 17, 18 };
static void setup(void) {
  OPL3_Reset(&chip, 49716);
  OPL3_WriteReg(&chip, 0x105, 1);
  for (int ch = 0; ch < 18; ch++) {
    int bank = ch < 9 ? 0 : 0x100, k = ch % 9;
    for (int j = 0; j < 2; j++) { int a = bank + slot[k] + j * 3;
      OPL3_WriteReg(&chip, 0x20 + a, 0x21); OPL3_WriteReg(&chip, 0x40 + a, j ? 0x00 : 0x10);
      OPL3_WriteReg(&chip, 0x60 + a, 0xF2); OPL3_WriteReg(&chip, 0x80 + a, 0x24); OPL3_WriteReg(&chip, 0xE0 + a, j ? 0 : 2); }
    OPL3_WriteReg(&chip, 0xC0 + bank + k, 0x3E);
    OPL3_WriteReg(&chip, 0xA0 + bank + k, 0x40 + ch * 7); OPL3_WriteReg(&chip, 0xB0 + bank + k, 0x31);
  }
}
int bench_opl3(int seconds) {
  setup();
  uint64_t t0 = BENCH_NOW();
  for (long n = 0; n < 49716L * seconds / 256; n++) OPL3_GenerateStream(&chip, buf, 256);
  uint64_t dt = (BENCH_NOW() - t0) * BENCH_TICK_US;
  /* integers only: embedded printf often lacks %f and 64-bit formats */
  unsigned long us = (unsigned long)dt, pm = (unsigned long)(dt / (uint64_t)(seconds * 1000));  /* per-mille of one core */
  BENCH_PRINT("OPL3 18ch: %d s of audio in %lu us -> %lu.%lu%% of one core\n", seconds, us, pm / 10, pm % 10);
  return (int)(dt / seconds);
}
#ifndef BENCH_NO_MAIN
int main(void) { bench_opl3(10); return 0; }
#endif
