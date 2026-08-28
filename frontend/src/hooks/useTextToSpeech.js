import { useState, useEffect, useRef, useCallback } from "react";
import { ttsService } from "../services/ttsService";
import { isSpeechSupported } from "../utils/textToSpeech";

export function useTextToSpeech() {
  const [isSupported] = useState(() => true);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("smartguard_voice_enabled");
    return stored !== null ? stored === "true" : false; // Default OFF as per requirement
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [speechRate, setSpeechRate] = useState(() => {
    if (typeof window === "undefined") return 1.0;
    const stored = localStorage.getItem("smartguard_voice_rate");
    return stored ? parseFloat(stored) : 1.0;
  });

  const spokenMessagesRef = useRef(new Set());

  // Subscribe to TTSService state changes
  useEffect(() => {
    const unsubscribe = ttsService.subscribe(({ isSpeaking, activeMessageId }) => {
      setIsSpeaking(isSpeaking);
      setActiveMessageId(activeMessageId);
      if (!isSpeaking) setIsGenerating(false);
    });

    return () => {
      unsubscribe();
      ttsService.stop();
    };
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("smartguard_voice_enabled", String(next));
      }
      if (!next) {
        ttsService.stop();
        setIsSpeaking(false);
        setActiveMessageId(null);
        setIsGenerating(false);
      }
      return next;
    });
  }, []);

  const updateSpeechRate = useCallback((rate) => {
    const num = Math.min(Math.max(Number(rate) || 1.0, 0.8), 1.3);
    setSpeechRate(num);
    if (typeof window !== "undefined") {
      localStorage.setItem("smartguard_voice_rate", String(num));
    }
  }, []);

  const stop = useCallback(() => {
    ttsService.stop();
    setIsSpeaking(false);
    setActiveMessageId(null);
    setIsGenerating(false);
  }, []);

  const speak = useCallback(
    async (messageId, text, language = "auto") => {
      if (!text || !text.trim()) return;

      if (isSpeaking && activeMessageId === messageId) {
        stop();
        return;
      }

      setIsGenerating(true);
      setActiveMessageId(messageId);

      await ttsService.speak({
        messageId,
        text,
        language,
        speakingRate: speechRate,
        onStart: () => {
          setIsGenerating(false);
          setIsSpeaking(true);
          setActiveMessageId(messageId);
        },
        onEnd: () => {
          setIsGenerating(false);
          setIsSpeaking(false);
          setActiveMessageId(null);
        },
        onError: () => {
          setIsGenerating(false);
          setIsSpeaking(false);
          setActiveMessageId(null);
        }
      });
    },
    [isSpeaking, activeMessageId, speechRate, stop]
  );

  const handleNewAssistantMessage = useCallback(
    (message, language = "auto") => {
      if (!message || message.role !== "assistant" || !message.content) return;
      if (!voiceEnabled) return;

      // Never auto-speak default welcome on initial load
      if (message.id === "welcome") {
        spokenMessagesRef.current.add(message.id);
        return;
      }

      if (spokenMessagesRef.current.has(message.id)) return;
      spokenMessagesRef.current.add(message.id);

      speak(message.id, message.content, language);
    },
    [voiceEnabled, speak]
  );

  const resetSpokenHistory = useCallback(() => {
    spokenMessagesRef.current.clear();
    stop();
  }, [stop]);

  return {
    isSupported,
    voiceEnabled,
    isSpeaking,
    activeMessageId,
    isGenerating,
    speechRate,
    toggleVoice,
    updateSpeechRate,
    speak,
    stop,
    handleNewAssistantMessage,
    resetSpokenHistory
  };
}

export default useTextToSpeech;
