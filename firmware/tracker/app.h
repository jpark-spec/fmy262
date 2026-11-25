/* FMY262: the OPL3 tracker on the FM-1 (named after the chip, YMF262). The engine (firmware/engine) and DBOPL in the audio interrupt, the screen
 * and controls (firmware/ui, web/template.html in C) in the main loop. The contract is fm1-base's template/app.h. */
#pragma once
#include <stdint.h>
#include "plat.h"

#define APP_NAME "FMY262"
#define APP_SPLASH_RGB RGB(255, 255, 85)
#define APP_BLOCK 256u                   /* frames per audio block: 5.8 ms at 44.1 kHz */
#define APP_CANVAS_PX (240u * 8u)        /* gfx's canvas unused (the screen draws its own strips): small */
#define APP_CPU_KHZ
#define APP_LOG                          /* tools/fm1_remote.py log */
void app_log(void (*line)(const char *t));

/* the store: the panel calibration (the platform's), the settings and last slot (text), the user presets. The song slots
 * are in the data area apart (slots.h): 0x97000..0xD6FFF and XDATA1 0xE5000..0xF4FFF */
enum { OBJ_PANEL, OBJ_PREFS, OBJ_PRESETS, OBJ_NOBJ };
#define APP_STORE_MAP {0xDC000u, 0xDE000u, 0xDA000u}
#define FM1B_ERASE_SLICED 1               /* the flash erased in 1 ms windows: the sound goes on while a song is saved */

/* the companion's files (fm1.toml companion = true): the four song slots, "slot1.fmy" .. "slot4.fmy" (FMY1, songfile.h).
 * The workbench page (web/workbench.html) turns them into A2M and back */
#define APP_COMPANION_EXTRAS "editor=fmy262/1"
#define APP_FILES
#define APP_FILE_COUNT
uint32_t app_file_count(void);
int app_file(uint32_t i, plat_file_info_t *f);
int app_file_read(uint32_t i, uint32_t off, uint8_t *dst, uint32_t n);
int app_file_begin(uint32_t i, uint32_t size);
int app_file_write(uint32_t i, uint32_t off, const uint8_t *src, uint32_t n);
int app_file_commit(uint32_t i, uint32_t size, uint32_t crc);
int app_file_delete(uint32_t i);
int app_file_busy(void);

void app_init(void);
void app_render(int32_t *lr, uint32_t n, uint32_t master_q12);
void app_panic(void);
void app_ui_init(void);
void app_frame(void);
void app_input_only(void);
void app_say(const char *a, const char *b);
