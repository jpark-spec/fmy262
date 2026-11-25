# Changelog

Versions: 0.N is a large step closed by tests or measurements on the device, 0.N.x the work in between.

## 0.8.1 — first public release

FMY262 is an OPL3 (YMF262) tracker that runs on the M-VAVE FM-1 as custom firmware, with a workbench web page to
install it, move songs over USB and try it in the browser.

- 18-channel OPL3 sound (DBOPL emulator) at 44.1 kHz, 4-op pairs, percussion mode, OPL2 mode
- Adlib Tracker II effects, arpeggio and vibrato tables, FM register macros
- pattern, instrument (4 pages), macro, song order, global and file screens on the 240×240 display; waveform view
  of 1 or 9 channels
- 4 song slots in flash, safe against power loss while saving; songs to and from the computer over USB
- workbench: import Adlib Tracker II (.a2m) and Reality AdLib Tracker (.rad 1.0/2.1) songs, export .a2m, run the
  firmware itself in the browser, install the firmware (and go back to M-VAVE's own)
- settings menu (HOME held): display, controls, audio (EQ, metronome), MIDI in, CPU load, one or two cores
- the second CPU core renders half of the OPL3 channels

## Earlier (not released)

| Version | What |
|---|---|
| 0.8 | Two CPU cores (DBOPL bank 1 on the second core). .1 RAD import |
| 0.7 | Waveform screen. .1–.5 workbench languages and colours, stock firmware step, settings menu on the device, CPU load, piano keys |
| 0.6 | USB slot transfer, A2M workbench. .1 the web prototype on DBOPL too, workbench emulator, songs and install tabs |
| 0.5 | The screen ported to C, the tracker app. .1–.4 presets, names, start screen, save slots, new song |
| 0.4 | Song arena (patterns without empty cells) |
| 0.3 | Engine ported to C, playback on the device |
| 0.2 | Speed measured on the device, DBOPL chosen |
| 0.1 | Web prototype |
