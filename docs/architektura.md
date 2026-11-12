# Architektúra

```
prehliadač (static/app.js)  ──HTTP/JSON──▶  Flask (server.py)  ──▶  PyMuPDF (pymupdf.Document v pamäti)
      ▲   PNG obrázky strán + JSON dáta (riadky, slová, anotácie)   │
      └──────────────────────────────────────────────────────────────┘
```

Celý PDF dokument žije **na serveri v pamäti**. Prehliadač nikdy nepracuje s PDF priamo: zobrazuje
PNG obrázky strán, ktoré vykreslí PyMuPDF, a cez ne kreslí priehľadnú SVG vrstvu na interakciu.
Server beží iba na `127.0.0.1`, súbory nikam neodchádzajú.

## Backend (`server.py`)

### Stav
- `DOCS: dict[str, DocState]` – otvorené dokumenty (záložky). Poradie vloženia = poradie záložiek.
- `DocState`: `id`, `doc` (pymupdf.Document), `name`, `undo`/`redo` (zoznamy bajtov celého PDF),
  `version` (zvyšuje sa pri každej zmene), `saved_version` (verzia pri otvorení alebo poslednom stiahnutí).
  `dirty = version != saved_version`.
- Blueprint `dbp` s prefixom `/api/docs/<doc_id>`: `url_value_preprocessor` nájde dokument a uloží ho
  do `g.D`. `S = LocalProxy(lambda: g.D)`, takže kód endpointov píše jednoducho `S.doc`, `S.version`…
- Globálny `lock` (RLock) chráni všetky prístupy k dokumentom.

### Automatické ukladanie
Po každej zmene (`mutated()`), pri otvorení aj po stiahnutí sa dokument zapíše do
`%LOCALAPPDATA%\PDF Editor\autosave\<id>\` (`doc.pdf` + `meta.json`: meno, verzia, uložená verzia,
poradie). Zápis je atomický (dočasný súbor → `fsync` → `os.replace`), takže pri výpadku ostane buď
starý, alebo nový stav, nikdy rozbitý súbor. Pri štarte servera `autosave_restore()` obnoví záložky
s rovnakými ID. Zatvorenie záložky zálohu zmaže. História Späť/Znova sa **neukladá**. Priečinok sa dá
zmeniť premennou `PDF_EDITOR_AUTOSAVE`. Chyba zápisu úpravu nezastaví, vráti sa v `autosaveError`.

### Späť / Znova
`snapshot()` pred každou zmenou uloží `doc.tobytes()` do `undo` (max. `MAX_UNDO` = 40) a vymaže `redo`.
Undo/redo dokument znovu otvorí z bajtov. Je to jednoduché a robustné; pri veľkých PDF to stojí pamäť
(40 × veľkosť súboru na dokument).

### Vykresľovanie
`GET /page/<i>.png?scale=` → `page.get_pixmap(matrix=scale)` vrátane anotácií. Frontend posiela
`scale = zoom × devicePixelRatio` zaokrúhlené na 0,25 a v URL aj `v=<version>`, takže cache
prehliadača sa po zmene sama zneplatní.

### Súradnice
| Priestor | Kto ho používa |
|---|---|
| zobrazený (otočený), pt | prehliadač: SVG `viewBox` = `0 0 šírka výška` strany |
| neotočený, pt | PyMuPDF: `get_text`, anotácie, `insert_text`, redakcie |

Prevody: `to_disp_rect` (× `page.rotation_matrix`) a `to_unrot_rect` / `to_unrot_point`
(× `page.derotation_matrix`). Dáta riadkov posielajú obe verzie: `bbox` (na zobrazenie) aj `ubbox`
a `origin` (neotočené, posielajú sa späť pri úprave).

### Fonty
`FONT_FAMILIES` mapuje rodiny na súbory v `C:\Windows\Fonts` (regular/bold/italic/bold-italic).
`guess_family` odhadne rodinu podľa názvu pôvodného fontu (`ABCDEF+Calibri-Bold` → Calibri).
Ak súbor chýba, použije sa vstavaný `helv` (ten **nemá** č, ľ, ť…). Pri stiahnutí sa volá
`subset_fonts()`, takže vložené systémové fonty sa zmenšia na použité znaky.

## Frontend (`static/app.js`)

Jeden súbor bez frameworku, rozdelený komentármi na sekcie:

1. **Ikony a pomocné funkcie** – `api()`, `mutate(op, payload)` (POST na `/api/docs/<aktívne id>/<op>`,
   potom `applyInfo`), `docBase()`, `stamp()`.
2. **Dokument a stránky** – `applyInfo(info)` je jediný vstup po každej zmene: zahodí cache dát,
   zosynchronizuje DOM strán (`syncPages`), miniatúry (`syncThumbs`) a záložky (`renderTabs`).
   Strany sa načítavajú lenivo cez `IntersectionObserver` (`ensureImage`, `ensureData`).
   Nový obrázok sa najprv prednačíta a až potom vymení, aby stránka neblikala.
3. **Nástroje** – `onPointerDown/Move/Up` na SVG vrstve; náhľad sa kreslí do `<g class="preview">`,
   trvalé prvky (rámčeky riadkov, anotácií) do `<g class="base">` cez `renderOverlay`.
   Výber textu na zvýraznenie ide po slovách (`nearestWord`, `selectionRects`) v poradí z PDF.
   **Obrázky:** v režime výberu sa dá vybrať obrázok (`st.selImage`) → Ctrl+C / Ctrl+X ho zapíše
   do systémovej schránky (`navigator.clipboard.write`, PNG z `/image/<xref>.png`) a zapamätá
   v `st.imgClip` (záloha + pôvodná veľkosť v pt). Ctrl+V (udalosť `paste`), tlačidlo „Obrázok“
   alebo pustenie obrázka myšou spustí `startPlacement`: obrázok sa zobrazí ako `.img-place`
   (posun, zmena veľkosti rohom) a do PDF sa zapíše až po Enter / „Vložiť“ / kliku mimo
   (`commitPlacement` → `insert_image`). Iné formáty než PNG/JPEG sa najprv prevedú cez canvas na PNG.
4. **Textový editor** – `openEditor` / `commitEditor` / `closeEditor` (vracia Promise, aby sa dalo
   pred prepnutím záložky počkať na uloženie).
5. **Záložky** – `openFiles` (viac súborov naraz), `switchDoc` (uloží a obnoví zoom, scroll a stranu
   cez `st.views`), `closeDoc`, `renderTabs`. Pri štarte sa záložky obnovia z `GET /api/docs`,
   takže F5 nič nestratí. Stratí ich až reštart servera.

### Zahadzovanie neaktuálnych odpovedí
`stamp()` = `"<docId>:<version>"`. Asynchrónne načítania (`ensureData`, `ensureImage`) si stamp
zapamätajú a výsledok použijú, len ak sa medzitým nezmenil dokument ani verzia.
`mutate` ignoruje odpoveď, ak sa medzitým prepla záložka.
