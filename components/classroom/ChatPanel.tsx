'use client';

import React from 'react';
import { Participant } from 'livekit-client';
import { X, MessageSquare, Users } from 'lucide-react';
import { ChatMessage } from '../VideoRoom';
import ChatTab from './ChatTab';
import ParticipantsTab from './ParticipantsTab';

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
  isMobile?: boolean;
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
  isMobile = false,
}: ChatPanelProps) {

  const handleStartDM = (p: Participant) => {
    const pName = p.name || p.identity;
    setActiveChatTarget({ identity: p.identity, name: pName });
    setActiveTab('chat');
  };

  return (
    <aside
      className={
        isMobile
          ? 'fixed inset-0 w-full h-full z-[999999] bg-[#090d1a]/98 backdrop-blur-2xl flex flex-col'
          : 'fixed inset-0 w-full h-full z-[999999] bg-[#090d1a]/98 backdrop-blur-2xl flex flex-col md:right-0 md:left-auto md:w-80 md:inset-y-0 md:h-full md:border-l md:border-border/30 md:bg-[#090d1a]/95 md:z-50 lg:relative lg:w-80 lg:bg-[#090d1a]/85 lg:backdrop-blur-xl lg:shadow-none lg:z-50'
      }
    >
      {/* Mobile-only Google Meet Header */}
      <div
        className={`${
          isMobile ? 'flex' : 'md:hidden'
        } h-14 border-b border-border/20 flex items-center justify-between px-4 bg-surface/30`}
      >
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
      <div className={`${isMobile ? 'flex' : 'md:hidden'} border-b border-border/10 bg-surface/10`}>
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
      <div
        className={`${
          isMobile ? 'hidden' : 'hidden md:flex'
        } h-16 border-b border-border/30 items-center justify-between px-4 bg-surface/30`}
      >
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
          <ChatTab
            messages={messages}
            onSendMessage={onSendMessage}
            participants={participants}
            localParticipant={localParticipant}
            activeChatTarget={activeChatTarget}
            setActiveChatTarget={setActiveChatTarget}
          />
        ) : (
          <ParticipantsTab
            participants={participants}
            localParticipant={localParticipant}
            roomName={roomName}
            globalWhiteboardAllowed={globalWhiteboardAllowed}
            globalScreenShareAllowed={globalScreenShareAllowed}
            allowedWhiteboardStudents={allowedWhiteboardStudents}
            allowedScreenShareStudents={allowedScreenShareStudents}
            onToggleGlobalPermission={onToggleGlobalPermission}
            onToggleStudentPermission={onToggleStudentPermission}
            onStartDM={handleStartDM}
          />
        )}
      </div>
    </aside>
  );
}
