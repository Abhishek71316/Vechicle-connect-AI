import React from 'react';
import SmartGuardChatbot from '../components/SmartGuardChatbot';

const AIAssistant = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            SmartGuard AI Assistant
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Multilingual conversational assistant for vehicle monitoring, ESP32 hardware telemetry, emergency guidance & coding
          </p>
        </div>
      </div>

      <SmartGuardChatbot mode="embedded" />
    </div>
  );
};

export default AIAssistant;