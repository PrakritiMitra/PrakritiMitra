import React from "react";

const MessageList = ({ messages, loading }) => (
  <div className="space-y-2">
    {messages.map((msg, idx) => (
      <div
        key={idx}
        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`px-4 py-2 rounded-lg max-w-[75%] text-sm shadow
            ${msg.sender === "user"
              ? "bg-green-600 text-white rounded-br-none"
              : "bg-gray-200 text-gray-900 rounded-bl-none"}
          `}
        >
          {msg.text}
        </div>
      </div>
    ))}
    {loading && (
      <div className="flex justify-start">
        <div className="px-4 py-2 rounded-lg max-w-[75%] text-sm shadow bg-gray-200 text-gray-900 rounded-bl-none flex items-center gap-2">
          <span>...</span>
          {/* Optionally, add a spinner or animated dots here */}
        </div>
      </div>
    )}
  </div>
);

export default MessageList; 