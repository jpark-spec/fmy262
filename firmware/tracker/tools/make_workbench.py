#!/usr/bin/env python3
"""FMY262's workbench as a site (npm run workbench): dist/workbench/
  index.html        the workbench (dist/fmy262-workbench.html: web/workbench.html filled in by web/build.cjs)
  emu/              the firmware in the browser (firmware/tracker/build/emu: tools/build.py --web, Emscripten)
  install/          fm1-base's web installer, with this build's package (its identity read from it): English and
                    Korean (installer_ko.js in place of its Japanese; the workbench picks the language, the page has
                    no switch of its own), in AdLib Tracker blue, M-VAVE's firmware built in when
                    vendor/stock/FM-1.fwsc is one whose checksum fm1-base pins (installer() below)
  firmware/         the package (fmy262-VERSION.fwsc), m-bootloader, the licences, and FM-1-stock.fwsc if built in
  fonts/, words/    what the emulator's page loads (../fonts, ../words)
Like fm1-base's tools/make_site.py (whose pieces it uses), but for a dev package too, and with the workbench as the
front page. Serve it over http (npm run serve): the emulator's wasm and the pages' Web MIDI need it.
  make_workbench.py [VERSION]    (VERSION: the installer's label, default "dev")"""
import os, hashlib, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
APP, BASE = ROOT / "firmware" / "tracker", ROOT / "vendor" / "fm1-base"
sys.path.insert(0, str(BASE / "tools"))
import make_site as ms  # noqa: E402

# AdLib Tracker II's blue: a pale blue by day, the DOS blue with cyan and yellow by night (as the tracker's screen)
LIGHT = "--bg: #eef1ff; --fg: #0b1450; --dim: #3b4685; --accent: #0000aa; --on-accent: #fff; --bad: #b3261e; --focus: #b36b00;"
DARK = "--bg: #000080; --fg: #e8eaff; --dim: #a9b1f0; --accent: #55ffff; --on-accent: #000060; --bad: #ff8a80; --focus: #ffff55;"
STYLE = """  /* (FMY262: AdLib Tracker II's look) */
  h1, h2 { font-family: ui-monospace, Menlo, Consolas, monospace; letter-spacing: .02em; }
  h1 { border-bottom: 3px double var(--accent); padding-bottom: 8px; }
  button { border-radius: 2px; }
  .backup, #log, textarea { border-radius: 2px; }
  dialog { border-radius: 2px; border: 3px double var(--accent); }
"""

# the emulator's page (fm1-base web/emu: the Run tab) in the same blue: its own names for the colours
EMU_LIGHT = ("--ground: #eef1ff; --ink: #0b1450; --muted: #3b4685; --rule: #c9d0f2; --accent: #0000aa; --teal: #006b80; "
             "--card: #ffffff; --bad: #b3261e; --focus: #b36b00; color-scheme: light;")
EMU_DARK = ("--ground: #000080; --ink: #e8eaff; --muted: #a9b1f0; --rule: #2a2fb0; --accent: #55ffff; --teal: #ffff55; "
            "--card: #00009a; --bad: #ff8a80; --focus: #ffff55; color-scheme: dark;")
# the panel's lights in the blue too (fm1-base's PANEL_CSS reads these, coral by default), a held control outlined in
# cyan, and no ring round a knob as it turns (its focus outline: the panel still takes the keys)
EMU_STYLE = """/* (FMY262's workbench: AdLib Tracker II's blue) */
:root { --panel-lit: #55ffff; --panel-lit-ink: #000060; --panel-lit-white: #9fe9ff; --panel-lit-black: #3b5bff;
        --panel-dim: #1c2f8f; --panel-dim-white: #c4d0f6; --panel-dim-black: #7d8ad6; }
.held .btnface, .held .keyface { stroke: #55ffff; }
.hit:focus-visible { outline-color: #ffff55; }
.hit.knob:focus, .hit.knob:focus-visible { outline: none; box-shadow: none; }
"""
EMU_ROOT = re.compile(r'(:root(?::not\(\[data-theme="light"\]\)|\[data-theme="dark"\])?) \{ --ground:[^}]*\}')

