'use client';

import React from 'react';
import { ParticipantTile, TrackReferenceOrPlaceholder } from '@livekit/components-react';

interface StudentSidebarProps {
  showWhiteboard: boolean;
  maxSidebarPage: number;
  sidebarPage: number;
  handlePrevSidebarPage: () => void;
  handleNextSidebarPage: () => void;
  teacherTrack: TrackReferenceOrPlaceholder | undefined;
  pageSidebarStudents: TrackReferenceOrPlaceholder[];
}

export default function StudentSidebar({
  showWhiteboard,
  maxSidebarPage,
  sidebarPage,
  handlePrevSidebarPage,
  handleNextSidebarPage,
  teacherTrack,
  pageSidebarStudents,
}: StudentSidebarProps) {
  return (
    <aside className="w-80 border-l border-b border-border/30 bg-[#090d1a]/85 backdrop-blur-xl flex flex-col h-[calc(100vh)] rounded-b-2xl z-20">
      <div className="h-16 px-5 border-b border-border/30 flex justify-between items-center bg-surface/30 select-none">
        <h3 className="font-semibold text-sm text-white/90">
          {showWhiteboard ? 'Meeting View' : 'Participants'}
        </h3>
        {maxSidebarPage > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevSidebarPage}
              disabled={sidebarPage === 0}
              className="w-6 h-6 rounded-md border border-border/40 hover:bg-border/30 flex items-center justify-center text-[#C2CCDE] text-xs cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              &lt;
            </button>
            <button
              onClick={handleNextSidebarPage}
              disabled={sidebarPage === maxSidebarPage}
              className="w-6 h-6 rounded-md border border-border/40 hover:bg-border/30 flex items-center justify-center text-[#C2CCDE] text-xs cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              &gt;
            </button>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Slot 1: Fixed Teacher Tile */}
        <div className="aspect-video relative rounded-xl overflow-hidden border border-white/5 bg-surface-light/10 shadow-md group">
          {teacherTrack ? (
            <ParticipantTile trackRef={teacherTrack} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-foreground/30 text-xs font-semibold">
              No Teacher Camera
            </div>
          )}
        </div>

        {/* Slots 2, 3, 4: Paginated Students */}
        {pageSidebarStudents.map(trackRef => (
          <div 
            key={trackRef.participant.sid} 
            className="aspect-video relative rounded-xl overflow-hidden border border-white/5 bg-surface-light/10 shadow-md group"
          >
            <ParticipantTile trackRef={trackRef} className="w-full h-full" />
          </div>
        ))}
      </div>
    </aside>
  );
}
