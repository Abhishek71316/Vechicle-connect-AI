import { useState, useEffect, useRef, useCallback } from "react";

// Mapping from app language names to BCP-47 speech recognition language codes
const STT_LANG_MAP = {
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
  auto: "en-IN",
};

export function useSpeechToText({
  language = "auto",
  onFinalTranscript,
  onInterimTranscript,
  autoSend = false,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const finalAccumulatorRef = useRef("");
  const isExplicitStopRef = useRef(false);

  // Check SpeechRecognition support on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  // Resolve language code
  const getLanguageCode = useCallback((lang) => {
    const key = String(lang || "auto").toLowerCase();
    return STT_LANG_MAP[key] || "en-IN";
  }, []);

  const stopListening = useCallback(() => {
    isExplicitStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Speech recognition stop error:", e);
      }
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    finalAccumulatorRef.current = "";
    setInterimText("");
    isExplicitStopRef.current = false;

    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Prevents duplicate loops and allows natural finish
      recognition.interimResults = true;
      recognition.lang = getLanguageCode(language);
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let currentInterim = "";
        let currentFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += transcriptChunk;
          } else {
            currentInterim += transcriptChunk;
          }
        }

        if (currentFinal) {
          finalAccumulatorRef.current = (
            finalAccumulatorRef.current +
            (finalAccumulatorRef.current ? " " : "") +
            currentFinal
          ).trim();

          if (onFinalTranscript) {
            onFinalTranscript(finalAccumulatorRef.current);
          }
        }

        setInterimText(currentInterim);
        if (onInterimTranscript) {
          onInterimTranscript(currentInterim, finalAccumulatorRef.current);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error event:", event.error);
        setIsListening(false);
        setInterimText("");

        switch (event.error) {
          case "not-allowed":
          case "service-not-allowed":
            setError("Microphone permission was denied. Please allow microphone access in your browser.");
            break;
          case "audio-capture":
            setError("No microphone was detected. Please connect a microphone and try again.");
            break;
          case "network":
            setError("Network error during speech recognition. Please check your internet connection.");
            break;
          case "no-speech":
            // Natural silence, don't show intrusive error if user simply stopped speaking
            break;
          case "aborted":
            // Intentional abort, no error needed
            break;
          case "language-not-supported":
            setError(`Speech recognition is not supported for ${language}. Falling back to default.`);
            break;
          default:
            setError("Could not capture speech. Please try speaking again.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");

        const finalText = finalAccumulatorRef.current.trim();
        if (finalText && onFinalTranscript) {
          onFinalTranscript(finalText);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      setIsListening(false);
      setError("Failed to start microphone. Please check your browser permissions.");
    }
  }, [language, getLanguageCode, onFinalTranscript, onInterimTranscript]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    error,
    clearError: () => setError(null),
    startListening,
    stopListening,
    toggleListening,
    activeLanguageCode: getLanguageCode(language),
  };
}

export default useSpeechToText;