def emu_page(html):
    """the emulator's page in the blue: its three colour rules (light, dark by the system, dark by choice) found and
    replaced, else the build stops"""
    found = EMU_ROOT.findall(html)
    if len(found) != 3:
        sys.exit(f"emu/index.html changed: {len(found)} colour rules, not 3")
    html = EMU_ROOT.sub(lambda m: m.group(1) + " { " + (EMU_LIGHT if m.group(1) == ":root" else EMU_DARK) + " }", html)
    old = "border-radius: 999px; border: 0; background: #f28a5a; color: #2a140a; cursor: pointer; }"   # the Switch on button
    if html.count(old) != 1:
        sys.exit("emu/index.html changed: no Switch on button style")
    html = html.replace(old, "border-radius: 2px; border: 0; background: #55ffff; color: #000060; cursor: pointer; }")
    if html.count("</style>") != 1:
        sys.exit("emu/index.html changed: not one <style>")
    html = html.replace("</style>", EMU_STYLE + "</style>")
    title = "<header>\n  <h1>FMY262</h1>\n</header>\n"   # (the workbench has its own title: kept for screen readers only)
    if html.count(title) != 1:
        sys.exit("emu/index.html changed: no title header")
    return html.replace(title, '<h1 class="sr">FMY262</h1>\n')

def stock_file():
    """M-VAVE's FM-1 firmware to build in: vendor/stock/FM-1.fwsc (not kept in git) when its size and SHA-256 are one
    of fm1-base's pins (web/fm1pkg.js STOCK_FILES): (bytes, product), else None (the page asks for the file as before)"""
    f = ROOT / "vendor" / "stock" / "FM-1.fwsc"
    if not f.exists() or os.environ.get("FMY_PUBLIC"):   # (a public build never carries M-VAVE's firmware)
        return None
    raw = f.read_bytes()
    pins = re.findall(r'"(FM-1_\d+)": \{ size: (\d+), sha256: "([0-9a-f]{64})" \}', (BASE / "web" / "fm1pkg.js").read_text(encoding="utf-8"))
    sha = hashlib.sha256(raw).hexdigest()
    for prod, size, pin in pins:
        if int(size) == len(raw) and pin == sha:
            return raw, prod
    sys.exit(f"{f}: not one of M-VAVE's pinned FM-1 files ({', '.join(p for p, _, _ in pins)}): leave it out or replace it")

# the stock firmware loaded with the page (installer(..., stock)): the chosen file's checks made a function, which
# the page also calls with the built-in file; it is taken only when its checksum is a pinned one
STOCK_HEAD_OLD = """  try {
    const raw = new Uint8Array(await f.arrayBuffer());
    const hex = await sha256hex(raw);"""
STOCK_HEAD_NEW = """  try {
    await takeStock(new Uint8Array(await f.arrayBuffer()), true);
  } catch (err) { sayK("error", err && err.message); }
});
/* (FMY262's workbench) M-VAVE's firmware comes with the page: checked as a chosen file is, then one button; a failed
   load leaves the steps to download and choose it */
const STOCK_URL = %s;
(async () => {
  try {
    const r = await fetch(STOCK_URL);
    if (!r.ok) throw new Error(String(r.status));
    if (await takeStock(new Uint8Array(await r.arrayBuffer()), false)) {
      $("stocklist").hidden = true;
      $("stockver").hidden = false;
    }
  } catch (_) { /* the steps by hand */ }
})();
async function takeStock(raw, said) {
  {
    const hex = await sha256hex(raw);"""
STOCK_MID_OLD = """    if (!IS_STOCK(product)) { sayK("stockbad"); return; }
    const img = logicalImage(raw);
    try { checkUfw(img); } catch (_) { sayK("stockdamaged"); return; }"""
STOCK_MID_NEW = """    if (!IS_STOCK(product)) { if (said) sayK("stockbad"); return false; }
    const img = logicalImage(raw);
    try { checkUfw(img); } catch (_) { if (said) sayK("stockdamaged"); return false; }"""
STOCK_END_OLD = """    try { known = stockChecksum(product, raw.length, hex); } catch (_) { sayK("stockmodified"); return; }
    stock = { image: img, product, sha256: hex };
    $("stockgo").disabled = writing;
    sayK(known ? "stockok" : "stockunknown");
  } catch (err) { sayK("error", err && err.message); }
});"""
STOCK_END_NEW = """    try { known = stockChecksum(product, raw.length, hex); } catch (_) { if (said) sayK("stockmodified"); return false; }
    if (!said && !known) return false;
    stock = { image: img, product, sha256: hex };
    $("stockgo").disabled = writing;
    if (said) sayK(known ? "stockok" : "stockunknown");
    return true;
  }
}"""

