# PatriaSoul

PatriaSoul je interaktivna zajednica usmjerena na hrvatsko znanje, kvizove, razgovor i čuvanje nasljeđa.

## Glavne funkcije

- `kviz/` — React/Vite aplikacija: Hrvatski kviz, Dnevni kviz, Brani svoj grad, korisnički račun, rezultati, XP, rang-lista i zajednički komentari.
- `stranice/domoljubni-forum.html` — forum koji koristi Supabase.
- `stranice/poruke-obavijesti.html` — privatne poruke i obavijesti korisnika.
- `stranice/prijava.html`, `registracija.html`, `racun.html` — korisnički računi.
- `stranice/vrijeme.html` — vremenska stranica.
- `stranice/na-danasnji-dan.html` — dnevni povijesni podaci.
- `cuvari-nasljedja/prijavi-pricu.html` — prijava priče ili uspomene.
- `stranice/administracija.html` — ulazna ploča za ovlaštene administratore.

## Razvoj i objava

Kviz se gradi naredbama `npm install` i `npm run build` iz mape `kviz/`. GitHub Actions provjerava strukturu, gradi kviz i objavljuje statičke datoteke putem Cloudflare Workera.

Za objavu su potrebne GitHub Actions tajne `CLOUDFLARE_API_TOKEN` i `CLOUDFLARE_ACCOUNT_ID`.

## Sigurnost

Klijentska provjera administratorske uloge služi samo za prikaz sučelja; pristup osjetljivim podacima mora biti ograničen Supabase RLS pravilima i sigurnim RPC funkcijama. Nikada ne stavljati service-role ključeve u klijentske datoteke.

## Načela

- Kviz, korisnički računi, forum, privatne poruke i obavijesti ostaju sačuvani.
- Stari sustav članaka i kategorijskih stranica uklanja se iz aktivne strukture.
- Promjene se provjeravaju na zasebnoj grani prije spajanja u `main`.
