/* DBOPL specialised per mode, its render in RAM (.app_ram) */
#define DBV(x) dbr_##x
#define DBOPL_SPEC
#define DBOPL_RAM
#include "db_variant.inc"