def installer(html, stock=None):
    """fm1-base's installer page as the workbench shows it: Korean instead of Japanese, the language given by the
    workbench (?lang=ko, or a message from it; no switch on the page), "your FM-1" where a backup is asked for,
    AdLib Tracker's blue, and with stock = (url, version) M-VAVE's firmware loaded with the page: one button. Each
    piece must be found once: a changed fm1-base page stops the build rather than coming out half done."""
    def swap(a, b):
        nonlocal html
        if html.count(a) != 1:
            sys.exit(f"installer.html changed: {a[:60]!r} found {html.count(a)} times")
        html = html.replace(a, b)
    ja0, en0 = html.index("  ja: {\n"), html.index("  en: {\n")
    if not ja0 < en0:
        sys.exit("installer.html changed: no Japanese table before the English one")
    html = html[:ja0] + (APP / "tools" / "installer_ko.js").read_text(encoding="utf-8") + html[en0:]
    swap('install: "Install", other: "日本語",', 'install: "Install", other: "한국어",')
    swap('<button type="button" class="lang" id="lang" lang="ja">日本語</button>', '<button type="button" class="lang" id="lang" lang="ko" hidden>한국어</button>')
    swap('bakh: "Back up first.", confirmbak: "Installing can lose what {{NAME}} has saved.",',
         'bakh: "Back up first.", confirmbak: "Installing can lose what your FM-1 has saved.",')
    if stock:
        url, ver = stock
        swap(STOCK_HEAD_OLD, STOCK_HEAD_NEW % json.dumps(url))
        swap(STOCK_MID_OLD, STOCK_MID_NEW)
        swap(STOCK_END_OLD, STOCK_END_NEW)
        swap('  <ol class="small">\n    <li><span data-t="stock1"></span>',
             f'  <p class="small" id="stockver" hidden>M-VAVE FM-1 {ver} (firmware/FM-1-stock.fwsc)</p>\n'
             '  <ol class="small" id="stocklist">\n    <li><span data-t="stock1"></span>')
    swap('let lang = "en";                                 /* English first; 日本語 is a click away */',
         'let lang = new URLSearchParams(location.search).get("lang") === "ko" ? "ko" : "en";   /* English first; the workbench may say Korean */')
    swap('$("lang").lang = lang === "ja" ? "en" : "ja";', '$("lang").lang = lang === "ko" ? "en" : "ko";')
    swap('$("lang").addEventListener("click", () => { lang = lang === "ja" ? "en" : "ja"; applyLang(); });',
         '$("lang").addEventListener("click", () => { lang = lang === "ko" ? "en" : "ko"; applyLang(); });\n'
         'addEventListener("message", (e) => { if (e.origin === location.origin && e.data && (e.data.lang === "en" || e.data.lang === "ko")) { lang = e.data.lang; applyLang(); } });')
    swap(':root { --bg: #faf4e8; --fg: #48392f; --dim: #6e5c4b; --accent: #b84a1e; --on-accent: #fff; --bad: #a3271b; --focus: #1f6fd1; }',
         ":root { " + LIGHT + " }")
    swap(':root:not([data-theme="light"]) { --bg: #1c1814; --fg: #f2e8d8; --dim: #b3a28e; --accent: #f28a5a; --on-accent: #2a140a; --bad: #ff8a73; --focus: #79adff; }',
         ':root:not([data-theme="light"]) { ' + DARK + " }")
    swap(':root[data-theme="dark"] { --bg: #1c1814; --fg: #f2e8d8; --dim: #b3a28e; --accent: #f28a5a; --on-accent: #2a140a; --bad: #ff8a73; --focus: #79adff; }',
         ':root[data-theme="dark"] { ' + DARK + " }")
    swap("  /* light: the coral and the dim brown darkened just enough for 4.5:1 on the cream (and white on the coral) */",
         "  /* AdLib Tracker II's blue (make_workbench.py): pale by day, the DOS blue by night */")
    swap("</style>", STYLE + "</style>")
    if any(0x3040 <= ord(c) <= 0x30ff for c in html):
        sys.exit("installer.html: Japanese left over")
    return html

