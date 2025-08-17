import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { format } from 'date-fns';
import { FaThumbtack, FaSmile } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { FiEdit2 } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';
import EmojiPicker from 'emoji-picker-react';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from '../../utils/avatarUtils';
import { getSafeUserData, getDisplayName } from '../../utils/safeUserUtils';
import { useChatContext } from '../../context/ChatContext';

// Remove the local utility functions since we're now importing them
// const getSafeUserData = (user) => { ... }
// const getDisplayName = (user) => { ... }


const socket = io('http://localhost:5000', {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token')
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export default function EventChatbox({ eventId, currentUser }) {
  const navigate = useNavigate();
  const { openEventChat, closeEventChat, eventChatOpen, rootChatOpen } = useChatContext();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [fileToSend, setFileToSend] = useState(null); // <-- Add state for selected file
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [unsendConfirm, setUnsendConfirm] = useState({ show: false, msg: null });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Use context state instead of local state
  const isChatOpen = eventChatOpen;

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const firstMsgRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const isLoadingEarlierRef = useRef(false);

  // --- Chat UI Positioning Constants ---
  const PADDING = 37; // 24px from right edge (same as root chatbot)
  const GAP = 60; // Gap between root chatbot and event chatbox
  const BUBBLE_DIMS = { w: 64, h: 64 };
  const CHATBOX_DIMS = { w: 384, h: 500 };
  
  // Function to calculate default position - ensures consistent positioning
  const calculateDefaultPosition = () => {
    // Root chatbot is positioned at bottom-6 right-6 (24px from bottom and right edges)
    // Event chatbox should be positioned above it with an 80px gap for visual separation
    // This creates a clean vertical alignment while maintaining proper spacing
    return {
      x: window.innerWidth - BUBBLE_DIMS.w - PADDING, // 24px from right edge (same as root chatbot)
      y: window.innerHeight - BUBBLE_DIMS.h - PADDING - GAP, // 80px above root chatbot position
    };
  };
  
  // Unified draggable chat position state
  const [chatPos, setChatPos] = useState(() => calculateDefaultPosition());
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const bubbleRef = useRef(null);

  // Function to reset position to default
  const resetToDefaultPosition = () => {
    const newDefaultPos = calculateDefaultPosition();
    setChatPos(newDefaultPos);
  };

  // Update default position when window resizes
  useEffect(() => {
    const updateDefaultPosition = () => {
      const newDefaultPos = calculateDefaultPosition();
      
      // Only update if chat is closed (bubble mode)
      if (!eventChatOpen) {
        setChatPos(newDefaultPos);
      }
    };

    window.addEventListener('resize', updateDefaultPosition);
    return () => window.removeEventListener('resize', updateDefaultPosition);
  }, [eventChatOpen]);

  // Ensure proper positioning on mount and when component updates
  useEffect(() => {
    // Small delay to ensure window dimensions are accurate
    const timer = setTimeout(() => {
      if (!eventChatOpen) {
        resetToDefaultPosition();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [eventChatOpen]); // Run when eventChatOpen changes

  // Handle mouse/touch events for dragging (bubble or header)
  const startDrag = (e) => {
    // Only prevent default for mouse events, not touch events
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
    setDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragOffset({
      x: clientX - chatPos.x,
      y: clientY - chatPos.y,
    });
  };

  const onDrag = (e) => {
    if (!dragging) return;
    // Prevent default for touch events to stop scrolling
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let newX = clientX - dragOffset.x;
    let newY = clientY - dragOffset.y;
    
    // Clamp to window bounds
    const maxW = eventChatOpen ? CHATBOX_DIMS.w : BUBBLE_DIMS.w;
    const maxH = eventChatOpen ? CHATBOX_DIMS.h : BUBBLE_DIMS.h;
    newX = Math.max(0, Math.min(window.innerWidth - maxW, newX));
    newY = Math.max(0, Math.min(window.innerHeight - maxH, newY));
    
    setChatPos({ x: newX, y: newY });
  };

  const stopDrag = () => {
    setDragging(false);
    // Only save position if the chat window was dragged
    if (eventChatOpen) {
      localStorage.setItem('chatPosition', JSON.stringify(chatPos));
    }
  };

  // Load saved chat position on mount (only for chat window, not bubble)
  useEffect(() => {
    const savedPosition = localStorage.getItem('chatPosition');
    if (savedPosition && eventChatOpen) {
      try {
        const parsed = JSON.parse(savedPosition);
        // Validate the saved position is within bounds
        const maxW = window.innerWidth - CHATBOX_DIMS.w;
        const maxH = window.innerHeight - CHATBOX_DIMS.h;
        if (parsed.x >= 0 && parsed.x <= maxW && parsed.y >= 0 && parsed.y <= maxH) {
          setChatPos(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse saved chat position:', error);
      }
    }
  }, [eventChatOpen]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
      // Use non-passive listeners for touch events to allow preventDefault
      window.addEventListener('touchmove', onDrag, { passive: false });
      window.addEventListener('touchend', stopDrag);
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', stopDrag);
    }
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [dragging, dragOffset, chatPos]);

  // Clamp chatPos on window resize
  useEffect(() => {
    const handleResize = () => {
      setChatPos(pos => {
        const maxW = eventChatOpen ? CHATBOX_DIMS.w : BUBBLE_DIMS.w;
        const maxH = eventChatOpen ? CHATBOX_DIMS.h : BUBBLE_DIMS.h;
        return {
          x: Math.max(0, Math.min(window.innerWidth - maxW, pos.x)),
          y: Math.max(0, Math.min(window.innerHeight - maxH, pos.y)),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [eventChatOpen]);

  const EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '😢'];

  // Fetch chat messages (moved outside useEffect for access in handlers)
  const fetchMessages = async (opts = {}) => {
    try {
      let url = `/api/chatbox/events/${eventId}/messages?limit=20`;
      if (opts.before) url += `&before=${opts.before}`;
      const res = await axiosInstance.get(url);
      const newMessages = res.data;
      if (opts.before) {
        // Prepend older messages
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
      setPinnedMessage((prev) => {
        // If loading earlier, keep the current pinned message; else, find in new batch
        return opts.before ? prev : newMessages.find(m => m.isPinned) || null;
      });
      setHasMore(newMessages.length === 20); // If we got a full batch, there may be more
      setIsInitialLoad(false);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setIsInitialLoad(false); // Also set on error to avoid getting stuck
    }
  };

  useEffect(() => {
    // Fetch initial chat history
    fetchMessages();

    // Connect and set up socket listeners
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.on('connect', () => {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        socket.emit('joinEventRoom', eventId);
      }, 100);
    });

    const receiveMessageHandler = (message) => {
      // 1. Robustly get the sender's ID, whether userId is a string or an object.
      const senderId = typeof message.userId === 'object' && message.userId !== null
        ? message.userId._id
        : message.userId;


      // 2. The 'isFromMe' check now works reliably.
      const isFromMe = String(senderId) === String(currentUser._id);

      const container = chatContainerRef.current;
      let isNearBottom = true;
      if (container) {
        isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      }

      setMessages((prev) => [...prev, message]);

      // 3. This condition will now be true when you send a message.
      if (isFromMe || isNearBottom) {
        // This is the new, more reliable scroll logic
        setTimeout(() => {
          const chatContainer = chatContainerRef.current;
          if (chatContainer) {
            // Directly set the scroll position to the bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 50); // Increased timeout to ensure rendering is complete
      }
    };

    socket.on('receiveMessage', receiveMessageHandler);

    const messagePinnedHandler = (updatedMessage) => {
      setMessages(prevMsgs => prevMsgs.map(m =>
        m._id === updatedMessage._id ? { ...m, isPinned: updatedMessage.isPinned } : m
      ));
      setPinnedMessage(updatedMessage.isPinned ? updatedMessage : null);
    };

    socket.on('messagePinned', messagePinnedHandler);

    const reactionUpdateHandler = (updatedMessage) => {
      setMessages(prevMsgs =>
        prevMsgs.map(m => (m._id === updatedMessage._id ? updatedMessage : m))
      );
      if (pinnedMessage && pinnedMessage._id === updatedMessage._id) {
        setPinnedMessage(updatedMessage);
      }
    };

    socket.on('messageReactionUpdate', reactionUpdateHandler);

    const userTypingHandler = ({ userId, userName }) => {
      if (userId !== currentUser._id) {
        setTypingUsers((prev) => ({ ...prev, [userId]: userName }));
      }
    };

    const userStoppedTypingHandler = ({ userId }) => {
      setTypingUsers((prev) => {
        const newTypingUsers = { ...prev };
        delete newTypingUsers[userId];
        return newTypingUsers;
      });
    };

    socket.on('userTyping', userTypingHandler);
    socket.on('userStoppedTyping', userStoppedTypingHandler);

    const messageEditedHandler = (updatedMessage) => {
      setMessages(prevMsgs => prevMsgs.map(m => m._id === updatedMessage._id ? updatedMessage : m));
      if (pinnedMessage && pinnedMessage._id === updatedMessage._id) {
        setPinnedMessage(updatedMessage);
      }
      setEditingMessageId(null);
      setEditingText('');
    };
    socket.on('messageEdited', messageEditedHandler);

    const messageUnsentHandler = ({ messageId }) => {
      setMessages(prevMsgs => prevMsgs.filter(m => m._id !== messageId));
      if (pinnedMessage && pinnedMessage._id === messageId) setPinnedMessage(null);
    };
    socket.on('messageUnsent', messageUnsentHandler);

    return () => {
      // Only cleanup event listeners, don't disconnect the socket
      // The socket will be managed by the singleton pattern
      socket.emit('leaveEventRoom', eventId);
      socket.off('receiveMessage', receiveMessageHandler);
      socket.off('messagePinned', messagePinnedHandler);
      socket.off('messageReactionUpdate', reactionUpdateHandler);
      socket.off('userTyping', userTypingHandler);
      socket.off('userStoppedTyping', userStoppedTypingHandler);
      socket.off('messageEdited', messageEditedHandler);
      socket.off('messageUnsent', messageUnsentHandler);
    };
  }, [eventId, currentUser._id]);

  useEffect(() => {
    // When chatbox is opened, scroll to bottom (latest message)
    if (eventChatOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
  }, [eventChatOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPickerFor(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    socket.emit('typing', { eventId, userName: currentUser.username || currentUser.name || 'User' });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', eventId);
    }, 2000); // 2 seconds of inactivity
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (fileToSend) {
      // Handle file message
      const formData = new FormData();
      formData.append('file', fileToSend);
      try {
        const res = await axiosInstance.post('/api/chatbox/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const { fileUrl, fileType } = res.data;
        socket.emit('sendMessage', { eventId, fileUrl, fileType, message: fileToSend.name, replyTo: replyToMessage?._id });
        setFileToSend(null); // Clear file after sending
        setReplyToMessage(null);
      } catch (err) {
        console.error("File upload failed:", err);
        alert("File upload failed. Please try again.");
      }
    } else if (newMessage.trim()) {
      // Handle text message

      socket.emit('sendMessage', { eventId, message: newMessage, replyTo: replyToMessage?._id });
      socket.emit('stopTyping', eventId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setNewMessage('');
      setReplyToMessage(null);
    }
  };

  const handlePinMessage = async (message) => {
    try {
      const res = await axiosInstance.patch(`/api/chatbox/messages/${message._id}/pin`, { eventId });
      // Emit an event to notify all clients (including this one) about the pin status change
      socket.emit('pinMessage', { eventId, message: res.data });
    } catch (err) {
      console.error("Failed to pin message:", err);
      alert("Only organizers can pin messages.");
    }
  };

  const handleReaction = (messageId, emoji) => {
    socket.emit('reactToMessage', { eventId, messageId, emoji });
    setShowEmojiPickerFor(null);
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prevInput => prevInput + emojiObject.emoji);
    setShowInputEmojiPicker(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToSend(file);
      setNewMessage(''); // Clear text when file is selected
    }
  };

  const typingDisplay = Object.values(typingUsers).join(', ');

  const handleEditClick = (msg) => {
    setEditingMessageId(msg._id);
    setEditingText(msg.message);
  };

  const handleEditSave = (msg) => {
    if (editingText.trim() && editingText !== msg.message) {
      socket.emit('editMessage', { eventId, messageId: msg._id, newText: editingText });
    } else {
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const canEditMessage = (msg) => {
    const safeUser = getSafeUserData(msg.userId);
    if (safeUser.isDeleted || safeUser._id !== currentUser._id) return false;
    if (msg.editCount > 0) return false;
    const now = new Date();
    const created = new Date(msg.createdAt);
    return (now - created) <= 5 * 60 * 1000;
  };

  const canUnsendMessage = (msg) => {
    const safeUser = getSafeUserData(msg.userId);
    if (safeUser.isDeleted || safeUser._id !== currentUser._id) return false;
    const now = new Date();
    const created = new Date(msg.createdAt);
    return (now - created) <= 5 * 60 * 1000;
  };

  const handleUnsendClick = (msg) => {
    setUnsendConfirm({ show: true, msg });
  };

  const handleUnsendConfirm = () => {
    if (unsendConfirm.msg) {
      socket.emit('unsendMessage', { eventId, messageId: unsendConfirm.msg._id });
    }
    setUnsendConfirm({ show: false, msg: null });
  };

  const handleUnsendCancel = () => {
    setUnsendConfirm({ show: false, msg: null });
  };

  const handleUsernameClick = (user) => {
    if (!user || user.isDeleted || !user._id) {
      // Show a toast or alert for deleted users instead of navigation
      alert('This user account has been deleted');
      return;
    }
    
    if (user.role === 'organizer') {
      navigate(`/organizer/${user._id}`);
    } else {
      navigate(`/volunteer/${user._id}`);
    }
  };

  const handleBubbleClick = () => {
    setIsChatOpen(prev => !prev);
  };

  const handleLoadEarlier = async () => {
    if (messages.length === 0) return;
    setLoadingEarlier(true);
    // Record scrollHeight and scrollTop before loading
    const container = chatContainerRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;
    const prevScrollTop = container ? container.scrollTop : 0;
    isLoadingEarlierRef.current = true;

    await fetchMessages({ before: messages[0]._id });
    setLoadingEarlier(false);

    // After loading, adjust scrollTop to keep the view anchored
    setTimeout(() => {
      const containerNow = chatContainerRef.current;
      if (containerNow) {
        const newScrollHeight = containerNow.scrollHeight;
        containerNow.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      }
      isLoadingEarlierRef.current = false;
    }, 0);
  };


  return (
    <>
      {/* Draggable Floating Chat Bubble (only shows when chat is closed AND root chatbot is closed) */}
       {!isChatOpen && !rootChatOpen && (
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            left: chatPos.x,
            top: chatPos.y,
            width: BUBBLE_DIMS.w,
            height: BUBBLE_DIMS.h,
            zIndex: 1051,
            borderRadius: '50%',
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 0 2px rgba(37, 99, 235, 0.1)',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: dragging ? 'none' : 'transform 0.2s',
          }}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          onClick={() => {
            if (dragging) return;
            // Open the chat window at the bubble's current position
            // Clamp to window for chatbox size
            const clampedX = Math.max(PADDING, Math.min(window.innerWidth - CHATBOX_DIMS.w - PADDING, chatPos.x));
            const clampedY = Math.max(PADDING, Math.min(window.innerHeight - CHATBOX_DIMS.h - PADDING, chatPos.y));
            setChatPos({ x: clampedX, y: clampedY });
            openEventChat();
          }}
        >
          <span className="text-3xl" style={{ color: 'white' }}>💬</span>
        </div>
      )}

      {/* Draggable Chat Window */}
      {isChatOpen && (
        <div 
          style={{
            position: 'fixed',
            left: chatPos.x,
            top: chatPos.y,
            width: 384,
            height: 500,
            zIndex: 1050,
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            userSelect: dragging ? 'none' : 'auto',
          }}
        >
          {/* The header is now the drag handle for the window. */}
          <div 
            className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center"
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          >
            <h3 className="font-semibold text-lg">Event Chat</h3>
            <button 
              onClick={() => {
                closeEventChat();
                resetToDefaultPosition();
                // Clear saved chat window position
                localStorage.removeItem('chatPosition');
              }} 
              className="text-white text-2xl leading-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              &times;
            </button>
          </div>
          {pinnedMessage && (
            <div className="p-3 bg-yellow-100 border-b border-yellow-300">
              <div className="flex items-center gap-2 text-yellow-800">
                <FaThumbtack className="text-sm" />
                <span className="font-semibold text-sm">PINNED</span>
                {currentUser.role === 'organizer' && (
                  <button
                    onClick={() => handlePinMessage(pinnedMessage)}
                    className="ml-2 px-2 py-1 bg-yellow-300 text-yellow-900 rounded hover:bg-yellow-400 text-xs font-semibold"
                    title="Unpin Message"
                  >
                    Unpin
                  </button>
                )}
              </div>
                              <div className="text-sm mt-1 text-gray-800">
                  <span 
                    className={`font-semibold ${pinnedMessage.userId && !pinnedMessage.userId.isDeleted ? 'cursor-pointer hover:text-blue-600 hover:underline' : 'text-gray-500 cursor-default'}`}
                    onClick={() => pinnedMessage.userId && !pinnedMessage.userId.isDeleted && handleUsernameClick(pinnedMessage.userId)}
                  >
                    {getDisplayName(pinnedMessage.userId)}:
                  </span> {pinnedMessage.message}
                </div>
              {pinnedMessage.fileUrl && (
                pinnedMessage.fileType && pinnedMessage.fileType.startsWith('image/') ? (
                  <img
                    src={`http://localhost:5000${pinnedMessage.fileUrl}`}
                    alt="Pinned file"
                    className="mt-2 rounded-lg max-w-full h-auto"
                  />
                ) : (
                  <a
                    href={`http://localhost:5000${pinnedMessage.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-blue-600 underline"
                  >
                    View File: {pinnedMessage.message}
                  </a>
                )
              )}
              <div className="text-xs text-right mt-1 opacity-70">
                {format(new Date(pinnedMessage.createdAt), 'p')}
              </div>
            </div>
          )}
          <div className="flex-1 p-4 overflow-y-auto" ref={chatContainerRef}>
            {hasMore && (
              <div className="flex justify-center mb-2">
                <button
                  onClick={handleLoadEarlier}
                  className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 border border-gray-300"
                  disabled={loadingEarlier}
                >
                  {loadingEarlier ? 'Loading...' : 'Load earlier messages'}
                </button>
              </div>
            )}
            {messages.length === 0 ? (
              <>
                <div className="text-center italic text-gray-400 py-8">
                  No messages yet. Start the conversation!
                </div>
                <div ref={chatEndRef} />
              </>
            ) : <>
              {messages.map((msg, idx) => {
                const safeUser = getSafeUserData(msg.userId);
                const isMe = safeUser._id === currentUser._id;
                const role = safeUser.role;
                const roleLabel = role === 'organizer' ? 'Organizer' : 'Volunteer';
                const roleColor = role === 'organizer' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white';
                // Improved color scheme for sender's own messages
                const bubbleColor = isMe
                  ? (role === 'organizer'
                      ? 'bg-blue-200 text-blue-900 border border-blue-400'
                      : 'bg-green-200 text-green-900 border border-green-400')
                  : (role === 'organizer'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-green-100 text-green-900');
                const isPinned = pinnedMessage && msg._id === pinnedMessage._id;

                const aggregatedReactions = msg.reactions.reduce((acc, reaction) => {
                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                  return acc;
                }, {});

                // For reply display
                const reply = msg.replyTo;

                return (
                  <div
                    key={msg._id}
                    ref={idx === 0 ? firstMsgRef : null}
                    className={`group flex items-start gap-3 my-2 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {getProfileImageUrl(safeUser) ? (
                      <img
                        src={getProfileImageUrl(safeUser)}
                        alt={getDisplayName(safeUser)}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRoleColors(safeUser.role)}`}>
                        <span className="text-xs font-bold">{getAvatarInitial(safeUser)}</span>
                      </div>
                    )}
                    <div className={`relative p-3 rounded-lg max-w-[70%] ${bubbleColor} ${isPinned ? 'border-2 border-yellow-400' : ''}`}>
                                              {/* Reply preview in chat bubble */}
                                              {reply && (
                          <div className="mb-2 p-2 rounded bg-gray-100 border-l-4 border-blue-400">
                            <div className="text-xs text-gray-500">Replying to <span 
                              className={`font-semibold ${reply.userId && !reply.userId.isDeleted ? 'cursor-pointer hover:text-blue-600 hover:underline' : 'text-gray-500 cursor-default'}`}
                              onClick={() => reply.userId && !reply.userId.isDeleted && handleUsernameClick(reply.userId)}
                            >{getDisplayName(reply.userId)}</span></div>
                            <div className="truncate text-xs text-gray-700 max-w-xs">{reply.message}</div>
                          </div>
                        )}
                      <div className="absolute top-0 right-0 -mt-2 flex items-center gap-1">
                        {currentUser.role === 'organizer' && (
                          isPinned ? (
                            <button
                              onClick={() => handlePinMessage(msg)}
                              className={`p-1 rounded-full bg-white text-yellow-500 hover:text-yellow-700 border border-yellow-400`}
                              title="Unpin Message"
                            >
                              <FaThumbtack size={12} />
                            </button>
                          ) : (
                            !pinnedMessage && (
                              <button
                                onClick={() => handlePinMessage(msg)}
                                className="p-1 rounded-full bg-white text-gray-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Pin Message"
                              >
                                <FaThumbtack size={12} />
                              </button>
                            )
                          )
                        )}
                        <button
                          onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg._id ? null : msg._id)}
                          className="p-1 rounded-full bg-white text-gray-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Add reaction"
                        >
                          <FaSmile size={12} />
                        </button>
                        <button
                          onClick={() => setReplyToMessage(msg)}
                          className="p-1 rounded-full bg-white text-gray-500 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Reply"
                        >
                          ↩️
                        </button>
                        {canEditMessage(msg) && (
                          <button
                            onClick={() => handleEditClick(msg)}
                            className="p-1 rounded-full bg-white text-gray-500 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit"
                          >
                            <FiEdit2 size={12} />
                          </button>
                        )}
                        {canUnsendMessage(msg) && (
                          <button
                            onClick={() => handleUnsendClick(msg)}
                            className="p-1 rounded-full bg-white text-gray-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Unsend"
                          >
                            <MdDelete size={14} />
                          </button>
                        )}
                      </div>

                      {showEmojiPickerFor === msg._id && (
                        <div ref={emojiPickerRef} className="absolute z-10 -top-8 left-0 bg-white border rounded-full px-2 py-1 flex gap-1 shadow-lg">
                          {EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg._id, emoji)}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className={`font-semibold text-sm ${safeUser.isDeleted ? 'text-gray-500 cursor-default' : 'cursor-pointer hover:text-blue-600 hover:underline'}`}
                          onClick={() => !safeUser.isDeleted && handleUsernameClick(safeUser)}
                        >
                          {getDisplayName(safeUser)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${roleColor}`}>{roleLabel}</span>
                        {isPinned && (
                          <FaThumbtack className="ml-1 text-yellow-500" title="Pinned" />
                        )}
                      </div>
                      {editingMessageId === msg._id ? (
                        <div className="flex gap-2 items-center mt-1">
                          <input
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            className="flex-1 p-1 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            maxLength={500}
                          />
                          <button
                            type="button"
                            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 border border-blue-700 font-semibold"
                            onClick={() => handleEditSave(msg)}
                          >Save</button>
                          <button
                            type="button"
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 border border-gray-400 font-semibold"
                            onClick={() => { setEditingMessageId(null); setEditingText(''); }}
                          >Cancel</button>
                        </div>
                      ) : (
                        <p className="text-sm break-words whitespace-pre-line">{msg.message}</p>
                      )}
                      {msg.fileUrl && (
                        msg.fileType && msg.fileType.startsWith('image/') ? (
                          <img
                            src={`http://localhost:5000${msg.fileUrl}`}
                            alt="Shared file"
                            className="mt-2 rounded-lg max-w-full h-auto"
                          />
                        ) : (
                          <a
                            href={`http://localhost:5000${msg.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 text-blue-300 underline"
                          >
                            View File: {msg.message}
                          </a>
                        )
                      )}
                      {msg.edited && (
                        <div className="text-xs text-gray-400 mt-1">edited</div>
                      )}
                      <div className="text-xs text-right mt-1 opacity-70">
                        {format(new Date(msg.createdAt), 'p')}
                      </div>
                      {Object.keys(aggregatedReactions).length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {Object.entries(aggregatedReactions).map(([emoji, count]) => (
                            <div
                              key={emoji}
                              className="bg-gray-200 bg-opacity-50 rounded-full px-2 py-0.5 flex items-center text-xs"
                            >
                              <span>{emoji}</span>
                              <span className="ml-1 font-semibold">{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </>}
          </div>
          <div className="h-6 px-4 text-sm text-gray-500 italic">
            {typingDisplay && `${typingDisplay} is typing...`}
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t relative">
            {/* Unsend confirmation dialog */}
            {unsendConfirm.show && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white rounded-lg shadow-lg p-6 w-80">
                  <div className="mb-4 text-gray-800 font-semibold">Unsend this message?</div>
                  <div className="mb-4 text-gray-600 text-sm truncate">{unsendConfirm.msg?.message}</div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleUnsendCancel}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >Cancel</button>
                    <button
                      onClick={handleUnsendConfirm}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >Unsend</button>
                  </div>
                </div>
              </div>
            )}
            {replyToMessage && (
                              <div className="p-2 bg-gray-100 rounded-lg mb-2 relative flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Replying to <span 
                      className={`font-semibold ${replyToMessage.userId && !replyToMessage.userId.isDeleted ? 'cursor-pointer hover:text-blue-600 hover:underline' : 'text-gray-500 cursor-default'}`}
                      onClick={() => replyToMessage.userId && !replyToMessage.userId.isDeleted && handleUsernameClick(replyToMessage.userId)}
                    >{getDisplayName(replyToMessage.userId)}</span></div>
                    <div className="truncate text-sm text-gray-700 max-w-xs">{replyToMessage.message}</div>
                  </div>
                <button type="button" onClick={() => setReplyToMessage(null)} className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full"><IoMdClose size={16} /></button>
              </div>
            )}
            {showInputEmojiPicker && (
              <div className="absolute bottom-16">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
            {fileToSend && (
              <div className="p-2 bg-gray-100 rounded-lg mb-2 relative">
                {fileToSend.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(fileToSend)}
                    alt="Preview"
                    className="max-h-40 rounded-lg mx-auto"
                  />
                ) : (
                  <div className="text-sm p-2">{fileToSend.name}</div>
                )}
                <button
                  type="button"
                  onClick={() => setFileToSend(null)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  &times;
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type your message..."
                className="flex-1 min-w-0 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!fileToSend} // Disable text input when file is selected
              />
              <button
                type="button"
                onClick={() => setShowInputEmojiPicker(val => !val)}
                className="flex-shrink-0 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <FaSmile />
              </button>
              <label className="flex-shrink-0 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer">
                📎
                <input type="file" hidden onChange={handleFileSelect} />
              </label>
              <button type="submit" className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
} 