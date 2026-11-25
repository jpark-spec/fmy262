/* tests/t47.cjs's C side: DBOPL as the FM-1 builds it (db_spec.c: DBOPL_SPEC + DBOPL_PRE), a script of
 * "w REG VAL" and "r N" lines from stdin, every rendered frame (L R int16) to stdout as raw bytes; "q" writes the
 * scope's last 448 samples of each OPL channel. With -2: the second core's split (dbs_split), its job run late (at the
 * wait, after this core's half), as on the FM-1 the two run side by side */
#include <stdio.h>
#include <stdint.h>
void dbs_init(uint32_t rate);
void dbs_write(uint16_t reg, uint8_t v);
void dbs_render(int16_t *lr, uint32_t n);
void dbs_scope_on(int on);
void dbs_scope_read(int opl_ch, int16_t *dst, uint32_t n);
void dbs_split(int (*run)(void (*)(uint32_t), uint32_t), int (*wait)(void));
static void (*job)(uint32_t);
static uint32_t jarg;
static int run(void (*fn)(uint32_t), uint32_t a) { job = fn; jarg = a; return 1; }
static int wait_(void) { job(jarg); job = 0; return 0; }
int main(int argc, char **argv)
{
    char line[64];
    static int16_t lr[2 * 256];
    unsigned a, b;
    dbs_init(44100);
    if (argc > 1 && argv[1][0] == '-' && argv[1][1] == '2') dbs_split(run, wait_);
    while (fgets(line, sizeof line, stdin)) {
        if (sscanf(line, "w %x %x", &a, &b) == 2) dbs_write((uint16_t)a, (uint8_t)b);
        else if (sscanf(line, "s %u", &a) == 1) dbs_scope_on((int)a);
        else if (line[0] == 'q') { static int16_t v[448]; int c; for (c = 0; c < 18; c++) { dbs_scope_read(c, v, 448); fwrite(v, 2, 448, stdout); } }
        else if (sscanf(line, "r %u", &a) == 1)
            while (a) { unsigned n = a < 256 ? a : 256; dbs_render(lr, n); fwrite(lr, 4, n, stdout); a -= n; }
    }
    return 0;
}
