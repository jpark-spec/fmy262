#!/usr/bin/env python3
"""FMY262's song slots over USB (the companion's files) on the host simulator: tests/t46.cjs runs it.
    usb_test.py HOST_BINARY SONG.fmy OTHER.fmy SHOTDIR
A song written to slot 2 and read back the same; a second song over it; a file that is not a song refused (the old
one kept); writes refused while playing; a delete; the song loaded on the screen from the slot it came in."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../vendor/fm1-base/tools"))
from fm1_companion import Client, ServeLink, CompanionError

host, song_path, other_path, shots = sys.argv[1:5]
song, other = open(song_path, "rb").read(), open(other_path, "rb").read()
SEL, SAVE, PLAY = 1 << 1, 1 << 7, 1 << 10
fails = []
def check(c, what):
    if not c:
        fails.append(what)
        print("FAIL", what)

link = ServeLink([host, "--serve"])
c = Client(link)
def tap(mask, ms=60):
    link.cmd(f"buttons {mask}"); link.run(ms); link.cmd("buttons 0"); link.run(ms)
def size_of(i):
    return [f for f in c.files() if f["index"] == i][0]["size"]

link.run(600)
tap(SEL)                                   # (the start screen away)
h = c.hello()
check(h["name"].startswith("FMY262") and h["files"] == 4, f"hello: {h['name']} {h['files']} files")
names = [f["name"] for f in c.files()]
check(names == ["slot1.fmy", "slot2.fmy", "slot3.fmy", "slot4.fmy"], f"names {names}")

c.write(1, song)
check(size_of(1) == len(song), "slot 2 holds the song's size")
check(c.read(1) == song, "slot 2 reads back the same bytes")
link.run(100)
link.cmd(f"shot {shots}/usb_received.png")

c.write(1, other)
check(c.read(1) == other, "a second song over it")

bad = bytearray(other); bad[0:4] = b"XXXX"
try:
    c.write(1, bytes(bad)); check(False, "a file that is not a song was taken")
except CompanionError as e:
    print("refused as it should:", e)
check(c.read(1) == other, "the old song kept after a refused file")

c.write(2, song)
tap(PLAY); link.run(200)
try:
    c.write(3, song); check(False, "a write while playing was taken")
except CompanionError as e:
    check(e.code == "busy", f"busy while playing ({e})")
tap(PLAY); link.run(100)

c.delete(2)
check(size_of(2) == 0, "slot 3 deleted")

# the song from slot 2 on the screen: SAVE opens the slots, SELECT down to 2, SEL loads it
tap(SAVE); link.cmd("turn 0 1"); link.run(100); tap(SEL); link.run(300)
link.cmd(f"shot {shots}/usb_loaded.png")
tap(SAVE); link.run(100)
link.cmd(f"shot {shots}/usb_slots.png")
link.close()
print("usb_test:", "ok" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
