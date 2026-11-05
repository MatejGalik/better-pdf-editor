"""
PDF Editor – lokálny server (Flask + PyMuPDF).

Všetky súradnice, ktoré prichádzajú z / odchádzajú do prehliadača, sú v bodoch (pt)
v *zobrazenom* (otočenom) priestore stránky. PyMuPDF pracuje v *neotočenom* priestore,
preto sa prepočítavajú cez page.rotation_matrix / page.derotation_matrix.
"""

import io
import os
import re
import sys
import threading
import webbrowser

import pymupdf
from flask import Flask, jsonify, request, send_file, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
MAX_UNDO = 40

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024
lock = threading.RLock()


class State:
    doc: pymupdf.Document | None = None
    name = "dokument.pdf"
    undo: list[bytes] = []
    redo: list[bytes] = []
    version = 0


S = State()


# ---------------------------------------------------------------------------
# Pomocné funkcie
# ---------------------------------------------------------------------------

class ApiError(Exception):
    pass


@app.errorhandler(ApiError)
def _api_error(e):
    return jsonify(error=str(e)), 400


def require_doc() -> pymupdf.Document:
    if S.doc is None:
        raise ApiError("Nie je otvorený žiadny dokument.")
    return S.doc


def get_page(i) -> pymupdf.Page:
    doc = require_doc()
    try:
        i = int(i)
    except (TypeError, ValueError):
        raise ApiError("Neplatné číslo stránky.")
    if not 0 <= i < doc.page_count:
        raise ApiError("Stránka neexistuje.")
    return doc[i]


def hex_to_rgb(h: str | None, default=(0, 0, 0)):
    if not h:
        return default
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    try:
        return tuple(int(h[k:k + 2], 16) / 255 for k in (0, 2, 4))
    except ValueError:
        return default


def int_to_hex(c: int) -> str:
    return "#%06x" % (c & 0xFFFFFF)


def to_disp_rect(page, r):
    return pymupdf.Rect(r) * page.rotation_matrix


def to_unrot_rect(page, r):
    return pymupdf.Rect(r) * page.derotation_matrix


def to_unrot_point(page, p):
    return pymupdf.Point(p) * page.derotation_matrix


def rect_list(r):
    return [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)]


def doc_info():
    doc = S.doc
    if doc is None:
        return {"open": False, "version": S.version}
    return {
        "open": True,
        "name": S.name,
        "version": S.version,
        "canUndo": bool(S.undo),
        "canRedo": bool(S.redo),
        "pages": [{"w": round(p.rect.width, 2), "h": round(p.rect.height, 2),
                   "rotation": p.rotation} for p in doc],
    }


def snapshot():
    """Uloží aktuálny stav pre Späť."""
    S.undo.append(S.doc.tobytes())
    if len(S.undo) > MAX_UNDO:
        S.undo.pop(0)
    S.redo.clear()


def mutated():
    S.version += 1
    return jsonify(doc_info())


def load_bytes(data: bytes) -> pymupdf.Document:
    doc = pymupdf.open(stream=data, filetype="pdf")
    if doc.needs_pass:
        raise ApiError("PDF je chránené heslom.")
    return doc


# ---------------------------------------------------------------------------
# Fonty
# ---------------------------------------------------------------------------

WIN_FONTS = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")

# rodina -> (regular, bold, italic, bold italic)
FONT_FAMILIES = {
    "Arial": ("arial.ttf", "arialbd.ttf", "ariali.ttf", "arialbi.ttf"),
    "Calibri": ("calibri.ttf", "calibrib.ttf", "calibrii.ttf", "calibriz.ttf"),
    "Segoe UI": ("segoeui.ttf", "segoeuib.ttf", "segoeuii.ttf", "segoeuiz.ttf"),
    "Verdana": ("verdana.ttf", "verdanab.ttf", "verdanai.ttf", "verdanaz.ttf"),
    "Tahoma": ("tahoma.ttf", "tahomabd.ttf", "tahoma.ttf", "tahomabd.ttf"),
    "Trebuchet MS": ("trebuc.ttf", "trebucbd.ttf", "trebucit.ttf", "trebucbi.ttf"),
    "Times New Roman": ("times.ttf", "timesbd.ttf", "timesi.ttf", "timesbi.ttf"),
    "Georgia": ("georgia.ttf", "georgiab.ttf", "georgiai.ttf", "georgiaz.ttf"),
    "Courier New": ("cour.ttf", "courbd.ttf", "couri.ttf", "courbi.ttf"),
    "Consolas": ("consola.ttf", "consolab.ttf", "consolai.ttf", "consolaz.ttf"),
}

