import React from 'react';
import { Participant } from 'livekit-client';
import { X, MessageSquare, Users, HelpCircle, Sparkles } from 'lucide-react';
import { ChatMessage } from '../VideoRoom';
import ChatTab from './ChatTab';
import ParticipantsTab from './ParticipantsTab';
import DoubtSolverTab from './DoubtSolverTab';
import ClassSummaryTab from './ClassSummaryTab';

interface ChatPanelProps {
  activeTab: 'chat' | 'participants' | 'doubt' | 'summary';
  setActiveTab: (tab: 'chat' | 'participants' | 'doubt' | 'summary' | null) => void;
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
  isTeacher: boolean;
  editor: any; // Tldraw editor reference
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
  isTeacher,
  editor,
}: ChatPanelProps) {

  const handleStartDM = (p: Participant) => {
    const pName = p.name || p.identity;
    setActiveChatTarget({ identity: p.identity, name: pName });
    setActiveTab('chat');
  };

  const getMobileTitle = () => {
    switch (activeTab) {
      case 'chat': return 'In-call messages';
      case 'participants': return `People (${participants.length})`;
      case 'doubt': return isTeacher ? 'Student Doubts Feed' : 'AI Doubt Solver';
      case 'summary': return 'Class Summary';
      default: return '';
    }
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
            {getMobileTitle()}
          </span>
        </div>
      </div>

      {/* Mobile-only Tab Selector Bar */}
      <div className={`${isMobile ? 'flex' : 'md:hidden'} border-b border-border/10 bg-surface/10 overflow-x-auto scrollbar-none`}>
        <button
          onClick={() => setActiveTab('chat')}
          type="button"
          className={`flex-1 min-w-[70px] py-3.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'border-primary text-white bg-white/[0.02]'
              : 'border-transparent text-[#C2CCDE] hover:text-white'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          type="button"
          className={`flex-1 min-w-[70px] py-3.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'participants'
              ? 'border-primary text-white bg-white/[0.02]'
              : 'border-transparent text-[#C2CCDE] hover:text-white'
          }`}
        >
          People
        </button>
        <button
          onClick={() => setActiveTab('doubt')}
          type="button"
          className={`flex-1 min-w-[70px] py-3.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'doubt'
              ? 'border-primary text-white bg-white/[0.02]'
              : 'border-transparent text-[#C2CCDE] hover:text-white'
          }`}
        >
          {isTeacher ? 'Doubts' : 'Ask AI'}
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          type="button"
          className={`flex-1 min-w-[70px] py-3.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'border-primary text-white bg-white/[0.02]'
              : 'border-transparent text-[#C2CCDE] hover:text-white'
          }`}
        >
          Summary
        </button>
      </div>

      {/* Desktop/Tablet Header */}
      <div
        className={`${
          isMobile ? 'hidden' : 'hidden md:flex'
        } h-16 border-b border-border/30 items-center justify-between px-3 bg-surface/30`}
      >
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setActiveTab('chat')}
            type="button"
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'chat'
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-[#C2CCDE]/60 hover:text-[#C2CCDE] hover:bg-white/5'
            }`}
            title="Chat Messages"
          >
            <MessageSquare className="w-3 h-3" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            type="button"
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'participants'
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-[#C2CCDE]/60 hover:text-[#C2CCDE] hover:bg-white/5'
            }`}
            title="Class Participants"
          >
            <Users className="w-3 h-3" />
            People
          </button>
          <button
            onClick={() => setActiveTab('doubt')}
            type="button"
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'doubt'
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-[#C2CCDE]/60 hover:text-[#C2CCDE] hover:bg-white/5'
            }`}
            title="Ask AI Doubt Solver"
          >
            <HelpCircle className="w-3 h-3" />
            {isTeacher ? 'Doubts' : 'Ask AI'}
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            type="button"
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'summary'
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-[#C2CCDE]/60 hover:text-[#C2CCDE] hover:bg-white/5'
            }`}
            title="Rolling Class Summary"
          >
            <Sparkles className="w-3 h-3" />
            Summary
          </button>
        </div>

        <button
          onClick={() => setActiveTab(null)}
          type="button"
          className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-[#C2CCDE]/60 hover:text-white transition-colors cursor-pointer shrink-0 ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'chat' && (
          <ChatTab
            messages={messages}
            onSendMessage={onSendMessage}
            participants={participants}
            localParticipant={localParticipant}
            activeChatTarget={activeChatTarget}
            setActiveChatTarget={setActiveChatTarget}
          />
        )}
        {activeTab === 'participants' && (
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
        {activeTab === 'doubt' && (
          <DoubtSolverTab
            sessionId={roomName}
            isTeacher={isTeacher}
            editor={editor}
          />
        )}
        {activeTab === 'summary' && (
          <ClassSummaryTab
            sessionId={roomName}
            isTeacher={isTeacher}
          />
        )}
      </div>
    </aside>
  );
}
