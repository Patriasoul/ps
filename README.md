# PatriaSoul

**Hrvatska. Znanje. Zajedništvo.**

Ovaj repozitorij trenutačno sadrži PatriaSoul zajednicu i postojeće aktivne funkcije. Stari sustav članaka i kategorija više nije dio aktualne strukture portala.

## Što ostaje

- `index.html` — naslovnica zajednice
- `stranice/domoljubni-forum.html` — forum i moderacija rasprava
- `stranice/poruke-obavijesti.html` — privatne poruke i obavijesti
- `stranice/vrijeme.html` — vremenski podaci i prognoza za Hrvatsku
- `stranice/na-danasnji-dan.html` — povijesni događaji i datumi
- `stranice/prijava.html`, `stranice/registracija.html`, `stranice/racun.html` — korisnički računi
- `stranice/administracija.html` — moderacija foruma, prijavljenih priča, ankete i upravljanje ovlastima
- `stranice/pretraga.html` — pretraživanje postojećih javnih stranica
- `kviz/` — React/Vite aplikacija Hrvatskog kviza sa Supabase integracijom
- `assets/` — zajednički CSS, JavaScript i vizualni materijali
- `data/` — podaci za kviz, vrijeme, rubriku „Na današnji dan” i indeks pretraživanja
- `scripts/qa/` — automatske provjere strukture, zajednice i internih poveznica
- `.github/workflows/pages.yml` — provjera, izgradnja i objava portala

## Što je uklonjeno iz aktivnog sustava

- stare mape članaka i kategorija
- indeks poveznica na obrisane članke
- automatsko generiranje statičkih CMS članaka
- CMS/RSS uredničke kartice i skripte iz administratorskog sučelja
- Workerov povratni prikaz CMS članaka i stari RSS proxy

Stari RSS nacrti i sinkronizacija baze znanja više se ne pokreću automatski. Njihovi se tijekovi rada mogu pokrenuti samo ručno ako se kasnije odluči da su ponovno potrebni.

## Pravilo održavanja

- Forum, kviz, korisnički računi, poruke i obavijesti, vrijeme i „Na današnji dan” čuvamo.
- Ne vraćamo poveznice na stranice koje ne postoje.
- Ne dodajemo nove funkcije dok se postojeća struktura ne provjeri.
- Promjene se najprije provjeravaju na radnoj grani; produkcijska objava dopuštena je samo s grane `main`.

## Uredničko načelo

> PatriaSoul ne nabraja Hrvatsku. PatriaSoul istražuje, provjerava i pripovijeda njezine priče.

Činjenica prije senzacije. Izvor prije tvrdnje. Sjećanje ima svoje mjesto, ali jasno razlikujemo činjenicu, tumačenje, svjedočanstvo i predaju.
