# REST API

Všetky odpovede sú JSON (okrem PNG a PDF). Chyba = HTTP 400 s `{"error": "slovenská správa"}`.
Súradnice sú v bodoch (pt) v **zobrazenom** priestore strany, ak nie je uvedené inak. Farby: `"#rrggbb"`.

Mutačné endpointy (označené ✎) vracajú **info o dokumente**:
```json
{ "id": "a1b2c3d4e5f6", "name": "prezentacia.pdf", "pageCount": 12, "dirty": true,
  "open": true, "version": 7, "canUndo": true, "canRedo": false,
  "pages": [{ "w": 960, "h": 540, "rotation": 0 }] }
```

## Dokumenty (záložky)
| Metóda | Cesta | Popis |
|---|---|---|
| GET | `/api/docs` | `{docs: [{id, name, pageCount, dirty}], fonts: ["Arial", …]}` |
| POST | `/api/docs` | multipart, pole `file` (môže sa opakovať) → `{opened: [info…], errors: ["…"]}`; chybné súbory sa preskočia |
| GET | `/api/docs/<id>` | info o dokumente |
| DELETE | `/api/docs/<id>` | zatvorí dokument |
| GET | `/api/docs/<id>/download` | stiahne PDF (`<meno>_upravene.pdf`), nastaví `dirty=false` |
| POST ✎ | `/api/docs/<id>/undo`, `/redo` | späť / znova |

Ďalej sa `/api/docs/<id>` skracuje na `…`.

## Stránky
| Metóda | Cesta | Telo / popis |
|---|---|---|
| GET | `…/page/<i>.png?scale=1.5` | vykreslená strana (s anotáciami) |
| GET | `…/page/<i>/data` | `{lines, words, annots}` – pozri nižšie |
| POST ✎ | `…/pages` | `{op, page, …}`: `rotate` (`angle` ±90), `delete`, `move` (`to`), `duplicate`, `blank` |
| POST ✎ | `…/merge` | multipart `file` – pripojí PDF na koniec |

`data`:
- `lines[]`: `{id, bbox, ubbox, origin, text, size, color, font, family, bold, italic, horizontal}`.
  `ubbox` a `origin` (účiarie) sú v **neotočenom** priestore a posielajú sa späť do `edit_text`.
- `words[]`: `[x0, y0, x1, y1, blok, riadok]` v poradí čítania.
- `annots[]`: `{xref, type, rect, content}`.

## Text
| Metóda | Cesta | Telo |
|---|---|---|
| POST ✎ | `…/edit_text` | `{page, ubbox, origin, text, size, color, family, bold, italic, align}` – nahradí riadok; `text: ""` ho zmaže; `\n` = ďalšie riadky |
| POST ✎ | `…/insert_text` | `{page, point, text, size, color, family, bold, italic}` – `point` = ľavý horný roh |
| POST ✎ | `…/recolor` | `{page, color, all}` – farba všetkého textu na strane (`all: true` = celý dokument) |
| POST ✎ | `…/whiteout` | `{page, rect, color}` – natrvalo vymaže všetko v obdĺžniku |

## Anotácie
| Metóda | Cesta | Telo |
|---|---|---|
| POST ✎ | `…/annot` | `{page, type, color, width?, …}` podľa typu: |
| | | `highlight` / `underline` / `strike`: `rects: [[x0,y0,x1,y1]…]` |
| | | `ink`: `strokes: [[[x,y]…]…]` · `rect` / `ellipse`: `rect` · `arrow`: `p1`, `p2` · `note`: `point`, `text` |
| POST ✎ | `…/annot/delete` | `{page, xref}` |
| POST ✎ | `…/annot/update` | `{page, xref, content}` – text poznámky |
