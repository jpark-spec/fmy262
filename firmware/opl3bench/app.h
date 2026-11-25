/* OPL3 BENCH: Nuked OPL3 in the FM-1's real audio path (fm1-base app), its load on the screen.
 * The contract with the platform is fm1-base's template/app.h. */
#pragma once
#include <stdint.h>
#include "plat.h"

#define APP_NAME "OPL3 BENCH"
#define APP_SPLASH_RGB RGB(90, 200, 255)
#define APP_BLOCK 256u                   /* frames per audio block: 5.8 ms at 44.1 kHz */
#define APP_CPU_KHZ                      /* plat_cpu_khz: the clock on the screen */
#define APP_LOG                          /* the numbers over USB: tools/fm1_remote.py log */
void app_log(void (*line)(const char *t));

/* the store: only the platform's panel calibration */
enum { OBJ_PANEL, OBJ_NOBJ };
#define APP_STORE_MAP {0xDC000u}

void app_init(void);
void app_render(int32_t *lr, uint32_t n, uint32_t master_q12);
void app_panic(void);
void app_ui_init(void);
void app_frame(void);
void app_input_only(void);
void app_say(const char *a, const char *b);