# podreťazec v názve pôvodného fontu -> rodina
FONT_GUESS = [
    ("calibri", "Calibri"), ("segoe", "Segoe UI"), ("verdana", "Verdana"),
    ("tahoma", "Tahoma"), ("trebuchet", "Trebuchet MS"), ("times", "Times New Roman"),
    ("georgia", "Georgia"), ("cambria", "Georgia"), ("garamond", "Times New Roman"),
    ("courier", "Courier New"), ("consolas", "Consolas"), ("mono", "Consolas"),
    ("helvetica", "Arial"), ("arial", "Arial"), ("roboto", "Arial"),
    ("opensans", "Segoe UI"), ("open sans", "Segoe UI"), ("lato", "Segoe UI"),
    ("serif", "Times New Roman"),
]


def available_families():
    return [f for f, files in FONT_FAMILIES.items()
            if os.path.exists(os.path.join(WIN_FONTS, files[0]))]


def guess_family(orig_name: str, flags: int) -> str:
    name = orig_name.split("+", 1)[-1].lower()
    avail = available_families()
    for key, fam in FONT_GUESS:
        if key in name and fam in avail:
            if key == "serif" and "sans" in name:
                continue
            return fam
    if flags & 4 and "Times New Roman" in avail:  # serif flag
        return "Times New Roman"
    return "Arial" if "Arial" in avail else (avail[0] if avail else "")


def is_bold(name: str, flags: int) -> bool:
    n = name.lower()
    return bool(flags & 16) or any(k in n for k in ("bold", "black", "heavy", "semibold", "demi"))


def is_italic(name: str, flags: int) -> bool:
    n = name.lower()
    return bool(flags & 2) or "italic" in n or "oblique" in n


def font_file(family: str, bold: bool, italic: bool) -> str | None:
    files = FONT_FAMILIES.get(family)
    if not files:
        return None
    idx = (1 if bold else 0) + (2 if italic else 0)
    for cand in (files[idx], files[1 if bold else 0], files[0]):
        path = os.path.join(WIN_FONTS, cand)
        if os.path.exists(path):
            return path
    return None


_font_cache: dict[str, pymupdf.Font] = {}


def resolve_font(family: str, bold: bool, italic: bool):
    """Vráti (alias, cesta|None, Font objekt na meranie)."""
    path = font_file(family, bold, italic)
    if path:
        alias = "E" + re.sub(r"[^A-Za-z0-9]", "", os.path.basename(path).rsplit(".", 1)[0])
        if path not in _font_cache:
            _font_cache[path] = pymupdf.Font(fontfile=path)
        return alias, path, _font_cache[path]
    # núdzový font (bez slovenskej diakritiky typu č, ľ, ť)
    base = {(False, False): "helv", (True, False): "hebo",
            (False, True): "heit", (True, True): "hebi"}[(bold, italic)]
    if base not in _font_cache:
        _font_cache[base] = pymupdf.Font(base)
    return base, None, _font_cache[base]


def write_lines(page, lines, x, baseline, size, color, family, bold, italic,
                align="left", box_x0=None, box_x1=None, line_height=1.2):
    """Zapíše riadky textu do obsahu stránky (neotočené súradnice)."""
    alias, path, font = resolve_font(family, bold, italic)
    if path:
        page.insert_font(fontname=alias, fontfile=path)
    for k, line in enumerate(lines):
        if not line:
            continue
        width = font.text_length(line, fontsize=size)
        lx = x
        if align == "center" and box_x0 is not None:
            lx = (box_x0 + box_x1) / 2 - width / 2
        elif align == "right" and box_x1 is not None:
            lx = box_x1 - width
        page.insert_text((lx, baseline + k * size * line_height), line,
                         fontsize=size, fontname=alias, color=color,
                         rotate=0)


