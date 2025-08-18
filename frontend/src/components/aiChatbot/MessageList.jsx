import React from "react";

// Helper function to convert URLs to clickable links
const renderMessageWithLinks = (text, isBotMessage) => {
  if (!isBotMessage) {
    return text; // User messages remain plain text
  }

  // URL regex pattern to match http/https URLs and mailto links
  const urlRegex = /(https?:\/\/[^\s]+|mailto:[^\s]+)/g;
  
  // Split text by URLs and create array of text and link elements
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // This part is a URL - make it clickable
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all transition-colors duration-200"
        >
          {part}
        </a>
      );
    }
    // This part is regular text
    return part;
  });
};

const MessageList = ({ messages, loading }) => (
  <div className="space-y-4">
    {messages.map((msg, idx) => (
      <div
        key={idx}
        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
        style={{ animationDelay: `${idx * 100}ms` }}
      >
        <div
          className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm border transition-all duration-200 hover:shadow-md
            ${msg.sender === "user"
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-md shadow-green-200/50"
              : "bg-white text-gray-800 rounded-bl-md border-gray-100 shadow-gray-100"
            }
          `}
        >
          <div className="flex items-start space-x-2">
            {msg.sender === "bot" && (
              <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            )}
            <div className="flex-1 leading-relaxed">
              {renderMessageWithLinks(msg.text, msg.sender === "bot")}
            </div>
            {msg.sender === "user" && (
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
    {loading && (
      <div className="flex justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm border bg-white text-gray-800 rounded-bl-md border-gray-100 shadow-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default MessageList; 