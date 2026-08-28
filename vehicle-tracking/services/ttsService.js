/**
 * Smart Vehicle Connect AI - Text-to-Speech Service
 * Supports Google Cloud Text-to-Speech API (Chirp 3 HD, WaveNet, Standard)
 * for Kannada (kn-IN), English (en-IN), Hindi (hi-IN), and other Indian languages.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();

let ttsClient = null;
let ttsClientInitialized = false;

function getTTSClient() {
  if (ttsClientInitialized) return ttsClient;
  ttsClientInitialized = true;

  try {
    const hasCreds = Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_CLOUD_PROJECT_ID
    );

    if (!hasCreds) {
      return null;
    }

    const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
    const options = {};

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (fs.existsSync(credPath)) {
        options.keyFilename = credPath;
      }
    } else if (process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON) {
      try {
        options.credentials = JSON.parse(process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON);
      } catch (e) {
        console.warn("[TTS Service] Failed to parse GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON:", e.message);
      }
    }

    if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
      options.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    }

    ttsClient = new TextToSpeechClient(options);
    console.log("[TTS Service] Google Cloud TextToSpeechClient initialized.");
  } catch (err) {
    console.warn("[TTS Service] Google Cloud SDK initialization deferred:", err.message);
    ttsClient = null;
  }
  return ttsClient;
}

// Multilingual Voice Hierarchy (Primary: Chirp 3 HD -> WaveNet -> Standard)
const VOICE_CATALOG = {
  "kn-IN": {
    languageCode: "kn-IN",
    defaultVoice: "kn-IN-Chirp3-HD-Achird",
    candidateVoices: [
      "kn-IN-Chirp3-HD-Achird",
      "kn-IN-Wavenet-A",
      "kn-IN-Standard-A"
    ]
  },
  "en-IN": {
    languageCode: "en-IN",
    defaultVoice: "en-IN-Chirp3-HD-Achird",
    candidateVoices: [
      "en-IN-Chirp3-HD-Achird",
      "en-IN-Wavenet-D",
      "en-IN-Wavenet-A",
      "en-IN-Standard-A"
    ]
  },
  "hi-IN": {
    languageCode: "hi-IN",
    defaultVoice: "hi-IN-Chirp3-HD-Achird",
    candidateVoices: [
      "hi-IN-Chirp3-HD-Achird",
      "hi-IN-Wavenet-A",
      "hi-IN-Wavenet-D",
      "hi-IN-Standard-A"
    ]
  },
  "ta-IN": {
    languageCode: "ta-IN",
    defaultVoice: "ta-IN-Chirp3-HD-Achird",
    candidateVoices: [
      "ta-IN-Chirp3-HD-Achird",
      "ta-IN-Wavenet-A",
      "ta-IN-Standard-A"
    ]
  },
  "te-IN": {
    languageCode: "te-IN",
    defaultVoice: "te-IN-Chirp3-HD-Achird",
    candidateVoices: [
      "te-IN-Chirp3-HD-Achird",
      "te-IN-Standard-A"
    ]
  },
  "ml-IN": {
    languageCode: "ml-IN",
    defaultVoice: "ml-IN-Wavenet-A",
    candidateVoices: [
      "ml-IN-Wavenet-A",
      "ml-IN-Standard-A"
    ]
  },
  "mr-IN": {
    languageCode: "mr-IN",
    defaultVoice: "mr-IN-Wavenet-A",
    candidateVoices: [
      "mr-IN-Wavenet-A",
      "mr-IN-Standard-A"
    ]
  },
  "bn-IN": {
    languageCode: "bn-IN",
    defaultVoice: "bn-IN-Wavenet-A",
    candidateVoices: [
      "bn-IN-Wavenet-A",
      "bn-IN-Standard-A"
    ]
  },
  "gu-IN": {
    languageCode: "gu-IN",
    defaultVoice: "gu-IN-Wavenet-A",
    candidateVoices: [
      "gu-IN-Wavenet-A",
      "gu-IN-Standard-A"
    ]
  },
  "ur-IN": {
    languageCode: "ur-IN",
    defaultVoice: "ur-IN-Wavenet-A",
    candidateVoices: [
      "ur-IN-Wavenet-A",
      "ur-IN-Standard-A"
    ]
  }
};

/**
 * Clean markdown symbols, code blocks, URLs, and math equations before speech synthesis
 */