# ---------------------------------------------------------------------------
# Zmena farby textu (prepis content streamu, zachová pôvodné fonty)
# ---------------------------------------------------------------------------

WS = b" \t\r\n\f\x00"
DELIMS = b"()<>[]{}/%"
COLOR_OPS = {b"cs", b"sc", b"scn", b"rg", b"g", b"k",
             b"CS", b"SC", b"SCN", b"RG", b"G", b"K"}
# operátory stavu, ktoré treba zopakovať, lebo text obalíme do q ... Q
STATE_SINGLE = {b"Tc", b"Tw", b"Tz", b"TL", b"Tf", b"Tr", b"Ts",
                b"w", b"J", b"j", b"M", b"d", b"ri", b"i"}
OPERAND_KEYWORDS = {b"true", b"false", b"null"}


def _skip_literal(data, i):
    depth, n = 0, len(data)
    while i < n:
        c = data[i]
        if c == 0x5C:  # backslash
            i += 2
            continue
        if c == 0x28:
            depth += 1
        elif c == 0x29:
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return n


def _find_inline_image_end(data, i):
    """i ukazuje za 'ID'. Vráti index za 'EI'."""
    n = len(data)
    i += 1  # jeden biely znak za ID
    while True:
        j = data.find(b"EI", i)
        if j < 0:
            return n
        before = data[j - 1] if j > 0 else 0x20
        after = data[j + 2] if j + 2 < n else 0x20
        if before in WS and after in WS:
            return j + 2
        i = j + 1


def recolor_content(data: bytes, rgb) -> bytes:
    """Nastaví farbu všetkého textu (BT ... ET) na rgb."""
    r, g, b = rgb
    col = b"%.4f %.4f %.4f rg %.4f %.4f %.4f RG" % (r, g, b, r, g, b)
    out = []
    n = len(data)
    i = 0
    group_start = 0
    in_bt = False
    stack = [{}]          # stav (Tf, Tc, ... gs) pre q/Q
    gs_list_key = b"gs"

    def state():
        return stack[-1]

    while i < n:
        c = data[i]
        if c in WS:
            i += 1
            continue
        if c == 0x25:  # % komentár
            while i < n and data[i] not in b"\r\n":
                i += 1
            continue
        if c == 0x28:  # (
            i = _skip_literal(data, i)
            continue
        if c == 0x3C:  # <
            if i + 1 < n and data[i + 1] == 0x3C:
                i += 2
            else:
                j = data.find(b">", i)
                i = n if j < 0 else j + 1
            continue
        if c == 0x3E:  # >>
            i += 2 if i + 1 < n and data[i + 1] == 0x3E else 1
            continue
        if c in b"[]{}":
            i += 1
            continue
        if c == 0x2F:  # /Name
            i += 1
            while i < n and data[i] not in WS and data[i] not in DELIMS:
                i += 1
            continue
        # bežný token
        s = i
        while i < n and data[i] not in WS and data[i] not in DELIMS:
            i += 1
        tok = data[s:i]
        if not tok:
            i += 1
            continue
        if tok in OPERAND_KEYWORDS or re.fullmatch(rb"[+-]?(\d+\.?\d*|\.\d+)", tok):
            continue  # operand

        # --- operátor ---
        operands = data[group_start:s]
        raw = data[group_start:i]

        if tok == b"BI":  # inline obrázok – prejdeme až za EI
            j = data.find(b"ID", i)
            while j >= 0 and not (data[j + 2:j + 3] in (b" ", b"\n", b"\r", b"\t", b"\f", b"\x00") or j + 2 >= n):
                j = data.find(b"ID", j + 1)
            if j < 0:
                i = n
            else:
                i = _find_inline_image_end(data, j + 2)
            out.append(data[group_start:i])
            group_start = i
            continue

        if tok == b"q":
            stack.append(dict(state()))
            out.append(raw)
        elif tok == b"Q":
            if len(stack) > 1:
                stack.pop()
            out.append(raw)
        elif tok == b"BT":
            in_bt = True
            restore = []
            st = state()
            for key in (b"Tf", b"Tc", b"Tw", b"Tz", b"TL", b"Tr", b"Ts",
                        b"w", b"J", b"j", b"M", b"d", b"ri", b"i"):
                if key in st:
                    restore.append(st[key])
            for g_raw in st.get(gs_list_key, []):
                restore.append(g_raw)
            out.append(operands + b"\nq BT\n" + b"\n".join(restore) + b"\n" + col + b"\n")
        elif tok == b"ET":
            in_bt = False
            out.append(raw + b" Q\n")
        elif in_bt and tok in COLOR_OPS:
            out.append(b"\n")  # farbu v texte zahodíme
        else:
            if tok in STATE_SINGLE:
                state()[tok] = raw.strip()
            elif tok == b"gs":
                state().setdefault(gs_list_key, [])
                state()[gs_list_key] = state()[gs_list_key] + [raw.strip()]
            out.append(raw)
        group_start = i

    out.append(data[group_start:])
    return b"".join(out)


