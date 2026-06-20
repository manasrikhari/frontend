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
  Reply,
  Lock
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
  roomName: string;
  globalWhiteboardAllowed?: boolean;
  globalScreenShareAllowed?: boolean;
  allowedWhiteboardStudents?: Record<string, boolean>;
  allowedScreenShareStudents?: Record<string, boolean>;
  onToggleGlobalPermission?: (type: 'whiteboard' | 'screenshare') => void;
  onToggleStudentPermission?: (identity: string, type: 'whiteboard' | 'screenshare') => void;
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
  roomName,
  globalWhiteboardAllowed = false,
  globalScreenShareAllowed = false,
  allowedWhiteboardStudents = {},
  allowedScreenShareStudents = {},
  onToggleGlobalPermission,
  onToggleStudentPermission,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [activeDropdownSid, setActiveDropdownSid] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLocalTeacher = localParticipant.metadata === 'teacher';

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

  const handleMuteToggle = async (p: Participant, trackType: 'audio' | 'video', shouldMute: boolean) => {
    const actionKey = `${p.identity}-${trackType}`;
    if (loadingActions[actionKey]) return;

    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    try {
      const accessToken = sessionStorage.getItem('classroom_access_token');
      const response = await fetch('/api/mute-participant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          roomId: roomName,
          participantIdentity: p.identity,
          trackType,
          muted: shouldMute
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Action failed' }));
        alert(data.error || 'Failed to change mute state');
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
      alert('Error toggling mute state');
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleKickParticipant = async (p: Participant) => {
    if (!confirm(`Are you sure you want to kick student ${p.name || p.identity}?`)) return;
    
    const actionKey = `${p.identity}-kick`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    try {
      const accessToken = sessionStorage.getItem('classroom_access_token');
      const response = await fetch('/api/kick-participant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          roomId: roomName,
          participantIdentity: p.identity
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Action failed' }));
        alert(data.error || 'Failed to kick participant');
      }
      setActiveDropdownSid(null);
    } catch (error) {
      console.error('Error kicking participant:', error);
      alert('Error kicking participant');
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

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

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="fixed inset-0 w-full h-full z-[999999] bg-[#090d1a]/98 backdrop-blur-2xl flex flex-col md:right-0 md:left-auto md:w-80 md:inset-y-0 md:h-full md:border-l md:border-border/30 md:bg-[#090d1a]/95 md:z-50 lg:relative lg:w-80 lg:bg-[#090d1a]/85 lg:backdrop-blur-xl lg:shadow-none lg:z-50">
      {/* Mobile-only Google Meet Header */}
      <div className="md:hidden h-14 border-b border-border/20 flex items-center justify-between px-4 bg-surface/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab(null)}
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#C2CCDE] hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-base font-bold text-white tracking-wide">
            {activeTab === 'chat' ? 'In-call messages' : `People (${participants.length})`}
          </span>
        </div>
      </div>

      {/* Mobile-only Tab Selector Bar */}
      <div className="md:hidden flex border-b border-border/10 bg-surface/10">
        <button
          onClick={() => setActiveTab('chat')}
          type="button"
          className={`flex-1 py-3.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'border-primary text-white bg-white/[0.02]'
              : 'border-transparent text-[#C2CCDE] hover:text-white'
          }`}
        >
          Chat messages
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          type="button"
          className={`flex-1 py-3.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'participants'
              ? 'border-primary text-white bg-white/[0.02]'
              : 'border-transparent text-[#C2CCDE] hover:text-white'
          }`}
        >
          People ({participants.length})
        </button>
      </div>

      {/* Desktop/Tablet Header */}
      <div className="hidden md:flex h-16 border-b border-border/30 items-center justify-between px-4 bg-surface/30">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            type="button"
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
            type="button"
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
          type="button"
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
                  
                  if (isPrivate) {
                    const isForUs = msg.recipientIdentity === localParticipant.identity;
                    const isByUs = msg.senderIdentity === localParticipant.identity;
                    if (!isForUs && !isByUs) return null;
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
          <div className="flex-1 overflow-y-auto p-4 flex flex-col font-sans">
            {isLocalTeacher && (
              <div className="mb-4 p-3.5 bg-[#161a26]/40 border border-white/5 rounded-xl space-y-3 font-sans">
                <div className="text-[10px] font-bold text-[#C2CCDE]/40 uppercase tracking-wider select-none">
                  Global Class Permissions
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/95">Allow Student Whiteboard</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={globalWhiteboardAllowed}
                      onChange={() => onToggleGlobalPermission?.('whiteboard')}
                    />
                    <div className="w-9 h-5 bg-[#2d3139] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#C2CCDE] after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/95">Allow Student Screen Share</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={globalScreenShareAllowed}
                      onChange={() => onToggleGlobalPermission?.('screenshare')}
                    />
                    <div className="w-9 h-5 bg-[#2d3139] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#C2CCDE] after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
                  </label>
                </div>
              </div>
            )}

            <h4 className="text-xs font-semibold text-foreground/45 uppercase tracking-wider mb-3 select-none">
              In call ({participants.length})
            </h4>
            <div className="space-y-3 flex-1">
              {participants.map((p) => {
                const isLocal = p.identity === localParticipant.identity;
                const isTeacher = p.metadata === 'teacher';
                const pName = p.name || p.identity;
                
                const isMicLoading = loadingActions[`${p.identity}-audio`];
                const isCamLoading = loadingActions[`${p.identity}-video`];

                const isStudentWhiteboardAllowed = globalWhiteboardAllowed || !!allowedWhiteboardStudents[p.identity];
                const isStudentScreenShareAllowed = globalScreenShareAllowed || !!allowedScreenShareStudents[p.identity];
                const isStudentLocked = !isStudentWhiteboardAllowed && !isStudentScreenShareAllowed;
                
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
                      <div className="flex flex-col min-w-0 font-sans">
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
 
                    {/* Media Status Indicators & Controls */}
                    <div className="flex items-center gap-1.5">
                      {/* Microphone Control */}
                      {isLocalTeacher && !isLocal && p.metadata !== 'teacher' ? (
                        <Tooltip content={p.isMicrophoneEnabled ? "Mute Mic" : "Microphone Muted"} align="right">
                          <button
                            disabled={isMicLoading || !p.isMicrophoneEnabled}
                            onClick={() => handleMuteToggle(p, 'audio', true)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              p.isMicrophoneEnabled 
                                ? 'text-[#C2CCDE]/60 hover:text-white hover:bg-white/5 border-transparent cursor-pointer' 
                                : 'text-red-500 bg-red-500/10 border-red-500/20 opacity-55 cursor-not-allowed'
                            }`}
                          >
                            {isMicLoading ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : p.isMicrophoneEnabled ? (
                              <Mic className="w-3.5 h-3.5" />
                            ) : (
                              <MicOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </Tooltip>
                      ) : (
                        <div className={`p-1.5 rounded-md ${p.isMicrophoneEnabled ? 'text-[#C2CCDE]/40' : 'text-red-500 bg-red-500/10'}`}>
                          {p.isMicrophoneEnabled ? (
                            <Mic className="w-3.5 h-3.5" />
                          ) : (
                            <MicOff className="w-3.5 h-3.5" />
                          )}
                        </div>
                      )}
 
                      {/* Camera Control */}
                      {isLocalTeacher && !isLocal && p.metadata !== 'teacher' ? (
                        <Tooltip content={p.isCameraEnabled ? "Turn Off Camera" : "Camera Disabled"} align="left">
                          <button
                            disabled={isCamLoading || !p.isCameraEnabled}
                            onClick={() => handleMuteToggle(p, 'video', true)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              p.isCameraEnabled 
                                ? 'text-[#C2CCDE]/60 hover:text-white hover:bg-white/5 border-transparent cursor-pointer' 
                                : 'text-red-500 bg-red-500/10 border-red-500/20 opacity-55 cursor-not-allowed'
                            }`}
                          >
                            {isCamLoading ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : p.isCameraEnabled ? (
                              <Video className="w-3.5 h-3.5" />
                            ) : (
                              <VideoOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </Tooltip>
                      ) : (
                        <div className={`p-1.5 rounded-md ${p.isCameraEnabled ? 'text-[#C2CCDE]/40' : 'text-red-500 bg-red-500/10'}`}>
                          {p.isCameraEnabled ? (
                            <Video className="w-3.5 h-3.5" />
                          ) : (
                            <VideoOff className="w-3.5 h-3.5" />
                          )}
                        </div>
                      )}
 
                      {/* Ellipsis menu for DMs and Kick (hidden for local user) */}
                      {!isLocal && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdownSid(activeDropdownSid === p.sid ? null : p.sid)}
                            className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-[#C2CCDE]/50 hover:text-white transition-colors cursor-pointer relative"
                          >
                            {isLocalTeacher && p.metadata !== 'teacher' && isStudentLocked ? (
                              <div className="relative flex items-center justify-center">
                                <MoreVertical className="w-4 h-4" />
                                <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-red-500 bg-[#0c101d] rounded-full p-[0.5px]" />
                              </div>
                            ) : (
                              <MoreVertical className="w-4 h-4" />
                            )}
                          </button>
 
                          {activeDropdownSid === p.sid && (
                            <div 
                              ref={dropdownRef}
                              className="absolute right-7 top-1 w-48 bg-[#0c101d]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-1 z-[600] animate-in fade-in slide-in-from-top-1 duration-100 font-sans"
                            >
                              <button
                                onClick={() => handleStartDM(p)}
                                className="w-full text-left px-2.5 py-2 text-xs font-semibold hover:bg-white/5 rounded-lg text-[#C2CCDE] transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Direct Chat
                              </button>
                              {isLocalTeacher && p.metadata !== 'teacher' && (
                                <>
                                  <button
                                    onClick={() => {
                                      onToggleStudentPermission?.(p.identity, 'whiteboard');
                                      setActiveDropdownSid(null);
                                    }}
                                    className="w-full text-left px-2.5 py-2 text-xs font-semibold hover:bg-white/5 rounded-lg text-[#C2CCDE] transition-colors flex items-center justify-between cursor-pointer border-t border-white/5 mt-1"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                                      Whiteboard Edit
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                      allowedWhiteboardStudents[p.identity] 
                                        ? 'bg-emerald-500/15 text-emerald-400' 
                                        : 'bg-zinc-800 text-zinc-500'
                                    }`}>
                                      {allowedWhiteboardStudents[p.identity] ? 'ON' : 'OFF'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      onToggleStudentPermission?.(p.identity, 'screenshare');
                                      setActiveDropdownSid(null);
                                    }}
                                    className="w-full text-left px-2.5 py-2 text-xs font-semibold hover:bg-white/5 rounded-lg text-[#C2CCDE] transition-colors flex items-center justify-between cursor-pointer mt-1"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                                      Screen Share
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                      allowedScreenShareStudents[p.identity] 
                                        ? 'bg-emerald-500/15 text-emerald-400' 
                                        : 'bg-zinc-800 text-zinc-500'
                                    }`}>
                                      {allowedScreenShareStudents[p.identity] ? 'ON' : 'OFF'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleKickParticipant(p)}
                                    disabled={loadingActions[`${p.identity}-kick`]}
                                    className="w-full text-left px-2.5 py-2 text-xs font-semibold hover:bg-red-500/10 rounded-lg text-red-400 transition-colors flex items-center gap-2 cursor-pointer border-t border-white/5 mt-1"
                                  >
                                    <X className="w-3.5 h-3.5 text-red-400" />
                                    Kick Student
                                  </button>
                                </>
                              )}
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
