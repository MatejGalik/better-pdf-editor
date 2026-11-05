# CLAUDE.md

Lokálny PDF editor: Flask + PyMuPDF backend (`server.py`) a vanilla JS frontend (`static/`), **bez build kroku**.
UI, komentáre aj hlásenia sú po slovensky – drž sa toho.

## Spustenie
```powershell
.\.venv\Scripts\python.exe server.py              # http://127.0.0.1:5173, otvorí prehliadač
$env:PORT=5199; .\.venv\Scripts\python.exe server.py --no-browser   # na testy
```
Prvé nastavenie: `python -m venv .venv` a `.venv\Scripts\pip install -r requirements.txt` (alebo `start.bat`).

## Štruktúra
- `server.py` – celý backend: stav dokumentov, REST API, úprava textu, prefarbenie, anotácie, stránky.
- `static/app.js` – celý frontend (záložky, vykresľovanie strán, nástroje, textový editor).
- `static/index.html`, `static/style.css` – rozloženie a štýly.
- `docs/` – podrobná dokumentácia: [architektúra](docs/architektura.md), [API](docs/api.md), [úprava textu a prefarbenie](docs/uprava-textu.md).

## Pravidlá, ktoré nie sú zrejmé z kódu
- **Súradnice:** prehliadač posiela a dostáva body (pt) v *zobrazenom* (otočenom) priestore strany; PyMuPDF
  extrakcia a anotácie pracujú v *neotočenom* priestore. Prevod iba cez `to_disp_rect` / `to_unrot_*`.
  Pri zápise textu na otočenú stranu sa dočasne volá `page.set_rotation(0)` (pozri `api_edit_text`).
- **Každá zmena dokumentu** musí: zavolať `snapshot()` *pred* zmenou (Späť), pri chybe po snapshote urobiť
  `S.undo.pop()`, a vrátiť `mutated()` (zvýši verziu → frontend prenačíta strany).
- **Viac dokumentov:** endpointy nad dokumentom patria do blueprintu `dbp` (`/api/docs/<doc_id>/...`);
  `S` je proxy na aktuálny `DocState` (`g.D`). Nový endpoint = `@dbp.post("/nieco")`, nie `@app`.
- Všetko, čo siaha na `pymupdf.Document`, musí bežať pod `with lock:` (Flask je viacvláknový).
- **Úprava textu = redakcia (typ B):** text sa naozaj odstráni (`apply_redactions` len s `text=REMOVE`,
  obrázky/grafika ostávajú) a nový sa zapíše fontom z `C:\Windows\Fonts`. Nemeniť na „biely obdĺžnik“.
- **Prefarbenie** prepisuje content stream (`recolor_content`), nesmie meniť fonty ani pozície textu.
- Frontend: zmeny dokumentu cez `mutate('<relatívna cesta>', payload)`; odpovede z iného dokumentu/verzie
  zahadzuje `stamp()`. Žiadne frameworky ani npm závislosti bez dohody.

## Testovanie
Automatické testy zatiaľ nie sú. Overuj:
1. API cez `server.app.test_client()` na vygenerovanom PDF (PyMuPDF vie vytvoriť testovaciu prezentáciu).
2. UI v prehliadači (napr. Playwright s `channel="msedge"`) – otvoriť, upraviť riadok, zvýrazniť, prefarbiť,
   prepnúť záložku, uložiť – a pozrieť sa na vykreslené PNG (`/api/docs/<id>/page/<i>.png`).
3. `node --check static/app.js` po úpravách JS.

## Git
- `start.bat` musí mať CRLF (vynútené cez `.gitattributes`), inak dvojklik vo Windows nefunguje.
- `.venv/` sa necommituje.
