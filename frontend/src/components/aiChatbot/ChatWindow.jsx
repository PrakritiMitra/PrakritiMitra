import React, { useState, useEffect, useRef } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import QuickReplies from "./QuickReplies";

const ChatWindow = ({ isOpen, onClose, messages, onSendMessage, loading, suggestions, onQuickReply }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isWaving, setIsWaving] = useState(false);
  const [characterPosition, setCharacterPosition] = useState({ x: 50, y: 25 });
  const headerRef = useRef(null);

  // Track mouse position for cursor following
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (headerRef.current) {
        const headerRect = headerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - headerRect.left;
        const relativeY = e.clientY - headerRect.top;
        
        // Only update if mouse is within header bounds
        if (relativeX >= 0 && relativeX <= headerRect.width && 
            relativeY >= 0 && relativeY <= headerRect.height) {
          setMousePosition({ x: relativeX, y: relativeY });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Update character position based on mouse movement (constrained to header)
  useEffect(() => {
    const updateCharacterPosition = () => {
      if (headerRef.current) {
        const headerRect = headerRef.current.getBoundingClientRect();
        const maxX = headerRect.width - 30; // Character width
        const maxY = headerRect.height - 40; // Character height
        
        setCharacterPosition(prev => {
          // Constrain target position within header bounds
          const targetX = Math.max(15, Math.min(maxX, mousePosition.x));
          const targetY = Math.max(20, Math.min(maxY, mousePosition.y));
          
          // Smooth movement towards cursor
          const newX = prev.x + (targetX - prev.x) * 0.1;
          const newY = prev.y + (targetY - prev.y) * 0.1;
          
          return { x: newX, y: newY };
        });
      }
    };

    const interval = setInterval(updateCharacterPosition, 50);
    return () => clearInterval(interval);
  }, [mousePosition]);

  // Trigger waving animation periodically
  useEffect(() => {
    const waveInterval = setInterval(() => {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 1000);
    }, 5000);

    return () => clearInterval(waveInterval);
  }, []);

  if (!isOpen) return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 md:w-[420px] max-w-[90vw] bg-white rounded-2xl shadow-2xl flex flex-col h-[32rem] md:h-[36rem] border border-gray-100 backdrop-blur-sm bg-white/95 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div 
        ref={headerRef}
        className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-500 to-green-600 rounded-t-2xl relative overflow-hidden"
      >
        <div className="flex items-center space-x-3 relative">
          {/* 3D Animated Character - Constrained to header area */}
          <div 
            className="absolute w-12 h-16 pointer-events-none z-10 transition-transform duration-300 ease-out"
            style={{
              left: `${characterPosition.x}px`,
              top: `${characterPosition.y}px`,
              transform: `translate(-50%, -50%)`
            }}
          >
            <div className="relative w-12 h-16 animate-bounce" style={{ animationDuration: '2s' }}>
              {/* Head - 3D Sphere */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-lg animate-pulse"></div>
              
              {/* Eyes - Animated */}
              <div className="absolute top-1 left-2 w-1 h-1 bg-green-600 rounded-full animate-pulse"></div>
              <div className="absolute top-1 right-2 w-1 h-1 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              
              {/* Smile - Animated */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-3 h-1 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              
              {/* Body - 3D Cylinder */}
              <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-4 h-6 bg-white rounded-lg shadow-md"></div>
              
              {/* Arms - Waving Animation */}
              <div 
                className={`absolute top-6 left-0 w-2 h-4 bg-white rounded-full shadow-md origin-bottom ${
                  isWaving ? 'animate-ping' : 'animate-pulse'
                }`} 
                style={{ 
                  animationDuration: isWaving ? '0.5s' : '2s', 
                  animationDelay: '0.2s',
                  transform: isWaving ? 'rotate(-45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease-in-out'
                }}
              ></div>
              <div 
                className={`absolute top-6 right-0 w-2 h-4 bg-white rounded-full shadow-md origin-bottom ${
                  isWaving ? 'animate-ping' : 'animate-pulse'
                }`} 
                style={{ 
                  animationDuration: isWaving ? '0.5s' : '2s', 
                  animationDelay: '0.7s',
                  transform: isWaving ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease-in-out'
                }}
              ></div>
              
              {/* Hands - Waving */}
              <div className="absolute top-9 left-0 w-2 h-2 bg-white rounded-full shadow-md animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="absolute top-9 right-0 w-2 h-2 bg-white rounded-full shadow-md animate-pulse" style={{ animationDelay: '0.8s' }}></div>
              
              {/* Legs */}
              <div className="absolute top-10 left-1 w-1 h-3 bg-white rounded-full shadow-sm"></div>
              <div className="absolute top-10 right-1 w-1 h-3 bg-white rounded-full shadow-sm"></div>
              
              {/* Feet */}
              <div className="absolute top-12 left-0 w-2 h-1 bg-white rounded-full shadow-sm"></div>
              <div className="absolute top-12 right-0 w-2 h-1 bg-white rounded-full shadow-sm"></div>
              
              {/* 3D Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 to-green-600/30 rounded-full animate-pulse"></div>
              
              {/* Floating Particles */}
              <div className="absolute -top-1 left-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute -top-1 right-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
              <div className="absolute top-0 -left-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '2s' }}></div>
            </div>
          </div>
          
          {/* Sevak Text - Now positioned relative to character */}
          <div className="ml-16">
            <span className="text-white font-semibold text-lg">Sevak</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <span className="text-green-100 text-xs">Online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1 transition-all duration-200 hover:bg-white/10" 
          aria-label="Close chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gradient-to-b from-gray-50 to-white">
        <MessageList messages={messages} loading={loading} />
      </div>
      
      {/* Quick Replies */}
      {suggestions && suggestions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
          <QuickReplies suggestions={suggestions} onSelect={onQuickReply} />
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
        <MessageInput onSend={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow; 