def main(version="dev"):
    out = ROOT / "dist" / "workbench"
    pkg, emu, page = APP / "build" / "fmy262.fwsc", APP / "build" / "emu", ROOT / "dist" / "fmy262-workbench.html"
    for f, how in ((pkg, "tools/build.py ../../firmware/tracker"), (emu / "app.wasm", "tools/build.py --web ../../firmware/tracker"),
                   (page, "npm run build")):
        if not f.exists():
            sys.exit(f"no {f}: {how} first")
    raw = pkg.read_bytes()
    product = ms.product_of(raw)
    if shutil.os.path.exists(out):
        shutil.rmtree(out)
    (out / "install").mkdir(parents=True); (out / "firmware").mkdir()
    name = f"fmy262-{version}.fwsc"
    shutil.copy(pkg, out / "firmware" / name)
    boot = BASE / "web" / "m-bootloader" / f"fm1-uboot-{ms.MBOOT_VERSION}.fwsc"
    boot_name = f"m-bootloader-{ms.MBOOT_VERSION}.fwsc"
    shutil.copy(boot, out / "firmware" / boot_name)
    shutil.copy(BASE / "web" / "m-bootloader" / "LICENSE", out / "firmware" / "m-bootloader-LICENSE.txt")
    for lic in sorted((BASE / "LICENSES").glob("*.txt")):
        shutil.copy(lic, out / "firmware" / lic.name)
    shutil.copy(ROOT / "LICENSE", out / "firmware" / "GPL-2.0.txt")   # FMY262's own licence, next to the package
    shutil.copy(ROOT / "NOTICE.md", out / "firmware" / "NOTICE.md")
    st = stock_file()
    if st:
        shutil.copy(ROOT / "vendor" / "stock" / "FM-1.fwsc", out / "firmware" / "FM-1-stock.fwsc")
    html = installer((BASE / "web" / "installer.html").read_text(encoding="utf-8"),
                     ("../firmware/FM-1-stock.fwsc", "V" + str(int(st[1].split("_")[1]))) if st else None)
    lib = "\n".join(ms.strip_module((BASE / "web" / f).read_text(encoding="utf-8")) for f in ("fm1ports.js", "fm1pkg.js", "fm1ota.js"))
    meta = json.dumps({"version": version, "product": product, "pkg": "../firmware/" + name, "backup": False, "res": None,
                       "boot": {"pkg": "../firmware/" + boot_name, "version": ms.MBOOT_VERSION,
                                "sha256": hashlib.sha256(boot.read_bytes()).hexdigest()}})
    repo = os.environ.get("FMY_REPO", "")   # e.g. https://github.com/OWNER/fmy262 (the installer's licence line links it)
    for key, val in (("RES", "FMY262's data"), ("NAME", "FMY262"), ("REPO", repo),
                     ("REPO_SHORT", repo.replace("https://", "")), ("LICENSE", "GPL-2.0-or-later"), ("CREDITS", " DBOPL (GPL-2.0+), fm1-base (MPL-2.0).")):
        html = html.replace("{{" + key + "}}", val)
    (out / "install" / "index.html").write_text(html.replace("/*LIB*/", lib).replace("/*META*/", meta).replace("/*APP*/", "null"),
                                                encoding="utf-8")
    shutil.copytree(emu, out / "emu")
    (out / "emu" / "index.html").write_text(emu_page((emu / "index.html").read_text(encoding="utf-8")), encoding="utf-8")
    shutil.copytree(BASE / "web" / "fonts", out / "fonts")
    if (APP / "web" / "words").is_dir():
        shutil.copytree(APP / "web" / "words", out / "words")
    shutil.copy(page, out / "index.html")
    (out / ".nojekyll").write_text("")
    print(f"workbench: {out}: index.html, emu/ ({(emu / 'app.wasm').stat().st_size} B wasm), install/ ({product}), firmware/{name} ({len(raw)} B), "
          + (f"stock {st[1]} built in" if st else "no stock firmware built in (vendor/stock/FM-1.fwsc)"))

if __name__ == "__main__":
    main(*sys.argv[1:2])
