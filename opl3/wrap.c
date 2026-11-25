#include <stddef.h>
#include <stdint.h>
#include "opl3.h"
void *memset(void *s, int c, size_t n){unsigned char*p=s;while(n--)*p++=(unsigned char)c;return s;}
void *memcpy(void *d, const void *s, size_t n){unsigned char*a=d;const unsigned char*b=s;while(n--)*a++=*b++;return d;}
static opl3_chip chip;
static int16_t buf[2*4096];
__attribute__((export_name("opl_reset"))) void opl_reset(uint32_t rate){OPL3_Reset(&chip,rate);}
__attribute__((export_name("opl_write"))) void opl_write(uint32_t reg,uint32_t v){OPL3_WriteRegBuffered(&chip,(uint16_t)reg,(uint8_t)v);}
__attribute__((export_name("opl_write_now"))) void opl_write_now(uint32_t reg,uint32_t v){OPL3_WriteReg(&chip,(uint16_t)reg,(uint8_t)v);}
__attribute__((export_name("opl_render"))) int16_t* opl_render(uint32_t n){if(n>4096)n=4096;OPL3_GenerateStream(&chip,buf,n);return buf;}