def _xobject_refs(doc, xref, path):
    t, val = doc.xref_get_key(xref, path)
    if t == "dict":
        return [int(x) for x in re.findall(r"/[^\s/<>\[\]()]+\s+(\d+)\s+0\s+R", val)]
    return []


def _form_resources_path(doc, xref):
    return "Resources/XObject"


def recolor_page(doc, page, rgb, visited):
    page.clean_contents(sanitize=False)  # zlúči content streamy do jedného
    xrefs = page.get_contents()
    if xrefs:
        data = page.read_contents()
        doc.update_stream(xrefs[0], recolor_content(data, rgb))
        for x in xrefs[1:]:
            doc.update_stream(x, b" ")
    # text vo Form XObjektoch (rekurzívne)
    todo = _xobject_refs(doc, page.xref, "Resources/XObject")
    while todo:
        x = todo.pop()
        if x in visited:
            continue
        visited.add(x)
        if doc.xref_get_key(x, "Subtype")[1] != "/Form":
            continue
        try:
            stream = doc.xref_stream(x)
        except Exception:
            continue
        if stream and b"BT" in stream:
            doc.update_stream(x, recolor_content(stream, rgb))
        todo.extend(_xobject_refs(doc, x, "Resources/XObject"))


# ---------------------------------------------------------------------------
# Statické súbory
# ---------------------------------------------------------------------------

@app.get("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.get("/static/<path:p>")
def static_files(p):
    return send_from_directory(STATIC_DIR, p)


# ---------------------------------------------------------------------------
# Dokument
# ---------------------------------------------------------------------------

@app.get("/api/doc")
def api_doc():
    with lock:
        info = doc_info()
        info["fonts"] = available_families()
        return jsonify(info)


@app.post("/api/open")
def api_open():
    f = request.files.get("file")
    if not f:
        raise ApiError("Chýba súbor.")
    data = f.read()
    with lock:
        try:
            doc = load_bytes(data)
        except ApiError:
            raise
        except Exception as e:
            raise ApiError(f"Súbor sa nepodarilo otvoriť ako PDF: {e}")
        if S.doc is not None:
            S.doc.close()
        S.doc = doc
        S.name = f.filename or "dokument.pdf"
        S.undo.clear()
        S.redo.clear()
        return mutated()


@app.get("/api/download")
def api_download():
    with lock:
        doc = require_doc()
        out = pymupdf.open(stream=doc.tobytes(), filetype="pdf")
        try:
            out.subset_fonts()  # vložené fonty (Arial atď.) zmenšíme na použité znaky
        except Exception:
            pass
        data = out.tobytes(garbage=3, deflate=True, clean=False)
        out.close()
        name = S.name
    base, _ = os.path.splitext(name)
    return send_file(io.BytesIO(data), mimetype="application/pdf",
                     as_attachment=True, download_name=f"{base}_upravene.pdf")


@app.post("/api/undo")
def api_undo():
    with lock:
        if not S.undo:
            raise ApiError("Nie je čo vrátiť.")
        S.redo.append(S.doc.tobytes())
        S.doc.close()
        S.doc = load_bytes(S.undo.pop())
        return mutated()


@app.post("/api/redo")
def api_redo():
    with lock:
        if not S.redo:
            raise ApiError("Nie je čo zopakovať.")
        S.undo.append(S.doc.tobytes())
        S.doc.close()
        S.doc = load_bytes(S.redo.pop())
        return mutated()


# ---------------------------------------------------------------------------
# Stránky – vykreslenie a dáta
# ---------------------------------------------------------------------------

@app.get("/api/page/<int:i>.png")
def api_page_png(i):
    scale = min(max(float(request.args.get("scale", 1.5)), 0.1), 6)
    with lock:
        page = get_page(i)
        pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), annots=True)
        png = pix.tobytes("png")
    resp = send_file(io.BytesIO(png), mimetype="image/png")
    resp.headers["Cache-Control"] = "public, max-age=3600"
    return resp


