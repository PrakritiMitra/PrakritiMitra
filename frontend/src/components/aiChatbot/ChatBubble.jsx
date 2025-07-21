import React from "react";

const ChatBubble = ({ onClick }) => (
  <button
    className="fixed bottom-6 right-6 z-50 bg-green-600 hover:bg-green-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg focus:outline-none"
    onClick={onClick}
    aria-label="Open chat"
  >
    {/* Chat icon SVG */}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0 4.556 4.694 8.25 10.25 8.25.993 0 1.956-.09 2.87-.26.41-.075.82.09 1.07.43l1.13 1.51a.75.75 0 001.32-.53v-2.13c0-.38.214-.725.553-.89C20.7 17.13 21.75 14.7 21.75 12c0-4.556-4.694-8.25-10.25-8.25S2.25 7.444 2.25 12z" />
    </svg>
  </button>
);

export default ChatBubble; 