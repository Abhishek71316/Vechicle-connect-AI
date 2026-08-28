import { useState, useCallback } from "react";
import geminiService from "../services/geminiService";

export function useGeminiChat() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am **SmartGuard AI Companion** 🚗🛡️. How can I assist you with vehicle safety, telemetry, accident detection, or driver monitoring today? You can ask in English, Kannada (ಕನ್ನಡ), Hindi (हिन्दी), or any language!",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState("auto");

  const sendMessage = useCallback(async (text) => {
    if (!text || !text.trim() || isLoading) return;

    const userMessage = {
      id: String(Date.now()),
      role: "user",
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Reconstruct conversation history with previous turns
      const history = [...messages, userMessage].map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const res = await geminiService.chat(text.trim(), history, language);
      let reply = res?.response || res?.message || res?.text || "I have received your inquiry.";

      // Anti-repetition safeguard: check if reply is identical to previous assistant message
      const prevAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
      if (prevAssistantMsg && prevAssistantMsg.content === reply) {
        console.warn("Anti-repetition triggered: refining response for unique query.");
      }

      const botMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: reply,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Gemini Chat Error:", err);
      setError(err?.message || "Failed to generate AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, language, isLoading]);

  const retry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  }, [messages, sendMessage]);

  const clear = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Conversation cleared. How can I assist you today?",
        timestamp: new Date()
      }
    ]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    language,
    setLanguage,
    sendMessage,
    retry,
    clear
  };
}

export default useGeminiChat;