@app.get("/api/page/<int:i>/data")
def api_page_data(i):
    with lock:
        page = get_page(i)
        d = page.get_text("dict", flags=pymupdf.TEXT_PRESERVE_WHITESPACE)
        lines = []
        for bno, block in enumerate(d["blocks"]):
            if block.get("type") != 0:
                continue
            for lno, line in enumerate(block["lines"]):
                spans = [s for s in line["spans"] if s["text"]]
                if not spans:
                    continue
                text = "".join(s["text"] for s in spans)
                if not text.strip():
                    continue
                main = max(spans, key=lambda s: len(s["text"].strip()))
                dx, dy = line["dir"]
                lines.append({
                    "id": f"{bno}-{lno}",
                    "bbox": rect_list(to_disp_rect(page, line["bbox"])),
                    "ubbox": rect_list(pymupdf.Rect(line["bbox"])),
                    "origin": [round(spans[0]["origin"][0], 2), round(spans[0]["origin"][1], 2)],
                    "text": text,
                    "size": round(main["size"], 2),
                    "color": int_to_hex(main["color"]),
                    "font": main["font"],
                    "family": guess_family(main["font"], main["flags"]),
                    "bold": is_bold(main["font"], main["flags"]),
                    "italic": is_italic(main["font"], main["flags"]),
                    "horizontal": abs(dy) < 1e-3 and dx > 0,
                })
        words = []
        for w in page.get_text("words"):
            r = to_disp_rect(page, w[:4])
            words.append([*rect_list(r), w[5], w[6]])
        annots = []
        for a in page.annots():
            annots.append({"xref": a.xref, "type": a.type[1],
                           "rect": rect_list(to_disp_rect(page, a.rect)),
                           "content": a.info.get("content", "")})
        return jsonify(lines=lines, words=words, annots=annots)


# ---------------------------------------------------------------------------
# Úprava textu (redakcia + nové vloženie)
# ---------------------------------------------------------------------------

def redact_text_only(page, urects):
    """Odstráni text v obdĺžnikoch, obrázky a grafiku nechá na pokoji."""
    for r in urects:
        r = pymupdf.Rect(r)
        h = r.height
        # zúžime na stred riadku, aby sme nezasiahli susedné riadky
        rr = pymupdf.Rect(r.x0 + 0.5, r.y0 + h * 0.3, r.x1 - 0.5, r.y1 - h * 0.3)
        if rr.is_empty:
            rr = r
        page.add_redact_annot(rr, fill=False)
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE,
                          graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
                          text=pymupdf.PDF_REDACT_TEXT_REMOVE)


@app.post("/api/edit_text")
def api_edit_text():
    j = request.get_json(force=True)
    with lock:
        page = get_page(j.get("page"))
        ubbox = pymupdf.Rect(j["ubbox"])
        origin = j["origin"]
        text = str(j.get("text", ""))
        size = float(j.get("size") or 12)
        if not 1 <= size <= 400:
            raise ApiError("Neplatná veľkosť písma.")
        snapshot()
        rot = page.rotation
        if rot:
            page.set_rotation(0)
        try:
            redact_text_only(page, [ubbox])
            lines = text.replace("\r\n", "\n").split("\n")
            if any(l.strip() for l in lines):
                write_lines(page, lines, origin[0], origin[1], size,
                            hex_to_rgb(j.get("color")), j.get("family") or "Arial",
                            bool(j.get("bold")), bool(j.get("italic")),
                            align=j.get("align", "left"),
                            box_x0=ubbox.x0, box_x1=ubbox.x1)
        finally:
            if rot:
                page.set_rotation(rot)
        return mutated()


