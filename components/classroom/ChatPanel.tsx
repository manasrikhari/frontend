'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Participant } from 'livekit-client';
import { 
  X, 
  MessageSquare, 
  Users, 
  Send, 
  MoreVertical, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Lock,
  Reply
} from 'lucide-react';
import { ChatMessage } from '../VideoRoom';
import Tooltip from './Tooltip';

interface ChatPanelProps {
  activeTab: 'chat' | 'participants';
  setActiveTab: (tab: 'chat' | 'participants' | null) => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, targetIdentity?: string, targetName?: string) => void;
  participants: Participant[];
  localParticipant: Participant;
  activeChatTarget: { identity: string; name: string } | null;
  setActiveChatTarget: (target: { identity: string; name: string } | null) => void;
}

export default function ChatPanel({
  activeTab,
  setActiveTab,
  messages,
  onSendMessage,
  participants,
  localParticipant,
  activeChatTarget,
  setActiveChatTarget,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [activeDropdownSid, setActiveDropdownSid] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownSid(null);
      }
    }
    if (activeDropdownSid) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdownSid]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (activeChatTarget) {
      onSendMessage(inputText.trim(), activeChatTarget.identity, activeChatTarget.name);
    } else {
      onSendMessage(inputText.trim());
    }
    setInputText('');
  };

  const handleStartDM = (p: Participant) => {
    const pName = p.name || p.identity;
    setActiveChatTarget({ identity: p.identity, name: pName });
    setActiveTab('chat');
    setActiveDropdownSid(null);
  };

  // Helper to parse message text and render clickable URLs
  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Format timestamp (e.g. 12:45 PM)
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="w-80 border-l border-border/30 bg-[#090d1a]/85 backdrop-blur-xl flex flex-col h-full z-20">
      {/* Header with Tabs */}
      <div className="h-16 border-b border-border/30 flex items-center justify-between px-4 bg-surface/30">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-[#C2CCDE]/60 hover:text-[#C2CCDE] hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'participants'
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-[#C2CCDE]/60 hover:text-[#C2CCDE] hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            People ({participants.length})
          </button>
        </div>

        <button
          onClick={() => setActiveTab(null)}
          className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-[#C2CCDE]/60 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'chat' ? (
          <>
            {/* Target Selector Bar */}
            <div className="px-4 py-2 border-b border-border/20 bg-surface-light/20 flex items-center gap-2">
              <span className="text-xs text-[#C2CCDE]/50 font-semibold select-none flex-shrink-0">To:</span>
              <div className="relative flex-1">
                <select
                  value={activeChatTarget ? activeChatTarget.identity : 'everyone'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'everyone') {
                      setActiveChatTarget(null);
                    } else {
                      const selectedPart = participants.find(p => p.identity === val);
                      if (selectedPart) {
                        setActiveChatTarget({
                          identity: selectedPart.identity,
                          name: selectedPart.name || selectedPart.identity
                        });
                      }
                    }
                  }}
                  className="w-full bg-[#161a26] border border-white/10 hover:border-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none cursor-pointer focus:border-primary/50 transition-colors appearance-none pr-8 font-sans font-semibold"
                >
                  <option value="everyone">Everyone (Public)</option>
                  {participants
                    .filter(p => p.identity !== localParticipant.identity)
                    .map((p) => (
                      <option key={p.identity} value={p.identity}>
                        {p.name || p.identity} (Private)
                      </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-[#C2CCDE]/50">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-foreground/30 space-y-2 select-none">
                  <MessageSquare className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-semibold">Class chat is active</p>
                  <p className="text-[10px] max-w-[180px]">Messages are ephemeral and disappear if you refresh the page.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isLocal = msg.senderIdentity === localParticipant.identity;
                  const isPrivate = !!msg.recipientIdentity;
                  
                  // If it's a private message, verify if we should see it
                  if (isPrivate) {
                    const isForUs = msg.recipientIdentity === localParticipant.identity;
                    const isByUs = msg.senderIdentity === localParticipant.identity;
                    if (!isForUs && !isByUs) return null; // Safety check
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${
                        isPrivate 
                          ? 'bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-2.5' 
                          : ''
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold truncate text-[#C2CCDE]">
                          {isLocal ? 'You' : msg.senderName}
                          {isPrivate && (
                            <span className="text-indigo-400 font-semibold ml-1.5 text-[10px] uppercase tracking-wider select-none">
                              {isLocal ? `(Private to ${msg.recipientName})` : '(Private message)'}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-foreground/35 select-none font-semibold">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 font-medium whitespace-pre-wrap break-words mt-1 leading-relaxed">
                        {renderMessageText(msg.text)}
                      </p>
                      {!isLocal && isPrivate && (
                        <div className="flex justify-end mt-1">
                          <Tooltip content="Reply here" align="right">
                            <button
                              onClick={() => setActiveChatTarget({ identity: msg.senderIdentity, name: msg.senderName })}
                              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold cursor-pointer transition-colors bg-transparent border-none p-0"
                            >
                              <Reply className="w-3 h-3 text-indigo-400" />
                              <span className="underline">Reply</span>
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSend} className="p-3 border-t border-border/30 bg-surface/30 flex gap-2 items-center">
              <input
                type="text"
                placeholder={activeChatTarget ? `Message ${activeChatTarget.name} (privately)...` : "Message everyone..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#161a26] border border-white/10 hover:border-white/20 focus:border-primary/50 text-white placeholder-foreground/35 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all duration-150 font-sans"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 shadow-md shadow-primary/10 active:scale-95 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          /* Participants Section */
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <h4 className="text-xs font-semibold text-foreground/45 uppercase tracking-wider mb-3 select-none">
              In call ({participants.length})
            </h4>
            <div className="space-y-3 flex-1">
              {participants.map((p) => {
                const isLocal = p.identity === localParticipant.identity;
                const isTeacher = p.metadata === 'teacher';
                const pName = p.name || p.identity;
                
                return (
                  <div 
                    key={p.sid} 
                    className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-surface/30 group relative hover:border-white/10 hover:bg-surface-light/20 transition-all duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0 select-none">
                        {pName.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Name Details */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-white truncate pr-1">
                          {pName}
                        </span>
                        {isTeacher && (
                          <span className="text-[9px] text-primary font-bold uppercase tracking-wider leading-none mt-0.5 select-none">
                            Teacher
                          </span>
                        )}
                        {isLocal && (
                          <span className="text-[9px] text-[#C2CCDE]/40 font-bold uppercase tracking-wider leading-none mt-0.5 select-none">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Media Status Indicators & Options Ellipsis */}
                    <div className="flex items-center gap-1.5">
                      {/* Mic Icon */}
                      <div className={`p-1 rounded-md ${p.isMicrophoneEnabled ? 'text-[#C2CCDE]/40' : 'text-red-500 bg-red-500/10'}`}>
                        {p.isMicrophoneEnabled ? (
                          <Mic className="w-3.5 h-3.5" />
                        ) : (
                          <MicOff className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Video Icon */}
                      <div className={`p-1 rounded-md ${p.isCameraEnabled ? 'text-[#C2CCDE]/40' : 'text-red-500 bg-red-500/10'}`}>
                        {p.isCameraEnabled ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <VideoOff className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* 90-deg rotated Ellipsis menu for DMs (hidden for local user) */}
                      {!isLocal && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdownSid(activeDropdownSid === p.sid ? null : p.sid)}
                            className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-[#C2CCDE]/50 hover:text-white transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Ellipsis Dropdown (using 90-deg rotated vertical dots) */}
                          {activeDropdownSid === p.sid && (
                            <div 
                              ref={dropdownRef}
                              className="absolute right-7 top-1 w-32 bg-[#0c101d]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-1 z-[600] animate-in fade-in slide-in-from-top-1 duration-100"
                            >
                              <button
                                onClick={() => handleStartDM(p)}
                                className="w-full text-left px-2.5 py-2 text-xs font-semibold hover:bg-white/5 rounded-lg text-[#C2CCDE] transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Direct Chat
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
