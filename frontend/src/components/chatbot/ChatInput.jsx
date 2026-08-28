import React, { useState, useEffect, useRef } from "react";
import { SendHorizonal, Mic, MicOff, Square, AlertCircle, X } from "lucide-react";
import { Button } from "../ui/button";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { cn } from "../../lib/utils";

export function ChatInput({
  onSend,
  disabled,
  language = "auto",
  autoSendVoice = false,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const {
    isSupported,
    isListening,
    interimText,
    error: sttError,
    clearError,
    toggleListening,
    stopListening,
    activeLanguageCode,
  } = useSpeechToText({
    language,
    onFinalTranscript: (finalText) => {
      if (finalText && finalText.trim()) {
        setValue(finalText);
        if (autoSendVoice && !disabled) {
          onSend(finalText);
          setValue("");
        }
      }
    },
    onInterimTranscript: (interim, accumulatedFinal) => {
      const combined = (accumulatedFinal + (accumulatedFinal && interim ? " " : "") + interim).trim();
      if (combined) {
        setValue(combined);
      }
    },
  });

  const submit = () => {
    if (!value.trim() || disabled) return;
    if (isListening) stopListening();
    onSend(value.trim());
    setValue("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Focus input when voice recording stops
  useEffect(() => {
    if (!isListening && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isListening]);

  return (
    <div className="flex flex-col border-t border-slate-700/80 bg-slate-900/90 p-3 gap-2">
      {/* Speech Recognition Error Banner */}
      {sttError && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-200 animate-fadeIn">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="size-3.5 shrink-0 text-amber-400" />
            <span className="truncate">{sttError}</span>
          </div>
          <button
            onClick={clearError}
            className="text-amber-400 hover:text-amber-200 p-0.5"
            title="Dismiss error"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Active Listening Indicator */}
      {isListening && (
        <div className="flex items-center justify-between rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-3 py-1.5 text-xs text-cyan-200 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold text-cyan-300">Listening...</span>
            <span className="text-[11px] text-slate-400">
              ({activeLanguageCode}) Speak now
            </span>
          </div>
          <button
            onClick={stopListening}
            className="text-red-400 hover:text-red-300 text-[11px] font-medium flex items-center gap-1 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/60"
          >
            <Square className="size-2.5 fill-current" /> Stop
          </button>
        </div>
      )}

      {/* Input Controls Bar */}
      <div className="flex items-end gap-2">
        {/* Voice Input Microphone Button */}
        {isSupported ? (
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={cn(
              "size-10 shrink-0 rounded-xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400",
              isListening
                ? "bg-red-500/20 text-red-400 border border-red-500/60 animate-pulse shadow-lg shadow-red-500/20"
                : "bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500 hover:bg-slate-700/80"
            )}
            title={isListening ? "Stop Voice Recording" : `Voice Input (${activeLanguageCode})`}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
          >
            {isListening ? (
              <Square className="size-4 fill-current text-red-400" />
            ) : (
              <Mic className="size-4" />
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="size-10 shrink-0 rounded-xl flex items-center justify-center bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed"
            title="Voice input is not supported in this browser"
            aria-label="Voice input unavailable"
          >
            <MicOff className="size-4" />
          </button>
        )}

        {/* Text Input Area */}
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            isListening
              ? "Listening to your voice..."
              : "Type or tap 🎤 to speak in any language…"
          }
          className={cn(
            "max-h-28 min-h-10 flex-1 resize-none rounded-xl border bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition-all",
            isListening
              ? "border-cyan-500/70 ring-2 ring-cyan-500/20"
              : "border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
          )}
        />

        {/* Send Button */}
        <Button
          size="icon"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="size-10 shrink-0 rounded-xl ai-gradient text-white shadow-md transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SendHorizonal className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default ChatInput;
