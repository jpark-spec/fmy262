/* FM-1 (AC79 SDK) glue for the OPL3 benchmark.
 * Add THIS file and ../../opl3/opl3.c to an SDK app project (add ../../opl3 to the include paths).
 * Do not add opl3_bench.c separately: it is included below.
 *
 * Fill in the two lines marked FILL once the SDK is open:
 *   SDK_TIME_NOW() : a free-running counter (us is best; ms works with BENCH_TICK_US 1000)
 *   the place that calls fm1_opl3_bench(): e.g. the app's main task, once after boot
 * printf goes to the SDK's log (UART/USB) as usual. */
#include <stdio.h>
#include <stdint.h>

/* FILL: replace with the SDK's time function, keeping the same name */
extern uint32_t SDK_TIME_NOW(void);
#define BENCH_TICK_US 1000            /* 1 if SDK_TIME_NOW() returns microseconds */

#define BENCH_NOW()      ((uint64_t)SDK_TIME_NOW())
#define BENCH_PRINT(...) printf(__VA_ARGS__)
#define BENCH_NO_MAIN
#include "opl3_bench.c"

/* FILL: call this once from the app (it blocks for about the measured time) */
void fm1_opl3_bench(void) {
  printf("OPL3 bench start\n");
  bench_opl3(2);   /* 2 s of audio first: if it takes far longer than 2 s, the core is too slow */
  bench_opl3(10);
  printf("OPL3 bench done\n");
}
