import React, { useState, useRef, useEffect } from "react";

const QuickReplies = ({ suggestions, onSelect }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!suggestions?.length) return null;
  
  return (
    <div className="relative" ref={dropdownRef}>
      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-3 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto backdrop-blur-sm bg-white/95 animate-in slide-in-from-bottom-2 duration-200">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-3 py-2 border-b border-gray-100">
              Suggested Questions
            </div>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 focus:bg-green-100 focus:text-green-800 transition-all duration-150 border-b border-gray-50 last:border-b-0 rounded-lg group"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <span className="flex-1">{s}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1.5} 
                    stroke="currentColor" 
                    className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 flex items-center justify-between transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] group"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span>Quick Questions</span>
        </div>
        <svg 
          className={`ml-2 w-5 h-5 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

export default QuickReplies; 