<p align="center">FMY262</p>

<p align="center"><b></b>An OPL3 (YMF262) tracker for the M-VAVE FM-1<b></b>, as custom firmware, by Mr. Tracy Evans.</p>

<p align="center"><b><a href="https://jpark-spec.github.io/fmy262/#install">Install it from the browser</a></b> · <a href="https://jpark-spec.github.io/fmy262/#songs">Songs (USB, A2M / RAD import)</a> · <a href="https://jpark-spec.github.io/fmy262/#run">Try it in the browser</a><br>
<a href="../../releases">Releases</a> · <a href="CHANGELOG.md">Changelog</a> · <a href="#building">Building</a> · <a href="LICENSE">License (GPL-2.0)</a> · <a href="README.ko.md">한국어</a></p>

---

FMY262 turns the FM-1 into an 18-channel OPL3 tracker in the spirit of Adlib Tracker II: patterns, instruments
with 2 or 4 operators, percussion mode, AT2 effects and macros, on the FM-1's 240×240 screen, knobs, buttons and
27 keys. A workbench web page installs it, moves songs between the FM-1 and your computer over USB, imports
Adlib Tracker II and Reality AdLib Tracker songs, and can run the firmware itself in your browser.

> **Custom firmware, at your own risk.** FMY262 is not made or supported by M-VAVE. The workbench's install page
> can put M-VAVE's own firmware back (you give it the file from M-VAVE), but a failed install is possible, as with any
> firmware.

## Get it

From the [latest release](../../releases/latest):

| File | What |
|---|---|
| `fmy262-VERSION.zip` | `fmy262-VERSION.fwsc` (the firmware package), `fmy262-workbench-VERSION.html` (the songs page as one file), `fmy262-prototype-VERSION.html` (the browser prototype: the whole tracker on a drawn FM-1), licences and changelog |
| `fmy262-workbench-site-VERSION.zip` | the workbench site (also published on this repository's GitHub Pages) |

The **workbench** ([jpark-spec.github.io/fmy262](https://jpark-spec.github.io/fmy262/), or `npm run serve` after a build) has four tabs, each with its own link (`#run`, `#songs`, `#install`, `#help`):

- **Run** — the FMY262 firmware running in the browser (an emulator built from the same source)
- **Songs** — the four song slots of the emulator or of an FM-1 on USB: import `.a2m`, `.rad` (1.0/2.1) or `.fmy`,
  save as `.a2m` or `.fmy`, put in the demo song
- **Install** — install FMY262 on the FM-1 over USB (Chrome or Edge, WebSerial), or go back to M-VAVE's firmware
- **Help**

## Using it

The screen tips (HELP in the settings) and the side panel of the prototype page explain every control. In short:

- **Pattern**: SELECT up/down, knob 1 pattern, knob 2 channel, ALGORITHM moves along the row, knob 3 effect, knob 4
  its value. The keys set the note under the cursor (REC on: and step down). EDIT clears, PRESETS picks the instrument.
  HOME tapped: 3 channels → 9 channels → waveform of 1 → waveform of 9.
- **Block**: HOME + knob 1/2 marks rows and channels; knob 3 transposes, HOME + OCT−/+ copies and pastes.
- **ENV**: the instrument in four pages (voice, ADSR, output, scaling); ALGORITHM picks FM, ADD or a 4-op connection,
  SEL the operator.
- **ARP**: arpeggio → vibrato tables → FM register macro. **SEQ**: the song order. **GLO**: tempo, chip, voices.
- **HOME + GLO**: files (4 slots, load, rename, delete, new song). **SAVE**: save.
- **PLAY**: play/stop on any screen (HOME + PLAY repeats the pattern). **HOME held**: settings, and INFO with the
  licences.

Songs are kept in the FM-1's flash in FMY262's own format (FMY1, `firmware/ui/songfile.h`); a save interrupted by a
power cut leaves the old song or the new one, never a broken one.

## Building

| What | How |
|---|---|
| web pages (`dist/fm1-opl3-tracker.html`, `dist/fmy262-workbench.html`) | Node 18+: `npm ci && npm run build` |
| tests | `npm test` (a C compiler; Chrome for the screen test t44; `tools/fetch-vendor.sh` for t42's device build; AdPlug for t48, else skipped) |
| firmware and workbench site | `tools/fetch-vendor.sh`, then fm1-base's toolchain setup (its README: the JieLi toolchain; Docker on macOS), then `npm run workbench` → `dist/workbench/` |
| a release | `tools/release.sh VERSION` → `release/` (see `CHANGELOG.md`) |

Layout: `web/` the web prototype and the engine in JavaScript, `firmware/engine` the engine in C, `firmware/ui` the
screen and controls in C, `firmware/tracker` the FM-1 app, `firmware/opl3bench` the DBOPL emulator and the speed
bench, `tests/` the tests. `CLAUDE.md` holds the design notes (in Korean).

The engine in C and in JavaScript are checked against each other register write by register write (t42), and the
device screen against the web one pixel by pixel (t44).

## Licence

GPL-2.0-or-later (`LICENSE`). Other people's code and the file formats followed are listed in `NOTICE.md`.
