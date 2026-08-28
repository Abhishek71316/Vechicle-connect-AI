import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  Globe,
  Trash2,
  RotateCcw,
  ShieldCheck,
  X,
  Volume2,
  VolumeX,
  Square,
  Sliders,
} from "lucide-react";
import { Button } from "../ui/button";
import { ChatInput } from "./ChatInput";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import { useGeminiChat } from "../../hooks/useGeminiChat";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import { cn } from "../../lib/utils";

const LANGUAGES = [
  { value: "auto", label: "Auto Detect" },
  { value: "English", label: "English" },
  { value: "Hindi", label: "हिन्दी" },
  { value: "Kannada", label: "ಕನ್ನಡ" },
  { value: "Tamil", label: "தமிழ்" },
  { value: "Telugu", label: "తెలుగు" },
  { value: "Malayalam", label: "മലയാളം" },
  { value: "Marathi", label: "मराठी" },
  { value: "Bengali", label: "বাংলা" },
  { value: "Gujarati", label: "ગુજરાતી" },
  { value: "Punjabi", label: "ਪੰਜਾਬੀ" },
  { value: "Urdu", label: "اردو" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
  { value: "Portuguese", label: "Português" },
  { value: "Italian", label: "Italiano" },
  { value: "Japanese", label: "日本語" },
  { value: "Korean", label: "한국어" },
  { value: "Chinese", label: "中文" },
  { value: "Arabic", label: "العربية" },
  { value: "Russian", label: "Русский" },
];

const QUICK_QUESTIONS = [
  "How does accident detection work?",
  "Explain my sensor data",
  "Check vehicle safety",
  "What does Total G mean?",
  "How does GPS tracking work?",
  "How does emergency SMS work?",
  "Explain driver monitoring",
  "Troubleshoot ESP32",
];

const SPEECH_RATES = [
  { label: "0.9x", value: 0.9 },
  { label: "1.0x", value: 1.0 },
  { label: "1.1x", value: 1.1 },
  { label: "1.2x", value: 1.2 },
];

export function SmartGuardChatbot({ mode = "floating" }) {
  const [open, setOpen] = useState(mode === "embedded");
  const [langOpen, setLangOpen] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [autoSendVoice, setAutoSendVoice] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("smartguard_auto_send_voice") === "true";
  });

  const toggleAutoSendVoice = () => {
    setAutoSendVoice((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("smartguard_auto_send_voice", String(next));
      }
      return next;
    });
  };

  const {
    messages,
    isLoading,
    error,
    language,
    setLanguage,
    sendMessage,
    retry,
    clear,
  } = useGeminiChat();

  const {
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
    resetSpokenHistory,
  } = useTextToSpeech();

  const scrollRef = useRef(null);
  const langDropdownRef = useRef(null);
  const voiceDropdownRef = useRef(null);

  // Auto-scroll when messages update
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, error, open]);

  // Automatically trigger TTS for new Gemini responses if Voice ON
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        handleNewAssistantMessage(lastMessage, language);
      }
    }
  }, [messages, isLoading, language, handleNewAssistantMessage]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangOpen(false);
      }
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(e.target)) {
        setVoiceSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    resetSpokenHistory();
    clear();
  };

  const activeLang = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];
  const showQuick = messages.length <= 1 && !isLoading;

  const containerClasses =
    mode === "embedded"
      ? "w-full h-[650px] flex flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl"
      : "ai-glow fixed inset-x-2 bottom-2 z-50 flex h-[min(78vh,640px)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px]";

  return (
    <>
      {mode === "floating" && !open && (
        <button
          onClick={() => setOpen(true)}
          className="ai-gradient ai-glow fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 sm:right-6 sm:bottom-6 shadow-xl"
          aria-label="Open SmartGuard AI Assistant"
        >
          <Bot className="size-5" />
          <span className="hidden sm:inline">AI Assistant</span>
          {isSpeaking && (
            <span className="flex size-2 rounded-full bg-cyan-300 animate-ping" />
          )}
        </button>
      )}

      {(open || mode === "embedded") && (
        <div className={containerClasses}>
          {/* Header */}
          <header className="flex items-center gap-2.5 border-b border-slate-800 bg-slate-900/90 px-3.5 py-3">
            <div className="ai-gradient flex size-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md">
              <ShieldCheck className="size-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                SmartGuard AI
                {isSpeaking && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded-full border border-cyan-800/60 animate-pulse">
                    <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Speaking
                  </span>
                )}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                Multilingual Safety & IoT Assistant
              </p>
            </div>

            {/* TTS Voice Toggle Button */}
            {isSupported && (
              <div className="relative" ref={voiceDropdownRef}>
                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 p-0.5">
                  <button
                    onClick={toggleVoice}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                      voiceEnabled
                        ? "bg-cyan-500/20 text-cyan-300 font-medium hover:bg-cyan-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                    title={voiceEnabled ? "Voice Auto-Playback ON (Click to Mute)" : "Voice OFF (Click to Enable)"}
                    aria-label="Toggle Text to Speech"
                  >
                    {voiceEnabled ? (
                      <>
                        <Volume2 className={cn("size-3.5 text-cyan-400", isSpeaking && "animate-pulse")} />
                        <span className="hidden xs:inline">Voice ON</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="size-3.5 text-slate-400" />
                        <span className="hidden xs:inline">Voice OFF</span>
                      </>
                    )}
                  </button>

                  {/* Stop Speech Quick Button if currently speaking */}
                  {isSpeaking && (
                    <button
                      onClick={stop}
                      className="text-red-400 hover:text-red-300 px-1.5 py-1 transition-colors"
                      title="Stop Speaking"
                      aria-label="Stop current speech"
                    >
                      <Square className="size-3 fill-current" />
                    </button>
                  )}

                  {/* Speech Rate Controls Button */}
                  <button
                    onClick={() => setVoiceSettingsOpen((v) => !v)}
                    className="text-slate-400 hover:text-cyan-400 px-1 py-1 transition-colors"
                    title="Voice Speed Settings"
                    aria-label="Voice settings"
                  >
                    <Sliders className="size-3" />
                  </button>
                </div>

                {/* Voice Settings Dropdown */}
                {voiceSettingsOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-2xl space-y-2">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">
                        Speech Rate
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {SPEECH_RATES.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => {
                              updateSpeechRate(r.value);
                            }}
                            className={cn(
                              "rounded px-1.5 py-1 text-center text-xs transition-colors",
                              speechRate === r.value
                                ? "bg-cyan-500/30 text-cyan-300 font-semibold border border-cyan-500/40"
                                : "text-slate-300 hover:bg-slate-700"
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-700/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-300">Auto-Send Voice</span>
                      <button
                        onClick={toggleAutoSendVoice}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
                          autoSendVoice
                            ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400/50"
                            : "bg-slate-700 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {autoSendVoice ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Language Selector */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-xs text-slate-300 transition-colors hover:text-white"
                aria-label="Select language"
              >
                <Globe className="size-3.5 text-cyan-400" />
                <span className="max-w-14 truncate hidden sm:inline">{activeLang.label}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 z-20 mt-1 max-h-64 w-40 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 py-1 shadow-2xl">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => {
                        setLanguage(l.value);
                        setLangOpen(false);
                      }}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-700",
                        l.value === language
                          ? "text-cyan-400 font-semibold bg-slate-700/50"
                          : "text-slate-200"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Chat */}
            <button
              onClick={handleClear}
              className="text-slate-400 transition-colors hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800"
              aria-label="Clear conversation"
              title="Clear Chat"
            >
              <Trash2 className="size-4" />
            </button>

            {/* Close Button (Floating Mode) */}
            {mode === "floating" && (
              <button
                onClick={() => {
                  stop();
                  setOpen(false);
                }}
                className="text-slate-400 transition-colors hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
                aria-label="Close chat"
                title="Close"
              >
                <X className="size-4" />
              </button>
            )}
          </header>

          {/* Messages Container */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3.5 overflow-y-auto px-3.5 py-4 bg-slate-950/70"
          >
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                onSpeak={speak}
                isSpeakingThis={isSpeaking && activeMessageId === m.id}
                isGeneratingThis={isGenerating && activeMessageId === m.id}
                language={language}
              />
            ))}

            {isLoading && <TypingIndicator />}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-3 text-sm text-red-200">
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retry}
                  className="mt-2 h-8 gap-1.5 text-xs border-red-500/50 text-red-300 hover:bg-red-900/40"
                >
                  <RotateCcw className="size-3.5" /> Retry
                </Button>
              </div>
            )}

            {showQuick && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-slate-700/80 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500 hover:text-white hover:bg-slate-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            language={language}
            autoSendVoice={autoSendVoice}
          />
        </div>
      )}
    </>
  );
}

export default SmartGuardChatbot;
