# Vema prezentér — proof of concept

Funkční ukázka aplikace pro obchodníky Vema: z jedné knihovny obsahu sestaví
prezentaci na míru zákazníkovi a z ní i **namluvené MP4 video**. Projekt vychází
z reálné prezentace **Seyfor Vema v1.4** a z dokumentu **Nabídka VZOR**.

> Data jsou veřejné informace Vema. Jediné, co se posílá mimo server, je text
> komentáře do Microsoft Edge TTS při generování videa.

## Co aplikace umí

1. **Výběr zákazníka** – organizace, segment (veřejná správa, zdravotnictví,
   školství, komerce), obchodník, datum, odkaz na Excel.
2. **Kolo oblastí** – 6 oblastí, kliknutím vyberete celou skupinu modulů.
   Konkrétní moduly jdou zapínat a vypínat v seznamu, hledat textem a filtrovat.
3. **Knihovna 30 modulů** – texty, odrážky a komentáře pro voice-over.
   Nový modul (např. připravovaný TRO) stačí přidat v administraci, kolo se
   přizpůsobí samo.
4. **Souhrnná obrazovka** – rozsah nabídky, volitelný odkaz na Excel, poznámka.
   Souhrnný slide žádnou cenu neuvádí.
5. **Pevné bloky Vema** – titul, o společnosti, reference, souhrn, kontakt.
6. **Reference** – originální slidy s logy zákazníků podle segmentu.
7. **Náhled prezentace** – všech slidů, včetně úpravy komentáře pro voice-over.
8. **Export PPTX** – plně editovatelný PowerPoint 16:9 (PptxGenJS). Komentáře
   jsou i v poznámkách slidů.
9. **Export MP4** – český namluvený komentář (Edge TTS), obrázky z reálného PPTX
   (LibreOffice → PDF → PNG) a spojení přes FFmpeg. Délka slidu se řídí délkou
   namluvení.
10. **Přihlášení a role** – heslo obchodníka (výběr modulů, náhled, export
    PPTX/MP4) a heslo administrátora (navíc knihovna obsahu a úpravy komentářů).
11. **Administrace** – moduly, texty, komentáře, pevné bloky, reference,
    obchodníci, záloha/import JSON, návrat k demo datům.

### Změny oproti původní prezentaci

- **Výběrová řízení byla odstraněna.**
- **Přidán ODZ** – Osobní dotazník zaměstnance.
- **Přidán JMHZ** – Jednotné měsíční hlášení zaměstnavatelů.
- **Ceny nejsou součástí prezentace.** Moduly cenu nemají a souhrnný slide
  žádnou cenu ani cenový blok neuvádí; cenová nabídka se posílá zvlášť.
- Vzhled je modernizovaný, ale obsah a struktura vycházejí z originálu.

## Rychlý start

Potřebujete **Node.js 20+**. Pro export videa navíc **LibreOffice**, **FFmpeg**
a `pdftoppm` (Poppler).

```bash
npm install
npm run dev
# http://localhost:5173
```

Bez nastavených hesel se ve vývoji použijí výchozí `obchodnik` / `admin`
(server to vypíše do konzole). V produkci (`NODE_ENV=production`) server bez
`USER_PASSWORD` a `ADMIN_PASSWORD` nenastartuje.

## Přihlášení

| Proměnná | Význam |
|---|---|
| `USER_PASSWORD` | heslo obchodníka – sestavení prezentace, náhled, export PPTX/MP4 |
| `ADMIN_PASSWORD` | heslo administrátora – navíc knihovna obsahu, úpravy komentářů, reset dat |
| `SESSION_SECRET` | náhodný řetězec pro podpis cookie (doporučeno; jinak se odvodí z hesel) |
| `SESSION_HOURS` | jak dlouho platí přihlášení (výchozí 12 h) |

Přihlášení vydá podepsanou HttpOnly cookie. Oprávnění kontroluje server – obchodník
nemůže měnit obsah ani přes API (vrací 403). Po 10 chybných pokusech z jedné IP se
přihlašování na 15 minut zablokuje. Změnou hesla se odhlásí všichni (pokud není
nastaven `SESSION_SECRET`). Vzor je v `.env.example`. Původní `APP_PASSWORD` se
bere jako heslo obchodníka.

Produkční režim:

```bash
npm run build
npm start
# http://localhost:8787
```

### Windows

```powershell
winget install OpenJS.NodeJS.LTS
winget install TheDocumentFoundation.LibreOffice
winget install Gyan.FFmpeg
```

`pdftoppm` je součástí Poppleru. Pokud není v PATH:

