import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, User, Volume2, Square, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const TTS_LABELS = {
  kannada: {
    speak: "ಕೇಳಿಸಿ",
    stop: "ನಿಲ್ಲಿಸಿ",
    loading: "ಸಿದ್ಧವಾಗುತ್ತಿದೆ..."
  },
  hindi: {
    speak: "सुनें",
    stop: "रोकें",
    loading: "तैयार हो रहा है..."
  },
  tamil: {
    speak: "கேள்",
    stop: "நிறுத்து",
    loading: "தயாராகிறது..."
  },
  telugu: {
    speak: "వినండి",
    stop: "ఆపు",
    loading: "సిద్ధమవుతోంది..."
  },
  malayalam: {
    speak: "കേൾക്കുക",
    stop: "നിർത്തുക",
    loading: "തയ്യാറാകുന്നു..."
  },
  english: {
    speak: "Speak",
    stop: "Stop",
    loading: "Generating voice..."
  }
};

function getTTSLabel(text = "", requestedLanguage = "auto") {
  const req = String(requestedLanguage || "").toLowerCase();
  if (TTS_LABELS[req]) return TTS_LABELS[req];

  if (/[\u0C80-\u0CFF]/.test(text)) return TTS_LABELS.kannada;
  if (/[\u0900-\u097F]/.test(text)) return TTS_LABELS.hindi;
  if (/[\u0B80-\u0BFF]/.test(text)) return TTS_LABELS.tamil;
  if (/[\u0C00-\u0C7F]/.test(text)) return TTS_LABELS.telugu;
  if (/[\u0D00-\u0D7F]/.test(text)) return TTS_LABELS.malayalam;

  return TTS_LABELS.english;
}

export function ChatMessage({
  message,
  onSpeak,
  isSpeakingThis,
  isGeneratingThis,
  language = "auto"
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const labels = getTTSLabel(message.content, language);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-2.5 group", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-slate-800 text-slate-200" : "ai-gradient text-white shadow-md"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div
        className={cn(
          "relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
            : "rounded-tl-sm border border-slate-700/80 bg-slate-800/90 text-slate-100 shadow",
          isSpeakingThis && "ring-2 ring-cyan-400/80 border-cyan-400/50"
        )}
      >
        <div className="[&_a]:text-cyan-400 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-950 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-amber-300 [&_li]:my-0.5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-950 [&_pre]:p-2.5 [&_pre]:text-emerald-300 [&_strong]:font-semibold [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-900 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_td]:border [&_td]:border-slate-700 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Action toolbar for Assistant messages (Speak & Copy) */}
        {!isUser && (
          <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              {onSpeak && (
                <button
                  onClick={() => onSpeak(message.id, message.content, language)}
                  disabled={isGeneratingThis}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400",
                    isSpeakingThis
                      ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-400/50 animate-pulse"
                      : isGeneratingThis
                      ? "bg-slate-700/50 text-slate-400 cursor-wait"
                      : "hover:bg-slate-700/80 text-slate-300 hover:text-cyan-400 border border-slate-700/60"
                  )}
                  title={isSpeakingThis ? "Stop Voice Playback" : "Read Aloud (TTS)"}
                  aria-label={isSpeakingThis ? "Stop speaking" : "Speak response aloud"}
                >
                  {isGeneratingThis ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin text-cyan-400" />
                      <span className="text-[11px]">{labels.loading}</span>
                    </>
                  ) : isSpeakingThis ? (
                    <>
                      <Square className="size-3 fill-current text-red-400" />
                      <span className="text-[11px] text-cyan-300">{labels.stop}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="size-3.5 text-cyan-400" />
                      <span className="text-[11px]">{labels.speak}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-500"
              title="Copy response"
              aria-label="Copy message text"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="ai-gradient mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-white shadow-md">
        <Bot className="size-3.5" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-700/80 bg-slate-800/90 px-3.5 py-3 shadow">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-cyan-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
        <span className="ml-1 text-xs text-slate-400">SmartGuard is thinking…</span>
      </div>
    </div>
  );
}

export default ChatMessage;