function cleanTextForSpeech(text = "") {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Replace code fences with natural pause/note
  cleaned = cleaned.replace(/```(?:[a-zA-Z0-9_-]+)?[\s\S]*?```/g, " ಕೋಡ್ ವಿವರಣೆಯನ್ನು ಚಾಟ್‌ನಲ್ಲಿ ನೀಡಲಾಗಿದೆ. ");

  // 2. Inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 3. Markdown links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 4. Standalone URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");

  // 5. LaTeX and formulas
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, "");
  cleaned = cleaned.replace(/\$([^$]+)\$/g, "$1");
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, "$1");
  cleaned = cleaned.replace(/\\sqrt/g, "");
  cleaned = cleaned.replace(/\\ge/g, "greater than or equal to");
  cleaned = cleaned.replace(/\\le/g, "less than or equal to");

  // 6. Markdown headings, bold, italics, tables, and blockquotes
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");
  cleaned = cleaned.replace(/^\s*>\s+/gm, "");
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");
  cleaned = cleaned.replace(/\|/g, " ");
  cleaned = cleaned.replace(/:---|-{3,}/g, "");
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

  // 7. Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Synthesize speech using Google Cloud Text-to-Speech
 */
async function synthesizeSpeech({
  text,
  languageCode = "kn-IN",
  voiceName = null,
  speakingRate = 1.0,
  pitch = 0.0
}) {
  const cleanedText = cleanTextForSpeech(text);
  if (!cleanedText) {
    throw new Error("Text is empty or invalid after sanitization.");
  }

  // Resolve language profile
  const profile = VOICE_CATALOG[languageCode] || VOICE_CATALOG["kn-IN"];
  const selectedVoice = voiceName || profile.defaultVoice;
  const candidateVoices = [selectedVoice, ...profile.candidateVoices].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  console.log(`[TTS Service] Synthesizing speech for lang: ${languageCode}, text length: ${cleanedText.length}`);

  // Method 1: Google Cloud Client SDK (via Service Account / Credentials)
  const client = getTTSClient();
  if (client) {
    for (const voice of candidateVoices) {
      try {
        console.log(`[TTS Service] Trying Google Cloud SDK voice: ${voice}`);
        const request = {
          input: { text: cleanedText },
          voice: {
            languageCode: profile.languageCode,
            name: voice
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: Number(speakingRate) || 1.0,
            pitch: Number(pitch) || 0.0
          }
        };

        const [response] = await client.synthesizeSpeech(request);
        if (response && response.audioContent) {
          console.log(`[TTS Service] Successfully synthesized with voice: ${voice}`);
          return {
            success: true,
            provider: "google-cloud-sdk",
            voiceName: voice,
            languageCode: profile.languageCode,
            audioContent: Buffer.from(response.audioContent).toString("base64")
          };
        }
      } catch (err) {
        console.warn(`[TTS Service] SDK voice ${voice} failed:`, err.message);
      }
    }
  }

  // Method 2: Google Cloud REST API with OAuth2 / Bearer Token
  const accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
  if (accessToken) {
    for (const voice of candidateVoices) {
      try {
        const payload = {
          input: { text: cleanedText },
          voice: { languageCode: profile.languageCode, name: voice },
          audioConfig: { audioEncoding: "MP3", speakingRate, pitch }
        };
        const res = await axios.post(
          "https://texttospeech.googleapis.com/v1/text:synthesize",
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            timeout: 12000
          }
        );
        if (res.data?.audioContent) {
          return {
            success: true,
            provider: "google-cloud-rest",
            voiceName: voice,
            languageCode: profile.languageCode,
            audioContent: res.data.audioContent
          };
        }
      } catch (e) {
        console.warn(`[TTS Service] REST API voice ${voice} failed:`, e.message);
      }
    }
  }

  // If no cloud credentials configured yet, return fallback signal so frontend plays smoothly
  console.log("[TTS Service] Cloud credentials not configured or failed; delegating to client TTS engine.");
  return {
    success: true,
    provider: "client-fallback",
    voiceName: selectedVoice,
    languageCode: profile.languageCode,
    text: cleanedText,
    message: "Google Cloud TTS credentials not active; using high-fidelity local voice engine."
  };
}

module.exports = {
  synthesizeSpeech,
  cleanTextForSpeech,
  VOICE_CATALOG
};
