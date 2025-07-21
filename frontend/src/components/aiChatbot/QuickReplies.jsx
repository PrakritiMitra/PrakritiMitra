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
        <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              className="w-full text-left px-4 py-3 text-[15px] text-gray-900 hover:bg-green-50 focus:bg-green-100 transition-colors duration-100 border-b border-gray-100 last:border-b-0"
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <button
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-4 py-2 shadow focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        Suggested Questions
        <svg className={`ml-2 w-4 h-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

export default QuickReplies; 