import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axiosInstance from '../../api/axiosInstance';
import { format } from 'date-fns';
import { FaThumbtack, FaSmile } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { FiEdit2 } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';
import EmojiPicker from 'emoji-picker-react';


const socket = io('http://localhost:5000', {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token')
  }
});

export default function EventChat({ eventId, currentUser }) {
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

  // New state for the floating bubble UI
  const [isChatOpen, setIsChatOpen] = useState(false);

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const firstMsgRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const isLoadingEarlierRef = useRef(false);

  const EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '😢'];

  // Fetch chat messages (moved outside useEffect for access in handlers)
  const fetchMessages = async (opts = {}) => {
    try {
      let url = `/chat/events/${eventId}/messages?limit=20`;
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
    socket.connect();
    socket.emit('joinEventRoom', eventId);

    const receiveMessageHandler = (message) => {
      const container = chatContainerRef.current;
      let isNearBottom = true;
      if (container) {
        isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      }
      setMessages((prev) => [...prev, message]);
      if (isNearBottom) {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 0);
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
      socket.emit('leaveEventRoom', eventId);
      socket.off('receiveMessage', receiveMessageHandler);
      socket.off('messagePinned', messagePinnedHandler);
      socket.off('messageReactionUpdate', reactionUpdateHandler);
      socket.off('userTyping', userTypingHandler);
      socket.off('userStoppedTyping', userStoppedTypingHandler);
      socket.off('messageEdited', messageEditedHandler);
      socket.off('messageUnsent', messageUnsentHandler);
      socket.disconnect();
    };
  }, [eventId, currentUser._id]);

  useEffect(() => {
    // When chatbox is opened, scroll to bottom (latest message)
    if (isChatOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
  }, [isChatOpen]);

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

    socket.emit('typing', { eventId, userName: currentUser.name });

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
        const res = await axiosInstance.post('/chat/upload', formData, {
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
      const res = await axiosInstance.patch(`/chat/messages/${message._id}/pin`, { eventId });
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
    if (msg.userId?._id !== currentUser._id) return false;
    if (msg.editCount > 0) return false;
    const now = new Date();
    const created = new Date(msg.createdAt);
    return (now - created) <= 5 * 60 * 1000;
  };

  const canUnsendMessage = (msg) => {
    if (msg.userId?._id !== currentUser._id) return false;
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
      {/* Floating Chat Bubble */}
      <div
        className="fixed z-50 rounded-full bg-blue-600 w-16 h-16 flex items-center justify-center shadow-lg cursor-pointer select-none bottom-24 right-6"
        onClick={handleBubbleClick}
      >
        <span className="text-3xl">💬</span>
      </div>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-lg shadow-xl border flex flex-col h-[500px] z-50">
          <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold text-lg">Event Chat</h3>
            <button onClick={() => setIsChatOpen(false)} className="text-white text-2xl leading-none">&times;</button>
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
                <span className="font-semibold">{pinnedMessage.userId.name}:</span> {pinnedMessage.message}
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
              <div className="text-center italic text-gray-400 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : messages.map((msg, idx) => {
              const isMe = msg.userId?._id === currentUser._id;
              const role = msg.userId?.role;
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
                  <img
                    src={msg.userId?.profileImage ? `http://localhost:5000/uploads/Profiles/${msg.userId.profileImage}` : '/images/default-profile.jpg'}
                    alt={msg.userId?.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className={`relative p-3 rounded-lg max-w-[70%] ${bubbleColor} ${isPinned ? 'border-2 border-yellow-400' : ''}`}>
                    {/* Reply preview in chat bubble */}
                    {reply && (
                      <div className="mb-2 p-2 rounded bg-gray-100 border-l-4 border-blue-400">
                        <div className="text-xs text-gray-500">Replying to <span className="font-semibold">{reply.userId?.name}</span></div>
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
                      <span className="font-semibold text-sm">{msg.userId?.name}</span>
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
                  <div className="text-xs text-gray-500">Replying to <span className="font-semibold">{replyToMessage.userId?.name}</span></div>
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