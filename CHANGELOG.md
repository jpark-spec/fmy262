# Changelog

## 0.8.3 — Minor A2M Import Update

Import AT2 songs again in the workbench to get the fixes; songs imported with 0.8.1 also lack every key-off (fixed in 0.8.2), so their notes run into each other.

- vibrato and tremolo keep their place across new notes and start over only on a row without the effect, as in AT2
- FM register macros: the level columns are read as AT2 stores them (63 minus the level); A2M export writes them
  the same way (A2M files from FMY262 0.8.2 and before still read right)
- an instrument number without a note resets the channel's volume to the instrument's, as in AT2 (not with volume
  lock on the same instrument)
- tests: the AdPlug comparison also checks key-offs written inside a tick

## 0.8.2 — Engine Logic Update

Imported Adlib Tracker II songs now play much closer to AT2 itself (checked tick by tick against AdPlug's AT2
player). Import songs again in the workbench to get the fixes.

- A2M import: key-off notes were lost (AT2 writes them as FFh), so notes kept ringing; A2M export writes FFh too
- AT2's "volume scaling off" songs: volumes are the operators' levels and notes start at the instrument's own
  levels, as in AT2 (fades were too slow); exported A2M files now carry the right volume-scaling flag
- pitch: notes are tuned to the AdLib note table of AT2 and RAD (A = 437.5 Hz, 9.8 cents below 440 Hz)
- vibrato tables follow AT2: they restart when an effect changes the pitch, and a vibrato effect on top drifts the
  way it does in AT2; AT2 tables longer than 16 steps are shortened (same shape and speed) instead of cut
- tone portamento after a key-off sounds the old note again and glides from it, as in AT2
- RAD import: the tuning is now in the engine instead of each instrument's fine tune
- song files: version 2 for songs with volume scaling off (version 1 files still read)

## 0.8 — First public release

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