```powershell
$env:SOFFICE_PATH  = "C:\Program Files\LibreOffice\program\soffice.exe"
$env:FFMPEG_PATH   = "C:\ffmpeg\bin\ffmpeg.exe"
$env:FFPROBE_PATH  = "C:\ffmpeg\bin\ffprobe.exe"
$env:PDFTOPPM_PATH = "C:\poppler\bin\pdftoppm.exe"
```

## Hlasy pro voice-over

Výchozí je **Microsoft Edge TTS** (zdarma, bez klíče). Přirozenější hlasy se zapnou
nastavením klíče – v aplikaci se pak objeví v nabídce „Hlas“ nad tlačítkem pro video,
včetně přehrávače s krátkou ukázkou (ukázka se vygeneruje jednou a uloží).

| Poskytovatel | Proměnné | Poznámka |
|---|---|---|
| ElevenLabs (Multilingual v2) | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICES="Petra:voiceId,Jan:voiceId"` | nejpřirozenější; hlasy vyberte ve Voice Library (filtr Czech) |
| Google Chirp 3: HD | `GOOGLE_TTS_API_KEY` (volitelně `GOOGLE_TTS_VOICES`) | cs-CZ, zpracování v EU (`eu-texttospeech.googleapis.com`) |
| Edge TTS | – | Vlasta, Antonín; vždy k dispozici |

Poskytovateli se posílá text komentáře (včetně názvu zákazníka z titulního slidu).
Podrobné srovnání: [docs/hosting-and-voices.md](docs/hosting-and-voices.md).

## Hosting

### Netlify nestačí

Aplikace má Node.js backend a pro video potřebuje LibreOffice a FFmpeg.
Na Netlify by fungoval jen statický náhled – ne export videa, ne ukládání změn.
Stejně tak Vercel.

### Doporučený způsob: Docker

V projektu je `Dockerfile` (Node + LibreOffice + FFmpeg + Poppler) a `render.yaml`.

```bash
docker build -t vema-presenter .
docker run -p 8080:8080 \
  -e USER_PASSWORD=heslo-obchodnika \
  -e ADMIN_PASSWORD=heslo-admina \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  -v vema-data:/data \
  vema-presenter
```

- `DATA_DIR=/data` je místo, kde leží `content.json`. Na Renderu/Railway je
  potřeba připojit **persistent disk** na `/data`, jinak se změny po restartu
  ztratí.
- Všechny změny obsahu vidí **všichni uživatelé** stejné instance. Není to
  per-user kopie. Když jeden obchodník upraví text, změní se všem.
- Aplikace musí běžet za HTTPS (přihlašovací cookie). Nejjednodušší je VPS
  s `deploy/docker-compose.yml` (Caddy zařídí certifikát automaticky).

Podrobný průzkum hostingu a kvalitnějších hlasů: [docs/hosting-and-voices.md](docs/hosting-and-voices.md).

### VPS (doporučeno)

```bash
cd deploy
cp ../.env.example .env   # doplňte hesla, SESSION_SECRET a DOMAIN
docker compose up -d --build
```

### Render

1. Nahrajte projekt na GitHub.
2. Render → **New → Blueprint** → vyberte repozitář s `render.yaml`.
3. Nastavte `USER_PASSWORD` a `ADMIN_PASSWORD` (`SESSION_SECRET` se vygeneruje).
4. U služby zapněte persistent disk `/data` (u placeného plánu).

Video rendering je náročnější na CPU/RAM; pro pohodlné demo doporučuji alespoň
1 GB RAM. Generování videa u 10 slidů trvá řádově desítky sekund až minuty.

### Railway / Fly.io / firemní server

Stejný Docker image. Připojte volume na `/data`, nastavte `USER_PASSWORD`, `ADMIN_PASSWORD` a
`DATA_DIR=/data`.

## Jak to funguje

```
                    KNIHA OBSAHU (data/content.json)
                     30 modulů · texty · komentáře
                                  │
                    buildDeck(content, konfigurace)
                                  │
             ┌────────────────────┴────────────────────┐
             │                                         │
      NÁHLED V APLIKACI                        GENERÁTOR VÝSTUPŮ
      React + SVG kolo                         │
                                               ├─ PPTX (PptxGenJS + SVG kolo → PNG)
                                               └─ MP4
                                                   PPTX → LibreOffice → PDF → PNG
                                                   → TTS (Edge) → FFmpeg
