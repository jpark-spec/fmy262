// t48 reference side: plays a .rad file with AdPlug's RAD replayer (Crad2Player) through a register-logging
// OPL and prints, after every tick, each OPL3 channel's B0/A0 pair (key-on, block, F-number) as 4 hex digits,
// plus each channel's two operator levels (40h regs). Build: see tests/t48.cjs.
#include <adplug/adplug.h>
#include <adplug/rad2.h>
#include <adplug/opl.h>
#include <cstdio>
#include <cstdlib>
struct LogOPL : Copl {
  unsigned char r[512] = {0};
  LogOPL() { currType = TYPE_OPL3; }
  void write(int reg, int val) { r[(currChip << 8 | reg) & 511] = val; }
  void init() {}
};
static const int OPS[9] = {0, 1, 2, 8, 9, 10, 16, 17, 18};
int main(int argc, char **argv) {
  if (argc < 2) return 2;
  int ticks = argc > 2 ? atoi(argv[2]) : 4000;
  LogOPL opl; Crad2Player p(&opl);
  if (!p.load(argv[1])) { fprintf(stderr, "load failed\n"); return 1; }
  p.rewind(0);
  printf("hz %.4f\n", p.getrefresh());
  for (int t = 0; t < ticks; t++) {
    bool more = p.update();
    for (int k = 0; k < 18; k++) { int b = (k / 9) << 8, c = k % 9;
      printf("%02X%02X", opl.r[b | 0xB0 | c], opl.r[b | 0xA0 | c]); }
    printf(" %02X%02X\n", opl.r[0x104], opl.r[0xBD]);
    if (!more) { printf("end %d\n", t); break; }
  }
  return 0;
}
