# Hosting and voice research (November 2026)

## 1. Hosting

### What the app needs

- A **Node.js 20+** process running all the time (Express API and login)
- **LibreOffice, FFmpeg and Poppler** for the MP4 export
- A **persistent disk** for `content.json`, which holds the admins' edits
- About **2 GB RAM or more**, because LibreOffice and FFmpeg use a lot of memory while a video renders
- **HTTPS**, because the login cookie must not travel over plain HTTP

### "Virtual hosting": what this means here

| Kind of hosting | Works? | Why |
|---|---|---|
| Shared webhosting (PHP/static, cPanel), e.g. basic Wedos/Vedos, Forpsi, Active24 webhosting | ❌ | It has no long-running Node process and no LibreOffice or FFmpeg. The preview might load, but logins, saving and exports would not work. |
| **VPS, a virtual private server** (your own small Linux machine) | ✅ **Recommended** | You get full control and can run the Docker image as-is. Low fixed monthly price. |
| PaaS (Render, Railway, Fly.io) | ✅ | Easier setup, but you need a paid plan with a persistent disk. Free plans sleep when idle and lose data. More expensive per GB of RAM. |
| Company server or Azure (App Service for Containers / Container Apps) | ✅ | A good fit if Vema/Seyfor IT already runs Azure, especially with Azure Speech (see section 2). |

If "virtual hosting" means a **VPS**, that is the recommended option.

### Recommended setup: VPS + Docker + Caddy

The project now includes `deploy/docker-compose.yml` and `deploy/Caddyfile`. Caddy gets and renews a
Let's Encrypt HTTPS certificate on its own.

```bash
# On a fresh Ubuntu 24.04 VPS
curl -fsSL https://get.docker.com | sh
git clone <repo> vema && cd vema/deploy
cp ../.env.example .env      # set USER_PASSWORD, ADMIN_PASSWORD, SESSION_SECRET, DOMAIN
docker compose up -d --build
```

Point the domain's DNS A record at the VPS IP before the first start.

### Provider options

| Provider | Plan to look at | Approx. price | Notes |
|---|---|---|---|
| **Hetzner Cloud** (DE/FI data centers) | CX23: 2 vCPU / 4 GB / 40 GB | about €4–6/month | The best value for this workload. CX22 is being replaced by CX23. |
| **Vedos (formerly Wedos)**, CZ | VPS ON | check vedos.cz | A Czech company with Czech data centers and Czech invoicing. |
| **Váš Hosting**, CZ | VPS with Docker | check vas-hosting.cz | Czech, with an offer built around Docker. |
| Render / Railway | Starter plan + disk | about $7–25/month | Least admin work. `render.yaml` is already in the project. |

All prices are indicative. Check them on the providers' own pages before ordering.

**Recommendation:** a 4 GB VPS (Hetzner CX23, or a Czech provider if data must stay in the
Czech Republic) running the included Docker Compose setup. Add backups of the `vema-data` volume,
for example the provider's daily snapshot (about +20 % of the price) or the admin page's JSON export.

## 2. More natural voices

Today the app uses **Microsoft Edge TTS**, an unofficial free endpoint, with `cs-CZ-VlastaNeural` /
`cs-CZ-AntoninNeural`. These are older "standard neural" voices, which is why they sound mechanical. The
endpoint also has no SLA and could stop working at any time.

| Option | Czech | Naturalness | Price (indicative) | Notes |
|---|---|---|---|---|
| **ElevenLabs** Multilingual v2 (and v3) | ✅ Czech is officially supported in v2 | ★★★★★ The most human-sounding | ≈ $0.10 per 1,000 characters through the API; subscription plans from a few $/month | Voice cloning is possible, e.g. a real Vema salesperson's voice with their consent. Data goes to a US company (EU data residency is available on enterprise plans). |
| **Google Cloud TTS Chirp 3: HD** | ✅ `cs-CZ`, added Dec 2025 | ★★★★☆ | per-character pricing, check Google's page | Can run in the **EU region**. Partial SSML support. A good balance of quality, price and compliance. |
| **Azure AI Speech** (official) | ✅ Vlasta / Antonín; HD/multilingual voices may also speak Czech | ★★★☆☆ for the current voices | ≈ $15–16 per 1M characters for neural voices | The same voices as today, but official, with an SLA and an EU region. Best if the company already uses Microsoft. Try the multilingual "Dragon HD" voices with Czech text. |
| Keep Edge TTS + SSML tuning | ✅ | ★★★☆☆ | free | A quick improvement: a slightly slower rate, pauses after headings, fixed pronunciation of abbreviations (JMHZ, ODZ). |

**Cost in practice:** one video narration is roughly 10–15 slides × 300 characters ≈ 4,000 characters.
That is about **$0.40 per video with ElevenLabs** and only cents with Google or Azure. Price is not
the deciding factor. Quality, the company's AI and data rules, and an EU region are.

**Recommendation:**
1. Do a blind listening test: generate the same 2–3 slides with ElevenLabs (Multilingual v2),
   Google Chirp 3 HD (cs-CZ) and Azure, and let the Vema team pick.
2. ✅ **Done:** ElevenLabs and Google Chirp 3 HD are built into `server/tts.js`. Each is turned on
   by its API key (see `.env.example`), and the builder has a sample player for comparing voices.
   Edge TTS stays available.
3. Check with Vema/Seyfor whether sending narration text to the chosen provider is allowed. The text
   is public marketing content, but the customer's name appears in the cover narration.

## Sources

- Hetzner CX22 → CX23 change and pricing: https://vpsfor.dev/posts/hetzner-cx22-pricing-2026/
- Vedos VPS ON: https://vedos.cz/en/vps-on/
- Váš Hosting Docker: https://www.vas-hosting.com/docker
- Google Chirp 3 HD voices (cs-CZ listed): https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd
- Google TTS release notes (Dec 2025 language expansion): https://docs.cloud.google.com/text-to-speech/docs/release-notes
- ElevenLabs supported languages: https://elevenlabs.io/docs/help-center/other/what-languages-do-you-support
- ElevenLabs API pricing: https://elevenlabs.io/pricing/api
- Azure Speech language support: https://learn.microsoft.com/azure/ai-services/speech-service/language-support
- Azure HD voices: https://learn.microsoft.com/azure/ai-services/speech-service/high-definition-voices
- Azure Speech pricing (CZ): https://azure.microsoft.com/cs-cz/pricing/details/speech/