@app.post("/api/insert_text")
def api_insert_text():
    j = request.get_json(force=True)
    with lock:
        page = get_page(j.get("page"))
        text = str(j.get("text", ""))
        if not text.strip():
            raise ApiError("Prázdny text.")
        size = float(j.get("size") or 16)
        # bod v zobrazených súradniciach = ľavý horný roh textu
        p = pymupdf.Point(j["point"])
        snapshot()
        rot = page.rotation
        up = to_unrot_point(page, p) if rot else p
        if rot:
            page.set_rotation(0)
        try:
            lines = text.replace("\r\n", "\n").split("\n")
            alias, path, font = resolve_font(j.get("family") or "Arial",
                                             bool(j.get("bold")), bool(j.get("italic")))
            if path:
                page.insert_font(fontname=alias, fontfile=path)
            color = hex_to_rgb(j.get("color"))
            asc = font.ascender if font.ascender > 0 else 0.9
            for k, line in enumerate(lines):
                if not line:
                    continue
                # posun o výšku písma v smere zobrazenia
                off = asc * size + k * size * 1.2
                if rot == 0:
                    pt = (up.x, up.y + off)
                elif rot == 90:
                    pt = (up.x + off, up.y)
                elif rot == 180:
                    pt = (up.x, up.y - off)
                else:
                    pt = (up.x - off, up.y)
                page.insert_text(pt, line, fontsize=size, fontname=alias,
                                 color=color, rotate=rot)
        finally:
            if rot:
                page.set_rotation(rot)
        return mutated()


@app.post("/api/recolor")
def api_recolor():
    j = request.get_json(force=True)
    with lock:
        doc = require_doc()
        rgb = hex_to_rgb(j.get("color"))
        if j.get("all"):
            pages = list(range(doc.page_count))
        else:
            pages = [get_page(j.get("page")).number]
        snapshot()
        visited = set()
        for pno in pages:
            recolor_page(doc, doc[pno], rgb, visited)
        return mutated()


# ---------------------------------------------------------------------------
# Anotácie
# ---------------------------------------------------------------------------

@app.post("/api/annot")
def api_annot():
    j = request.get_json(force=True)
    with lock:
        page = get_page(j.get("page"))
        kind = j.get("type")
        color = hex_to_rgb(j.get("color"), (1, 0.85, 0))
        width = float(j.get("width") or 2)
        opacity = float(j.get("opacity") or 1)
        snapshot()
        if kind in ("highlight", "underline", "strike"):
            quads = [to_unrot_rect(page, r).quad for r in j.get("rects", [])
                     if pymupdf.Rect(r).is_valid]
            if not quads:
                S.undo.pop()
                raise ApiError("Nič nie je označené.")
            fn = {"highlight": page.add_highlight_annot,
                  "underline": page.add_underline_annot,
                  "strike": page.add_strikeout_annot}[kind]
            a = fn(quads=quads)
        elif kind == "ink":
            strokes = [[tuple(to_unrot_point(page, p)) for p in s]
                       for s in j.get("strokes", []) if len(s) > 1]
            if not strokes:
                S.undo.pop()
                raise ApiError("Prázdna čiara.")
            a = page.add_ink_annot(strokes)
            a.set_border(width=width)
        elif kind in ("rect", "ellipse"):
            r = to_unrot_rect(page, j["rect"])
            a = (page.add_rect_annot if kind == "rect" else page.add_circle_annot)(r)
            a.set_border(width=width)
        elif kind == "arrow":
            p1 = to_unrot_point(page, j["p1"])
            p2 = to_unrot_point(page, j["p2"])
            a = page.add_line_annot(p1, p2)
            a.set_border(width=width)
            a.set_line_ends(pymupdf.PDF_ANNOT_LE_NONE, pymupdf.PDF_ANNOT_LE_OPEN_ARROW)
        elif kind == "note":
            p = to_unrot_point(page, j["point"])
            a = page.add_text_annot(p, str(j.get("text", "")), icon="Comment")
        else:
            S.undo.pop()
            raise ApiError("Neznámy typ anotácie.")
        a.set_colors(stroke=color)
        if kind in ("highlight",):
            a.set_opacity(min(opacity, 1))
        elif opacity < 1:
            a.set_opacity(opacity)
        a.update()
        return mutated()


