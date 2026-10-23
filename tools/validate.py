"""Validador del proyecto TestRA.

Comprueba:
  - Existencia/legibilidad de assets/19.jpg e iconos.
  - Coordenadas de los puntos A y B y URL de YouTube.
  - Referencias a recursos locales (src/href/url/import) y rutas absolutas.
  - Sintaxis: manifest JSON, JS (node si existe), Python (py_compile).

Uso: python tools/validate.py
Salida: 0 si todo OK, 1 si hay errores.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXPECTED = {
    "A": (19.464361, -99.107778),
    "B": (19.464472, -99.107944),
}
YOUTUBE_ID = "3HYOR3SYRpQ"
YOUTUBE_URL = "https://www.youtube.com/watch?v=" + YOUTUBE_ID

LOCAL_FILES = {
    "index.html", "manifest.webmanifest", "sw.js",
    "css/style.css", "js/config.js", "js/app.js",
    "assets/19.jpg",
    "assets/icons/icon-180.png", "assets/icons/icon-192.png",
    "assets/icons/icon-512.png", "assets/icons/icon-maskable-512.png",
}

errors = []
warnings = []


def err(msg):
    errors.append(msg)
    print("  [ERROR] " + msg)


def warn(msg):
    warnings.append(msg)
    print("  [WARN]  " + msg)


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def check_file(rel):
    p = os.path.join(ROOT, rel.replace("/", os.sep))
    if not os.path.isfile(p):
        err("Falta el archivo: " + rel)
        return None
    return p


def load_config():
    cfg_path = os.path.join(ROOT, "js", "config.js")
    txt = read(cfg_path)
    m = re.search(r"window\.CONFIG\s*=\s*(\{.*\})\s*;\s*$", txt, re.S)
    if not m:
        err("No se pudo extraer CONFIG de js/config.js")
        return None
    try:
        return json.loads(m.group(1))
    except Exception as e:
        err("CONFIG no es JSON válido: " + str(e))
        return None


def main():
    print("== Comprobando archivos locales ==")
    for f in sorted(LOCAL_FILES):
        if check_file(f) is None:
            continue
        print("  OK     " + f)

    print("== Comprobando assets/19.jpg ==")
    img = os.path.join(ROOT, "assets", "19.jpg")
    if os.path.isfile(img) and os.path.getsize(img) > 0:
        with open(img, "rb") as fh:
            head = fh.read(3)
        if head == b"\xff\xd8\xff":
            print("  OK     JPEG válido (%d bytes)" % os.path.getsize(img))
        else:
            err("assets/19.jpg no es un JPEG válido")
    else:
        err("assets/19.jpg no existe o está vacío")

    print("== Comprobando configuración ==")
    cfg = load_config()
    if cfg:
        points = cfg.get("points", [])
        for p in points:
            pid = p.get("id")
            lat = p.get("lat")
            lng = p.get("lng")
            exp = EXPECTED.get(pid)
            if exp is None:
                err("Punto desconocido: %s" % pid)
                continue
            if abs(lat - exp[0]) > 1e-9 or abs(lng - exp[1]) > 1e-9:
                err("Punto %s: coordenadas incorrectas (%.6f, %.6f), se esperaba (%.6f, %.6f)"
                    % (pid, lat, lng, exp[0], exp[1]))
            else:
                print("  OK     Punto %s (%s): (%.6f, %.6f)" % (pid, p.get("name"), lat, lng))
            if p.get("radius") is None or p.get("radius") <= 0:
                err("Punto %s: radio inválido" % pid)
            if p.get("heightM", 0) < 3:
                warn("Punto %s: altura virtual < 3 m" % pid)
            if p.get("type") == "youtube":
                if p.get("youtube") != YOUTUBE_URL:
                    err("Punto %s: URL de YouTube incorrecta: %s" % (pid, p.get("youtube")))
                else:
                    print("  OK     Punto %s: YouTube %s" % (pid, YOUTUBE_URL))
            elif p.get("type") == "image":
                if p.get("src") != "assets/19.jpg":
                    err("Punto %s: src de imagen incorrecto: %s" % (pid, p.get("src")))
                else:
                    print("  OK     Punto %s: imagen assets/19.jpg" % pid)
        if cfg.get("debounceMs") is None:
            err("Falta debounceMs en la configuración")

    print("== Comprobando referencias y rutas absolutas ==")
    for rel in ("index.html", "manifest.webmanifest", "sw.js",
                "css/style.css", "js/config.js", "js/app.js"):
        p = os.path.join(ROOT, rel.replace("/", os.sep))
        if not os.path.isfile(p):
            continue
        txt = read(p)
        if re.search(r"[A-Za-z]:\\", txt):
            err("Ruta absoluta de Windows detectada en " + rel)
        if re.search(r"https?://(?!www\.youtube|www\.youtube-nocookie)[^\s\"')]*", txt):
            warn("Posible referencia http(s) externa no YouTube en " + rel)
        # Referencias relativas ./
        for m in re.finditer(r'(?:src|href|url)\s*[=(]\s*["\'](\./[^"\']+)["\']', txt):
            target = m.group(1).split("#")[0].split("?")[0]
            if target.endswith("/") or target == "./":
                continue
            if not os.path.isfile(os.path.join(ROOT, target.replace("/", os.sep))):
                err("Referencia rota en %s: %s" % (rel, m.group(1)))

    print("== Comprobando sintaxis ==")
    # Manifest JSON
    mpath = os.path.join(ROOT, "manifest.webmanifest")
    try:
        json.loads(read(mpath))
        print("  OK     manifest.webmanifest (JSON válido)")
    except Exception as e:
        err("manifest.webmanifest inválido: " + str(e))

    # JS con node si existe
    import shutil
    node = shutil.which("node")
    if node:
        import subprocess
        for rel in ("js/config.js", "js/app.js", "sw.js"):
            r = subprocess.run([node, "--check", os.path.join(ROOT, rel.replace("/", os.sep))],
                               capture_output=True, text=True)
            if r.returncode == 0:
                print("  OK     " + rel + " (sintaxis node)")
            else:
                err(rel + ": " + r.stderr.strip())
    else:
        warn("node no disponible; no se verificó la sintaxis JS")

    # Python
    import py_compile
    for rel in ("tools/gen_icons.py", "tools/validate.py"):
        p = os.path.join(ROOT, rel.replace("/", os.sep))
        try:
            py_compile.compile(p, doraise=True)
            print("  OK     " + rel + " (py_compile)")
        except Exception as e:
            err(rel + ": " + str(e))

    print()
    print("Errores: %d   Avisos: %d" % (len(errors), len(warnings)))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
