# Úprava textu a prefarbenie

Toto sú dve najťažšie časti editora. V PDF nie sú odstavce, iba príkazy typu „na súradnice X, Y
nakresli tieto glyfy týmto fontom“. Fonty sú navyše často orezané iba na použité znaky.

## Úprava riadku (`POST …/edit_text`)

Zvolený prístup je **redakcia + nové vloženie** („typ B“):

1. Frontend pošle `ubbox` a `origin` riadku z `page/<i>/data` (neotočené súradnice).
2. `redact_text_only` pridá redakčnú anotáciu na **zúžený** obdĺžnik (stredných 40 % výšky riadku),
   aby nezasiahla susedné riadky, ktorých rámčeky sa môžu prekrývať.
3. `apply_redactions(images=NONE, graphics=NONE, text=REMOVE)` odstráni z content streamu **iba text**.
   Pozadie, obrázky a tvary ostanú nedotknuté.
4. `write_lines` zapíše nový text na pôvodné účiarie (`origin`) fontom z Windows
   (`resolve_font` → `page.insert_font` + `page.insert_text`). Zarovnanie `center` / `right`
   sa počíta podľa šírky textu (`Font.text_length`) voči pôvodnému `ubbox`.

Prečo nie „biely obdĺžnik cez text“: na farebnom pozadí alebo obrázku by bol viditeľný a pôvodný
text by v súbore ostal (dal by sa skopírovať aj vyhľadať).

Obmedzenia:
- Upravuje sa celý riadok (`line` z `get_text("dict")`). Riadok s viacerými štýlmi dostane štýl
  najdlhšieho úseku (`span`).
- Nový text sa nezalamuje; ďalšie riadky sa pridajú cez `\n` s rozostupom 1,2 × veľkosť písma.
- Upravujú sa iba vodorovné riadky (`horizontal`); otočený text nie.
- Skenované PDF nemá textovú vrstvu, preto v ňom nie je čo upravovať (bolo by treba OCR).

## Prefarbenie textu (`POST …/recolor`)

Cieľ: zmeniť farbu textu **bez zmeny fontu a pozície**. Preto sa text neodstraňuje, ale prepíše sa
content stream (`recolor_content`):

1. `page.clean_contents(sanitize=False)` zlúči content streamy strany do jedného.
2. Jednoduchý tokenizér prejde stream a správne preskočí reťazce `(…)`, hex reťazce `<…>`,
   slovníky, mená, komentáre a inline obrázky `BI … ID … EI`.
3. Každý textový objekt `BT … ET` sa prepíše na
   `q BT <obnovený stav> r g b rg r g b RG … ET Q` a všetky farebné operátory vo vnútri
   (`cs sc scn rg g k` a ich stroke verzie) sa zahodia.
4. **Prečo `q … Q`:** farba nastavená vo vnútri `BT/ET` platí aj po `ET`. Bez obalenia by sa
   prefarbili aj tvary nakreslené po texte.
5. **Prečo „obnovený stav“:** `q/Q` obnoví aj textový stav (`Tf`, `Tc`, `TL`… a `gs`). Niektoré PDF
   nastavia font v jednom `BT` a používajú ho v ďalšom. Tokenizér si preto pamätá posledné hodnoty
   týchto operátorov (so zásobníkom pre `q/Q`) a za každé `BT` ich zopakuje.
6. Rekurzívne sa spracujú aj Form XObjekty strany (`Resources/XObject`, `Subtype /Form`).

Obmedzenia:
- Form XObjekt zdieľaný viacerými stranami (napr. päta šablóny) sa prefarbí všade.
- Text vyplnený vzorom alebo prechodom sa zmení na plnú farbu. Text v orezávacom režime
  (`Tr 7`) s obrázkom pod ním sa nezmení.
- Text v anotáciách (napr. FreeText) sa neprefarbuje.

## Zvýraznenie
Štandardné PDF zvýraznenie (`add_highlight_annot`) používa režim prelínania *Multiply*,
preto je na tmavom pozadí takmer neviditeľné. Ak to bude prekážať, alternatívou je polopriehľadný
obdĺžnik (`add_rect_annot` s výplňou a `set_opacity`).
