// Převod komentáře na řeč. Podporovaní poskytovatelé:
//   edge   – Microsoft Edge TTS (zdarma, bez klíče; výchozí, starší "neural" hlasy)
//   eleven – ElevenLabs Multilingual v2 (nejpřirozenější; ELEVENLABS_API_KEY + ELEVENLABS_VOICES)
//   google – Google Cloud TTS Chirp 3: HD, cs-CZ (GOOGLE_TTS_API_KEY)
// Hlasy dalších poskytovatelů se v aplikaci objeví, jen když je nastavený klíč.
import fs from "node:fs/promises";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const EDGE_VOICES = [
  { id: "cs-CZ-VlastaNeural", label: "Vlasta – žena (Edge, zdarma)", provider: "edge" },
  { id: "cs-CZ-AntoninNeural", label: "Antonín – muž (Edge, zdarma)", provider: "edge" },
];

/** "Jméno:id,Jméno2:id2" → [{ name, id }] */
function parseVoiceList(raw) {
  return String(raw || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((item) => {
      const i = item.lastIndexOf(":");
      return i > 0
        ? { name: item.slice(0, i).trim(), id: item.slice(i + 1).trim() }
        : { name: item, id: item };
    });
}

// ---------- ElevenLabs ----------
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
const ELEVEN_VOICES = parseVoiceList(process.env.ELEVENLABS_VOICES);

if (ELEVEN_KEY && ELEVEN_VOICES.length === 0) {
  console.warn(
    "[tts] ELEVENLABS_API_KEY je nastavený, ale chybí ELEVENLABS_VOICES (např. \"Petra:abc123,Jan:def456\").",
  );
}

async function elevenSynthesize(text, voiceId) {
  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}` +
    `?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: ELEVEN_MODEL,
      voice_settings: {
        stability: Number(process.env.ELEVENLABS_STABILITY ?? 0.5),
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ---------- Google Cloud TTS (Chirp 3: HD) ----------
const GOOGLE_KEY = process.env.GOOGLE_TTS_API_KEY || "";
// EU endpoint drží zpracování v EU; lze přepsat na texttospeech.googleapis.com.
const GOOGLE_ENDPOINT = process.env.GOOGLE_TTS_ENDPOINT || "https://eu-texttospeech.googleapis.com";
const GOOGLE_VOICES = parseVoiceList(
  process.env.GOOGLE_TTS_VOICES ||
    "Aoede – žena:cs-CZ-Chirp3-HD-Aoede,Charon – muž:cs-CZ-Chirp3-HD-Charon",
);

async function googleSynthesize(text, voiceName) {
  const res = await fetch(
    `${GOOGLE_ENDPOINT}/v1/text:synthesize?key=${encodeURIComponent(GOOGLE_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voiceName.slice(0, 5), name: voiceName },
        audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google TTS ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.audioContent) throw new Error("Google TTS nevrátil audio.");
  return Buffer.from(data.audioContent, "base64");
}

// ---------- Edge ----------
async function edgeSynthesize(text, voice, outDir, target) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const result = await tts.toFile(outDir, text);
  if (!result?.audioFilePath) throw new Error("TTS nevrátilo audio soubor.");
  await fs.rename(result.audioFilePath, target).catch(async () => {
    await fs.copyFile(result.audioFilePath, target);
    await fs.unlink(result.audioFilePath).catch(() => {});
  });
}

// ---------- veřejné API ----------
export const VOICES = [
  ...(ELEVEN_KEY
    ? ELEVEN_VOICES.map((v) => ({
        id: `eleven:${v.id}`,
        label: `${v.name} (ElevenLabs)`,
        provider: "eleven",
      }))
    : []),
  ...(GOOGLE_KEY
    ? GOOGLE_VOICES.map((v) => ({
        id: `google:${v.id}`,
        label: `${v.name} (Google Chirp 3 HD)`,
        provider: "google",
      }))
    : []),
  ...EDGE_VOICES,
];

export const DEFAULT_VOICE = VOICES[0].id;

/**
 * Vygeneruje MP3 s českým komentářem. Vrací cestu k souboru.
 * Id hlasu: "eleven:<voiceId>", "google:<name>", jinak Edge (např. "cs-CZ-VlastaNeural").
 */
export async function synthesize(text, outDir, voice = DEFAULT_VOICE) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("Prázdný text pro voice-over.");
  if (!VOICES.some((v) => v.id === voice)) throw new Error(`Neznámý nebo nenastavený hlas: ${voice}`);

  await fs.mkdir(outDir, { recursive: true });
  const target = path.join(outDir, "voice.mp3");
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (voice.startsWith("eleven:")) {
        await fs.writeFile(target, await elevenSynthesize(clean, voice.slice(7)));
      } else if (voice.startsWith("google:")) {
        await fs.writeFile(target, await googleSynthesize(clean, voice.slice(7)));
      } else {
        await edgeSynthesize(clean, voice, outDir, target);
      }
      const stat = await fs.stat(target);
      if (stat.size < 500) throw new Error("TTS vrátilo prázdné audio.");
      return target;
    } catch (err) {
      lastError = err;
      // Chybný klíč / hlas nemá smysl zkoušet znovu.
      if (/ (400|401|403|404|422):/.test(String(err.message))) break;
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  throw new Error(`Voice-over se nepovedl: ${lastError?.message || lastError}`);
}
