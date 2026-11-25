/* FM-1 OPL3 tracker: the screen and the controls, web/template.html in C (its st, knob, press, draw*). The same
 * inputs give the same pixels (tests/t44.cjs compares the two). Platform-free: the app feeds it the controls and
 * the time, gives it the engine's calls (UiHost) and blits the strips it draws.
 *
 * Not here (yet): undo, USB import and export, the metronome. */
#ifndef UI_UI_H
#define UI_UI_H
#include <stdint.h>
#include "uisong.h"

enum { UI_K1, UI_K2, UI_K3, UI_K4, UI_SEL, UI_PRE, UI_ALG, UI_MST };   /* knobs and encoders */
enum { UB_FX, UB_SEL, UB_ENV, UB_LFO, UB_EDIT, UB_GLO, UB_HOME, UB_SAVE, UB_ARP, UB_SEQ, UB_PLAY, UB_REC, UB_OCTDN,
       UB_OCTUP, UB_N };

typedef struct { char name[21]; int pats, len; uint32_t size; } UiSlot;   /* a song slot's song */

typedef struct {
    void (*play)(void *u, int ord, int row, int loop);
    void (*stop)(void *u);
    void (*on)(void *u, int c, int inst, int note, const EngIns *patch);   /* patch NULL: the song's instrument */
    void (*off)(void *u, int c);
    void (*mute)(void *u, uint32_t mask);
    void (*tune)(void *u, int cents);
    /* the four song slots (FILE: HOME+GLO, SAVE): slot_info 1 = slot k holds a song (out: what it is); slot_save the
     * song as it is into slot k: 0, -1 failed (the slot as it was), -2 too big; slot_load slot k's song into the
     * UiSong (the engine let go of it meanwhile): 0, -1 failed (the song as it was), -2 cut short (the arena full);
     * slot_delete 0; slot_rename (the song in slot k under a new name) as slot_save */
    int (*slot_info)(void *u, int k, UiSlot *out);
    int (*slot_save)(void *u, int k);
    int (*slot_load)(void *u, int k);       /* k -1: the new song (ui_new_song) */
    int (*slot_delete)(void *u, int k);
    int (*slot_rename)(void *u, int k, const char *name);
    void (*prefs)(void *u);              /* the settings or the user presets changed: ui_prefs / ui_presets to keep */
    /* the waveform screen: scope_on 1 while it is shown (0 after); scope the latest n samples of track's OPL channel
     * (22.05 kHz, oldest first): 1, 0 nothing to show, -1 the track has no channel */
    void (*scope_on)(void *u, int on);
    int (*scope)(void *u, int track, int16_t *dst, int n);
    /* the settings that reach the sound (HOME menu): eq 0 FLAT, 1 LOWCUT, 2 BASS+ (the web page's filters); click: the
     * metronome on every 4th row while playing (accent every 16th), on 0/1, level 0 LOW 1 MID 2 HIGH (called when
     * either changes: CLICK ON, or REC with recording on); blip: one click now (the count-in's beats) */
    void (*eq)(void *u, int mode);
    void (*click)(void *u, int on, int level);
    void (*blip)(void *u, int accent, int level);
    /* SYSTEM · CPU LOAD: the render's load in % (out: the highest lately), -1 not known */
    int (*cpu)(void *u, int *peak, int *cores);   /* the render's load %, its peak, the cores it runs on */
    void *u;
} UiHost;

#define UI_W 240
#define UI_H 240

void ui_init(UiSong *s, const UiHost *h, uint32_t now_ms);
void ui_time(uint32_t now_ms);           /* the clock (milliseconds): before each input and each frame */
void ui_knob(int k, int d);              /* detents, + clockwise */
void ui_down(int b);                     /* buttons */
void ui_up(int b);
void ui_key(int k, int down);            /* the keys 0..26 (F3..G5 at octave 4) */
void ui_midi(uint32_t pkt);              /* a USB-MIDI packet (byte 0 cable/CIN, then status, data 1, 2) that came in: MIDI IN */
void ui_pos(int ord, int row, uint32_t trig);   /* the engine played a row (its pos callback) */
void ui_song_changed(void);              /* a new song in the UiSong: cursor home, playing stopped */
/* the frame's state (meters, timers): once a frame, before its strips */
void ui_frame(void);
/* rows y0 .. y0 + h - 1 of the screen into px (240 per row, RGB565: byte-swapped with UI_SWAP) */
void ui_draw(uint16_t *px, int y0, int h);
/* the button lights: bit b lit, and the colour (RGB 888) of each */
uint32_t ui_leds(uint32_t rgb[UB_N]);
uint32_t ui_keys(void);                  /* the keys to light (bit k = key k) */
int ui_one_core(void);                   /* CORE SINGLE: 1 = keep the second core off (read at the start) */
int ui_led_mode(void);                   /* LEDS: 0 OFF, 1 DIM LO, 2 DIM HI (the unlit glow), 3 INV, 4 INV LO, 5 INV HI (lit ones dark) */
int ui_playing(void);
/* what to keep between starts: the settings and the last slot as text lines key=value; the user presets in bytes.
 * Each returns its length (at most max); the _load ones take what an earlier one gave (unknown keys and values left
 * at their defaults) */
uint32_t ui_prefs(char *buf, uint32_t max);
void ui_prefs_load(const char *buf, uint32_t n);
uint32_t ui_presets(uint8_t *buf, uint32_t max);
void ui_presets_load(const uint8_t *buf, uint32_t n);
/* at the start, after ui_prefs_load: RESTORE LAST on, the last slot's song loaded (slot_load): 0, -1 not */
int ui_restore(void);
void ui_about_start(uint32_t now_ms);   /* the start screen's 3 seconds from now (the first frame shown) */
void ui_slots_changed(int k, int gone);  /* slot k written or emptied from outside (USB): the list read again, a message */
void ui_say(const char *m);
int ui_new_song(UiSong *s);              /* the empty song into s (sf_read's result): the host's slot_load(-1) calls it */              /* a message across the screen for a second */
int ui_octave(void);
#endif