```

**Jedno místo pravdy.** Náhled, PPTX i video se skládají ze stejného modelu
(`shared/model.js`) a stejného SVG kola (`shared/wheel.js`). Když se změní text
nebo komentář, projeví se ve všech výstupech.

### Proč takto

- **Obsah není AI.** Obchodní nabídka musí obsahovat schválené informace.
  AI používáme jen na převod hotového textu na hlas.
- **Kolo oblastí, ne 30 segmentů.** Při 30 modulech by bylo kolo nepřehledné.
  Kolo vybírá oblast, seznam upřesňuje moduly. Přidání nového modulu nic nerozbije.
- **Ceny mimo moduly.** Odpovídá to originální nabídce i tomu, jak cenu počítá
  Vema (počet uživatelů, varianta provozu, implementace).
- **PPTX přes PptxGenJS.** Prezentace je plně editovatelná v PowerPointu.
- **Video přes LibreOffice + FFmpeg.** Nejde o animovaný marketing, ale o
  namluvenou prezentaci. Remotion dává smysl až pro skutečně animovaná videa.
- **Edge TTS.** Kvalitní české hlasy bez API klíče. Pro produkci je vhodné
  domluvit firemní Azure Speech (a ověřit firemní AI pravidla).

## Ověřené technologie

| Věc | Výsledek |
|---|---|
| Generování PPTX | ✅ 36 slidů (všechny moduly), otevřeno v LibreOffice |
| Kolo jako SVG → PNG v PPTX | ✅ ostré, stejné jako v náhledu |
| Poznámky řečníka | ✅ komentáře jsou v `notesSlides` |
| České TTS | ✅ Vlasta i Antonín, bez API klíče |
| PPTX → PDF → PNG | ✅ 1920×1080 na slide |
| FFmpeg synchronizace | ✅ délka slidu = délka komentáře + pauza |
| Výsledné MP4 | ✅ 1920×1080, H.264 + AAC, ukázka ~192 s / 5,7 MB |
| Uložení obsahu | ✅ JSON, verze, záloha/import |
| Produkční build | ✅ `npm run build && npm start` |
| Přihlášení + role (obchodník/admin) | ✅ ověřeno (401/403 na API, UI) |
| DATA_DIR | ✅ ověřeno |

Ukázkové výstupy v `samples/`:

- `VEMA-ukazka-nabidka.pptx`
- `VEMA-ukazka-video.mp4`

## Struktura projektu

```
data/
  content.json        knihovna obsahu (editovatelná v aplikaci)
  content.seed.json   výchozí data pro „Vrátit ukázková data“
shared/
  model.js            sestavení decku, šablony komentářů
  wheel.js            kolo oblastí (náhled = export)
  theme.js            barvy a rozměry
server/
  index.js            Express API, statický frontend
  auth.js             přihlášení, role, podepsaná cookie
  pptx.js             generátor PPTX
  video.js            pipeline PPTX → PNG → TTS → MP4
  tts.js              TTS: Edge, ElevenLabs, Google Chirp 3 HD
  store.js            ukládání obsahu (DATA_DIR)
src/
  pages/Builder.tsx   4 kroky: zákazník → moduly → souhrn → export
  pages/Admin.tsx     knihovna obsahu
  pages/Help.tsx      vysvětlení, ceny, hosting
  components/         kolo, renderer slidu
public/
  brand/              oficiální logo Vema (bílé i barevné)
  references/         slidy s referencemi podle segmentu
samples/              ukázkové výstupy
Dockerfile            produkční image s LibreOffice a FFmpeg
render.yaml           konfigurace pro Render
```

## Co je zjednodušené

- Data jsou v JSON souboru, ne v databázi.
- Přihlášení používá dvě sdílená hesla (obchodník/admin), ne osobní účty –
  nevíme tedy, kdo konkrétně co změnil nebo exportoval.
- Vzhled používá oficiální logo a barvy, ale finální fonty a detaily šablony
  je potřeba doladit s Vema.
- Video nemá animace, přechody ani hudbu. Je to čistá namluvená prezentace.
- Není řešené verzování obsahu ani historie exportů.
- TTS závisí na dostupnosti služby Microsoft Edge; pro produkci doporučuji
  firemní Azure Speech.
- Import existujícího PPTX (skládání originálních slidů) není implementovaný.

## Další kroky

1. Ověřit u Vema firemní pravidla pro TTS (Microsoft Edge / Azure).
2. Doplnit konkrétního obchodníka a skutečný XLSX.
4. Doplnit modul TRO, až budou podklady.
5. Doladit finální fonty a grafické prvky.
6. Nasadit demo (Render/Railway/firemní server) a otestovat na Windows.

## Poznámka k podkladům

- `Seyfor Vema v1.4.pptx` – zdroj modulů, textů, čísel a referenčních slidů.
- `Nabídka VZOR prázdná.docx` – zdroj delších popisů modulů (včetně ODZ a JMHZ)
  a struktury nabídky. Ceny v DOCX jsou ukázkové sazby; aplikace je záměrně
  nebere jako ceny modulů.