@app.post("/api/annot/delete")
def api_annot_delete():
    j = request.get_json(force=True)
    with lock:
        page = get_page(j.get("page"))
        xref = int(j.get("xref"))
        target = next((a for a in page.annots() if a.xref == xref), None)
        if target is None:
            raise ApiError("Anotácia sa nenašla.")
        snapshot()
        page.delete_annot(target)
        return mutated()


@app.post("/api/annot/update")
def api_annot_update():
    """Zmena textu poznámky."""
    j = request.get_json(force=True)
    with lock:
        page = get_page(j.get("page"))
        xref = int(j.get("xref"))
        target = next((a for a in page.annots() if a.xref == xref), None)
        if target is None:
            raise ApiError("Anotácia sa nenašla.")
        snapshot()
        target.set_info(content=str(j.get("content", "")))
        target.update()
        return mutated()


@app.post("/api/whiteout")
def api_whiteout():
    """Vymaže všetko v oblasti (text, obrázky, grafiku) a vyplní farbou."""
    j = request.get_json(force=True)
    with lock:
        page = get_page(j.get("page"))
        r = to_unrot_rect(page, j["rect"])
        snapshot()
        rot = page.rotation
        if rot:
            page.set_rotation(0)
        try:
            page.add_redact_annot(r, fill=hex_to_rgb(j.get("color"), (1, 1, 1)))
            page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_PIXELS,
                                  graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED)
        finally:
            if rot:
                page.set_rotation(rot)
        return mutated()


# ---------------------------------------------------------------------------
# Operácie so stránkami
# ---------------------------------------------------------------------------

@app.post("/api/pages")
def api_pages():
    j = request.get_json(force=True)
    with lock:
        doc = require_doc()
        op = j.get("op")
        page = get_page(j.get("page"))
        i = page.number
        snapshot()
        if op == "rotate":
            page.set_rotation((page.rotation + int(j.get("angle", 90))) % 360)
        elif op == "delete":
            if doc.page_count == 1:
                S.undo.pop()
                raise ApiError("Dokument musí mať aspoň jednu stránku.")
            doc.delete_page(i)
        elif op == "move":
            to = int(j.get("to"))
            if not 0 <= to < doc.page_count or to == i:
                S.undo.pop()
                raise ApiError("Stránku nie je kam presunúť.")
            # move_page(pno, to) vkladá pred 'to'; -1 = na koniec
            if to > i:
                doc.move_page(i, to + 1 if to + 1 < doc.page_count else -1)
            else:
                doc.move_page(i, to)
        elif op == "duplicate":
            doc.fullcopy_page(i, i + 1 if i + 1 < doc.page_count else -1)
        elif op == "blank":
            r = page.rect
            doc.new_page(i + 1, width=r.width, height=r.height)
        else:
            S.undo.pop()
            raise ApiError("Neznáma operácia.")
        return mutated()


@app.post("/api/merge")
def api_merge():
    f = request.files.get("file")
    if not f:
        raise ApiError("Chýba súbor.")
    data = f.read()
    with lock:
        doc = require_doc()
        try:
            other = load_bytes(data)
        except ApiError:
            raise
        except Exception as e:
            raise ApiError(f"Súbor sa nepodarilo otvoriť: {e}")
        snapshot()
        doc.insert_pdf(other)
        other.close()
        return mutated()


# ---------------------------------------------------------------------------

def main():
    port = int(os.environ.get("PORT", 5173))
    url = f"http://127.0.0.1:{port}/"
    if "--no-browser" not in sys.argv:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    print(f"PDF Editor beží na {url}  (ukončíš Ctrl+C)")
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
