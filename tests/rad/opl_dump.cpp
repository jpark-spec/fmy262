// Plays any file AdPlug knows (CAdPlug::factory: A2M through its AT2 port, RAD, ...) through a register-logging
// OPL3 and prints after every tick: 18 x (B0 A0), then 36 x 40h (KSL/TL of each operator slot), then 104h and BDh,
// then (with OPL_DUMP_ALL set) all 512 registers and the channels written with the key bit clear in that tick.
#include <adplug/adplug.h>
#include <adplug/opl.h>
#include <cstdio>
#include <cstdlib>
struct LogOPL : Copl {
  unsigned char r[512] = {0};
  unsigned ko = 0;                     // channels written with the key bit clear this tick (bit 0..17)
  LogOPL() { currType = TYPE_OPL3; }
  void write(int reg, int val) { int a = (currChip << 8 | reg) & 511; r[a] = val;
    if ((a & 0xF0) == 0xB0 && (a & 15) < 9 && !(val & 32)) ko |= 1u << ((a >> 8) * 9 + (a & 15)); }
  void init() {}
};
static const int SLOT[18] = {0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21};
int main(int argc, char **argv) {
  if (argc < 2) return 2;
  int ticks = argc > 2 ? atoi(argv[2]) : 4000;
  LogOPL opl; CPlayer *p = CAdPlug::factory(argv[1], &opl);
  if (!p) { fprintf(stderr, "load failed\n"); return 1; }
  p->rewind(0);
  printf("hz %.4f %s\n", p->getrefresh(), p->gettype().c_str());
  for (int t = 0; t < ticks; t++) {
    bool more = p->update();
    for (int k = 0; k < 18; k++) { int b = (k / 9) << 8, c = k % 9; printf("%02X%02X", opl.r[b | 0xB0 | c], opl.r[b | 0xA0 | c]); }
    printf(" ");
    for (int b = 0; b < 2; b++) for (int s = 0; s < 18; s++) printf("%02X", opl.r[b << 8 | 0x40 | SLOT[s]]);
    printf(" %02X%02X", opl.r[0x104], opl.r[0xBD]);
    if (getenv("OPL_DUMP_ALL")) { printf(" "); for (int i = 0; i < 512; i++) printf("%02X", opl.r[i]); printf(" %05X", opl.ko); }
    opl.ko = 0;
    printf("\n");
    if (!more) { printf("end %d\n", t); break; }
  }
  return 0;
}
