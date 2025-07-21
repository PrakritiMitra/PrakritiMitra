import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import QuickReplies from "./QuickReplies";

const ChatWindow = ({ isOpen, onClose, messages, onSendMessage, loading, suggestions, onQuickReply }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 max-w-full bg-white rounded-lg shadow-2xl flex flex-col h-[32rem] border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-green-600 rounded-t-lg">
        <span className="text-white font-semibold">PrakritiMitra Assistant</span>
        <button onClick={onClose} className="text-white hover:text-gray-200 focus:outline-none" aria-label="Close chat">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 bg-gray-50">
        <MessageList messages={messages} loading={loading} />
      </div>
      {/* Quick Replies */}
      {suggestions && suggestions.length > 0 && (
        <div className="px-3">
          <QuickReplies suggestions={suggestions} onSelect={onQuickReply} />
        </div>
      )}
      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
        <MessageInput onSend={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow; 