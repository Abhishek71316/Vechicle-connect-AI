/**
 * Smart Vehicle Connect AI - Text-to-Speech (TTS) Utilities
 * Native Browser Web Speech API with Multilingual Voice Detection,
 * Markdown & Code Stripping, and Speech Synthesis Controls.
 */

// Language Unicode Ranges
const LANG_DETECTORS = [
  { regex: /[\u0C80-\u0CFF]/, lang: "kn-IN", name: "Kannada" },
  { regex: /[\u0900-\u097F]/, lang: "hi-IN", name: "Hindi" },
  { regex: /[\u0B80-\u0BFF]/, lang: "ta-IN", name: "Tamil" },
  { regex: /[\u0C00-\u0C7F]/, lang: "te-IN", name: "Telugu" },
  { regex: /[\u0D00-\u0D7F]/, lang: "ml-IN", name: "Malayalam" },
  { regex: /[\u0980-\u09FF]/, lang: "bn-IN", name: "Bengali" },
  { regex: /[\u0A80-\u0AFF]/, lang: "gu-IN", name: "Gujarati" },
  { regex: /[\u0A00-\u0A7F]/, lang: "pa-IN", name: "Punjabi" },
  { regex: /[\u0600-\u06FF]/, lang: "ur-IN", name: "Urdu" },
];

const LANGUAGE_CODE_MAP = {
  kannada: "kn-IN",
  hindi: "hi-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  malayalam: "ml-IN",
  marathi: "mr-IN",
  bengali: "bn-IN",
  gujarati: "gu-IN",
  punjabi: "pa-IN",
  urdu: "ur-IN",
  english: "en-IN",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  portuguese: "pt-BR",
  italian: "it-IT",
  japanese: "ja-JP",
  korean: "ko-KR",
  chinese: "zh-CN",
  arabic: "ar-SA",
  russian: "ru-RU",
};

/**
 * Strips markdown, code blocks, tables, URLs, and math equations before speech
 */
export function cleanTextForSpeech(text = "") {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Replace multiline code blocks (including language tags) with a spoken note
  cleaned = cleaned.replace(/```(?:[a-zA-Z0-9_-]+)?[\s\S]*?```/g, " Code snippet provided in chat. ");

  // 2. Replace inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 3. Replace markdown links [label](url) with just the label
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 4. Remove standalone URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");

  // 5. Clean LaTeX / math formulas e.g. $\text{Total G} = ...$
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, " Total G formula calculated. ");
  cleaned = cleaned.replace(/\$([^$]+)\$/g, "$1");
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, "$1");
  cleaned = cleaned.replace(/\\sqrt/g, "square root of");
  cleaned = cleaned.replace(/\\ge/g, "greater than or equal to");
  cleaned = cleaned.replace(/\\le/g, "less than or equal to");

  // 6. Strip markdown headings (###, ##, #)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // 7. Strip bold and italics (**text**, *text*, __text__, _text_)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // 8. Strip markdown blockquotes, horizontal rules, table syntax
  cleaned = cleaned.replace(/^\s*>\s+/gm, "");
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");
  cleaned = cleaned.replace(/\|/g, " ");
  cleaned = cleaned.replace(/:---|-{3,}/g, "");

  // 9. Clean bullet points (- , * , + ) to natural speech pauses
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

  // 10. Clean multiple whitespace and newlines
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Detect language of text content or resolve from user selection
 */
export function detectSpeechLanguage(text = "", requestedLanguage = "auto") {
  if (requestedLanguage && requestedLanguage !== "auto") {
    const key = String(requestedLanguage).toLowerCase();
    if (LANGUAGE_CODE_MAP[key]) {
      return LANGUAGE_CODE_MAP[key];
    }
  }

  for (const detector of LANG_DETECTORS) {
    if (detector.regex.test(text)) {
      return detector.lang;
    }
  }

  return "en-IN"; // Default to Indian English or English
}

/**
 * Finds the best matching voice from available browser voices
 */
export function getBestVoice(voices = [], targetLang = "en-IN") {
  if (!voices || voices.length === 0) return null;

  const langCode = targetLang.toLowerCase();
  const prefix = langCode.split("-")[0]; // e.g. "kn", "hi", "en"

  // 1. Exact match (e.g. "kn-IN")
  let match = voices.find((v) => v.lang.toLowerCase().replace("_", "-") === langCode);
  if (match) return match;

  // 2. Prefix match (e.g. starts with "kn" or "hi")
  match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (match) return match;

  // 3. Indian English / English fallback
  match = voices.find(
    (v) =>
      v.lang.toLowerCase().includes("en-in") ||
      v.lang.toLowerCase().includes("en-us") ||
      v.lang.toLowerCase().startsWith("en")
  );
  if (match) return match;

  // 4. Default voice
  return voices.find((v) => v.default) || voices[0] || null;
}

/**
 * Checks if Speech Synthesis is supported in the current browser
 */
export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/**
 * Stops any ongoing speech synthesis
 */
export function cancelSpeech() {
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("Speech cancellation error:", e);
    }
  }
}
