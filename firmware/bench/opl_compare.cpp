/* OPL3 emulator speed comparison on the host: the same register stream (18 channels keyed on a bright 2-op patch,
 * as opl3_bench.c), 10 s of 44.1 kHz output from each, ns per output sample and the ratio to Nuked.
 * Sources come from vendor/libADLMIDI/src/chips (not in this repository). Build: firmware/bench/opl_compare.sh */
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstdint>
#include <cstring>
#include <functional>
#include <vector>

extern "C" {
#include "opl3.h"                       /* opl3/: the Nuked OPL3 the prototype uses */
#include "opal/opal.h"
#include "vpc_opl3/vpc_opl3.h"
}
extern "C" {                            /* nuked_fast reuses Nuked's type names: wrapped in opl_compare_nf.c */
void *nf_new(int rate);
void nf_write(void *c, uint16_t a, uint8_t v);
void nf_gen(void *c, int16_t *lr);
void *db_new(int rate);                 /* DBOPL in C: opl_compare_db.c */
void db_write(void *c, uint16_t a, uint8_t v);
void db_gen(void *c, int16_t *lr, int n);
}
#include "dosbox/dbopl.h"
#include "ymfm/ymfm_opl.h"

static const int SR = 44100, SECONDS = 10, N = SR * SECONDS;
static const uint8_t SLOT[9] = {0, 1, 2, 8, 9, 10, 16, 17, 18};

static void patch(const std::function<void(uint16_t, uint8_t)> &w)
{
    w(0x105, 1);
    for (int ch = 0; ch < 18; ch++) {
        int bank = ch < 9 ? 0 : 0x100, k = ch % 9;
        for (int j = 0; j < 2; j++) {
            int a = bank + SLOT[k] + j * 3;
            w(0x20 + a, 0x21); w(0x40 + a, j ? 0x08 : 0x10); w(0x60 + a, 0xF2); w(0x80 + a, 0x24);
            w(0xE0 + a, j ? 0 : 2);
        }
        w(0xC0 + bank + k, 0x3E);
        w(0xA0 + bank + k, 0x40 + ch * 7);
        w(0xB0 + bank + k, 0x31);
    }
}

struct Result { const char *name; double ns; double rms; };

static Result run(const char *name, const std::function<void(int16_t *, int)> &gen)
{
    std::vector<int16_t> buf(2 * 256);
    double sum = 0;
    for (int warm = 0; warm < 4; warm++) gen(buf.data(), 256);
    auto t0 = std::chrono::steady_clock::now();
    for (int n = 0; n < N; n += 256) {
        gen(buf.data(), 256);
        if (n % (256 * 64) == 0)
            for (int i = 0; i < 512; i++) sum += (double)buf[i] * buf[i];
    }
    double s = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    return {name, s * 1e9 / N, std::sqrt(sum / (512.0 * ((N + 256 * 64 - 1) / (256 * 64))))};
}

/* ymfm needs an interface object; it runs at the chip's own rate (clock / 288 = 49716 Hz) */
struct YmIntf : ymfm::ymfm_interface {};

int main()
{
    std::vector<Result> r;
    {
        static opl3_chip c;
        OPL3_Reset(&c, SR);
        patch([&](uint16_t a, uint8_t v) { OPL3_WriteReg(&c, a, v); });
        r.push_back(run("Nuked OPL3 (current)", [&](int16_t *b, int n) { for (int i = 0; i < n; i++) OPL3_GenerateResampled(&c, b + 2 * i); }));
    }
    {
        void *c = nf_new(SR);
        patch([&](uint16_t a, uint8_t v) { nf_write(c, a, v); });
        r.push_back(run("Nuked OPL3 fast (LGPL, C, bit-exact)", [&](int16_t *b, int n) { for (int i = 0; i < n; i++) nf_gen(c, b + 2 * i); }));
    }
    {
        static Opal o;
        Opal_Init(&o, SR);
        patch([&](uint16_t a, uint8_t v) { Opal_Port(&o, a, v); });
        r.push_back(run("Opal (public domain, C)", [&](int16_t *b, int n) { for (int i = 0; i < n; i++) Opal_Sample(&o, b + 2 * i, b + 2 * i + 1); }));
    }
    {
        void *v = vpc_opl_init();
        vpc_opl_set_rate(v, SR);
        vpc_opl_reset(v);
        patch([&](uint16_t a, uint8_t d) { vpc_opl_writereg(v, a, d); });
        r.push_back(run("VPC OPL3 (LGPL, C)", [&](int16_t *b, int n) { vpc_opl_getoutput(v, b, n); }));
    }
    {
        void *c = db_new(SR);
        patch([&](uint16_t a, uint8_t v) { db_write(c, a, v); });
        r.push_back(run("DBOPL C port (GPL-2+, C)", [&](int16_t *b, int n) { db_gen(c, b, n); }));
    }
    {
        DBOPL::InitTables();
        static DBOPL::Handler h;
        h.Init(SR);
        patch([&](uint16_t a, uint8_t v) { h.WriteReg(a, v); });
        r.push_back(run("DOSBox DBOPL (GPL-2+, C++)", [&](int16_t *b, int n) {
            while (n > 0) { Bitu f = n; h.GenerateArr(b, &f); n -= (int)f; b += 2 * f; }
        }));
    }
    {
        static YmIntf intf;
        static ymfm::ymf262 chip(intf);
        chip.reset();
        patch([&](uint16_t a, uint8_t v) { chip.write((a >> 8) ? 2 : 0, a & 0xFF); chip.write((a >> 8) ? 3 : 1, v); });
        /* native 49716 Hz, nearest-sample to 44.1 kHz (the cost of the native samples is what counts) */
        double pos = 0, step = 49716.0 / SR;
        ymfm::ymf262::output_data o;
        r.push_back(run("ymfm (BSD-3, C++)", [&](int16_t *b, int n) {
            for (int i = 0; i < n; i++) {
                pos += step;
                while (pos >= 1.0) { chip.generate(&o); pos -= 1.0; }
                int l = o.data[0] , rr = o.data[1];
                b[2 * i] = (int16_t)(l < -32768 ? -32768 : l > 32767 ? 32767 : l);
                b[2 * i + 1] = (int16_t)(rr < -32768 ? -32768 : rr > 32767 ? 32767 : rr);
            }
        }));
    }
    double base = r[0].ns;
    std::printf("%-40s %10s %8s %8s\n", "emulator", "ns/sample", "x Nuked", "rms");
    for (auto &x : r)
        std::printf("%-40s %10.1f %8.2f %8.0f\n", x.name, x.ns, base / x.ns, x.rms);
    return 0;
}
