'use client';

import React from 'react';
import { ParticipantTile, TrackReferenceOrPlaceholder } from '@livekit/components-react';

interface GridViewProps {
  isTeacher: boolean;
  activeStudentTrack: TrackReferenceOrPlaceholder | null;
  teacherTrack: TrackReferenceOrPlaceholder | undefined;
  remoteStudents: TrackReferenceOrPlaceholder[];
  gridStudents: TrackReferenceOrPlaceholder[];
  maxGridPage: number;
  studentGridPage: number;
  handlePrevGridPage: () => void;
  handleNextGridPage: () => void;
  cameraTracksCount: number;
}

export default function GridView({
  isTeacher,
  activeStudentTrack,
  teacherTrack,
  remoteStudents,
  gridStudents,
  maxGridPage,
  studentGridPage,
  handlePrevGridPage,
  handleNextGridPage,
  cameraTracksCount,
}: GridViewProps) {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      {cameraTracksCount === 0 ? (
        <div className="text-center space-y-3 select-none">
          <svg className="w-12 h-12 mx-auto text-white/20 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <p className="text-sm text-foreground/30 font-medium">Connecting you to the room...</p>
        </div>
      ) : (
        <div className="flex gap-6 w-full h-full items-center justify-center p-6 max-w-7xl mx-auto overflow-hidden min-h-0">
          
          {/* Left Side: Featured Tile Container */}
          <div className="flex-1 h-full min-w-0 min-h-0 flex items-center justify-center relative">
            {(() => {
              const featuredTrack = isTeacher ? activeStudentTrack : teacherTrack;
              if (featuredTrack) {
                return (
                  <div className="w-full max-h-full aspect-video rounded-xl overflow-hidden border border-white/5 bg-surface/50 relative flex items-center justify-center">
                    <ParticipantTile trackRef={featuredTrack} className="w-full h-full" />
                  </div>
                );
              }
              return (
                <div className="w-full max-h-full aspect-video flex flex-col items-center justify-center bg-surface border border-white/5 rounded-xl text-foreground/30 font-medium">
                  <svg className="w-12 h-12 text-white/20 animate-pulse mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span>{isTeacher ? "Waiting for students to join..." : "Connecting to teacher..."}</span>
                </div>
              );
            })()}
          </div>

          {/* Right Side: Dynamic Student Grid Container */}
          <div className="flex-1 h-full min-w-0 min-h-0 flex flex-col justify-center relative">
            
            {/* Pagination label and arrows */}
            {maxGridPage > 0 && (
              <div className="flex justify-between items-center mb-2 px-1 select-none h-6">
                <span className="text-xs font-semibold text-[#C2CCDE]">
                  Active Students ({remoteStudents.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevGridPage}
                    disabled={studentGridPage === 0}
                    className="w-6 h-6 rounded-md border border-border/40 hover:bg-border/30 flex items-center justify-center text-[#C2CCDE] cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={handleNextGridPage}
                    disabled={studentGridPage === maxGridPage}
                    className="w-6 h-6 rounded-md border border-border/40 hover:bg-border/30 flex items-center justify-center text-[#C2CCDE] cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}

            {/* Grid Container */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center">
              {gridStudents.length === 0 ? (
                <div className="text-center text-foreground/30 text-sm font-medium">
                  No students active
                </div>
              ) : (
                <div className={`grid gap-4 w-full max-h-full aspect-video items-center justify-center ${
                  gridStudents.length === 1 ? 'grid-cols-1 grid-rows-1' : 'grid-cols-2 grid-rows-2'
                }`}>
                  {gridStudents.map(trackRef => (
                    <div key={trackRef.participant.sid} className="w-full h-full relative aspect-video max-h-full flex items-center justify-center">
                      <ParticipantTile trackRef={trackRef} className="w-full h-full" />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
