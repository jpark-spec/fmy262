/* OPL3 BENCH: dbopl.c's "can't happen" (a bad synth mode) has no libc on the device: hang, and the watchdog
 * restarts the FM-1 */
#ifndef PLAT_HOST
void abort(void)
{
    for (;;)
        ;
}
#endif
