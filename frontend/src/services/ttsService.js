/**
 * Smart Vehicle Connect AI - Frontend Text-to-Speech (TTS) Service
 * Communicates with backend /api/tts (Google Cloud Text-to-Speech)
 * and falls back to Web Speech API when cloud audio is unavailable.
 */

import {
  cleanTextForSpeech,
  detectSpeechLanguage,
  getBestVoice,
  isSpeechSupported,
  cancelSpeech
} from "../utils/textToSpeech";

class TTSService {
  constructor() {
    this.currentAudio = null;
    this.currentAudioUrl = null;
    this.activeMessageId = null;
    this.isSpeakingState = false;
    this.onStateChangeCallbacks = new Set();
  }

  /**
   * Subscribe to playback state changes
   */
  subscribe(callback) {
    this.onStateChangeCallbacks.add(callback);
    return () => this.onStateChangeCallbacks.delete(callback);
  }

  notifyState(isSpeaking, messageId = null) {
    this.isSpeakingState = isSpeaking;
    this.activeMessageId = messageId;
    this.onStateChangeCallbacks.forEach((cb) => cb({ isSpeaking, activeMessageId: messageId }));
  }

  /**
   * Stop any active audio or speech playback
   */
  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }

    if (this.currentAudioUrl) {
      try {
        URL.revokeObjectURL(this.currentAudioUrl);
      } catch (e) {}
      this.currentAudioUrl = null;
    }

    cancelSpeech();
    this.notifyState(false, null);
  }

  /**
   * Main Speak Method
   */
  async speak({
    messageId,
    text,
    language = "auto",
    voiceName = null,
    speakingRate = 1.0,
    onStart = () => {},
    onEnd = () => {},
    onError = () => {}
  }) {
    if (!text || typeof text !== "string" || !text.trim()) return;

    // Toggle stop if already speaking this message
    if (this.isSpeakingState && this.activeMessageId === messageId) {
      this.stop();
      return;
    }

    // Stop any previous speech
    this.stop();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    const languageCode = detectSpeechLanguage(text, language);
    this.notifyState(true, messageId);
    onStart();

    const hostname = window.location.hostname || "localhost";
    const targetUrls = [
      `/api/tts`,
      `http://${hostname}:5000/api/tts`,
      `http://${hostname}:8000/api/tts`
    ];

    let cloudAudioPlayed = false;

    for (const url of targetUrls) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanedText,
            languageCode,
            voiceName,
            speakingRate
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.audioContent) {
            // Convert base64 audio content to playable Blob
            const byteCharacters = atob(data.audioContent);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const audioBlob = new Blob([byteArray], { type: "audio/mp3" });
            const audioUrl = URL.createObjectURL(audioBlob);

            this.currentAudioUrl = audioUrl;
            const audio = new Audio(audioUrl);
            this.currentAudio = audio;
            audio.playbackRate = speakingRate || 1.0;

            audio.onplay = () => {
              this.notifyState(true, messageId);
            };

            audio.onended = () => {
              this.stop();
              onEnd();
            };

            audio.onerror = (e) => {
              console.warn("Cloud audio playback error:", e);
              this.stop();
              onError(e);
            };

            await audio.play();
            cloudAudioPlayed = true;
            return;
          }
        }
      } catch (err) {
        // Try next endpoint candidate
      }
    }

    // Fallback to Native Web Speech API if cloud audio is not available
    if (!cloudAudioPlayed && isSpeechSupported()) {
      try {
        const voices = window.speechSynthesis.getVoices();
        const voice = getBestVoice(voices, languageCode);

        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.rate = speakingRate;
        utterance.pitch = 1.0;
        utterance.lang = languageCode;
        if (voice) utterance.voice = voice;

        utterance.onstart = () => {
          this.notifyState(true, messageId);
        };

        utterance.onend = () => {
          this.notifyState(false, null);
          onEnd();
        };

        utterance.onerror = (e) => {
          if (e.error !== "canceled" && e.error !== "interrupted") {
            console.warn("Local TTS error:", e);
          }
          this.notifyState(false, null);
          onError(e);
        };

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Local speech fallback failed:", e);
        this.notifyState(false, null);
        onError(e);
      }
    } else if (!cloudAudioPlayed) {
      this.notifyState(false, null);
      onError(new Error("No TTS engine available"));
    }
  }
}

export const ttsService = new TTSService();
export default ttsService;
