'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ParticipantTile, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { Pin, Megaphone, MicOff, Users } from 'lucide-react';

interface GridViewProps {
  isTeacher: boolean;
  activeStudentTrack: TrackReferenceOrPlaceholder | null;
  teacherTrack: TrackReferenceOrPlaceholder | undefined;
  remoteStudents: TrackReferenceOrPlaceholder[];
  gridStudents: TrackReferenceOrPlaceholder[];
  cameraTracksCount: number;
  layoutMode: 'auto' | 'tiled' | 'spotlight' | 'sidebar';
  pinnedTrackSid: string | null;
  setPinnedTrackSid: (sid: string | null) => void;
  spotlightTrackSid: string | null;
  setSpotlightTrackSid: (sid: string | null) => void;
  onBroadcastSpotlight?: (sid: string | null) => void;
  localTrack: TrackReferenceOrPlaceholder | undefined;
}

// Custom ResizeObserver hook to measure container dimensions
function useContainerDimensions(ref: React.RefObject<HTMLDivElement | null>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return dimensions;
}

// Optimal layout fitting calculation (Google Meet style)
function calculateOptimalLayout(
  containerWidth: number,
  containerHeight: number,
  tileCount: number,
  aspectRatio: number = 16 / 9
) {
  let bestWidth = 0;
  let bestHeight = 0;
  let bestCols = 1;
  let bestRows = 1;
  let maxArea = 0;

  if (containerWidth <= 0 || containerHeight <= 0 || tileCount <= 0) {
    return { tileWidth: 0, tileHeight: 0, cols: 1, rows: 1 };
  }

  const gap = 16; // gap-4 (16px)

  for (let cols = 1; cols <= tileCount; cols++) {
    const rows = Math.ceil(tileCount / cols);

    const availableWidth = containerWidth - (cols - 1) * gap - 24;
    const availableHeight = containerHeight - (rows - 1) * gap - 24;

    const w = availableWidth / cols;
    const h = availableHeight / rows;

    if (w <= 0 || h <= 0) continue;

    let tileW = w;
    let tileH = h;

    if (w / h > aspectRatio) {
      tileW = h * aspectRatio;
      tileH = h;
    } else {
      tileW = w;
      tileH = w / aspectRatio;
    }

    const area = tileW * tileH * tileCount;
    if (area > maxArea) {
      maxArea = area;
      bestWidth = tileW;
      bestHeight = tileH;
      bestCols = cols;
      bestRows = rows;
    }
  }

  return {
    tileWidth: Math.floor(bestWidth),
    tileHeight: Math.floor(bestHeight),
    cols: bestCols,
    rows: bestRows,
  };
}

// Custom Premium Video Tile
function CustomVideoTile({
  trackRef,
  isPinned,
  onPin,
  isSpotlighted,
  onSpotlight,
  showSpotlightBtn,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  isPinned: boolean;
  onPin: () => void;
  isSpotlighted: boolean;
  onSpotlight?: () => void;
  showSpotlightBtn: boolean;
}) {
  const name = trackRef.participant.name || trackRef.participant.identity;
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isSpeaking = trackRef.participant.isSpeaking;
  const isMuted = !trackRef.participant.isMicrophoneEnabled;
  const isCameraEnabled = trackRef.participant.isCameraEnabled;

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden border transition-all duration-300 group flex items-center justify-center bg-[#0d1220] ${
        isSpeaking
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
          : 'border-white/5 hover:border-white/15'
      }`}
    >
      {/* 1. Video Stream or Gradient Placeholder */}
      {isCameraEnabled ? (
        <ParticipantTile trackRef={trackRef} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[#0d111d] flex items-center justify-center select-none p-6 text-center">
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white/90 tracking-wide font-sans">
            {name}
          </span>
        </div>
      )}

      {/* 2. Glassmorphic bottom label */}
      {(isCameraEnabled || trackRef.participant.isLocal || isMuted || isSpeaking) && (
        <div className="absolute bottom-3 left-3 bg-[#090d1a]/60 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-2 select-none z-10">
          {isCameraEnabled ? (
            <span className="text-xs font-semibold text-white/95 truncate max-w-[120px]">
              {name} {trackRef.participant.isLocal && ' (You)'}
            </span>
          ) : (
            trackRef.participant.isLocal && (
              <span className="text-xs font-semibold text-white/95 truncate max-w-[120px]">
                (You)
              </span>
            )
          )}
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-red-400" />
          ) : (
            isSpeaking && (
              <div className="flex items-end gap-0.5 h-3 w-3">
                <span className="w-0.5 bg-emerald-400 animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                <span className="w-0.5 bg-emerald-400 animate-bounce h-3" style={{ animationDelay: '0.2s' }} />
                <span className="w-0.5 bg-emerald-400 animate-bounce h-1.5" style={{ animationDelay: '0s' }} />
              </div>
            )
          )}
        </div>
      )}

      {/* 3. Hover Overlay Actions */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
            isPinned
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-[#111827]/80 border-white/10 text-white/80 hover:text-white hover:bg-white/10'
          }`}
          title={isPinned ? 'Unpin tile' : 'Pin tile'}
        >
          <Pin className="w-4 h-4" />
        </button>

        {showSpotlightBtn && onSpotlight && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSpotlight();
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              isSpotlighted
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-[#111827]/80 border-white/10 text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title={isSpotlighted ? 'Cancel spotlight' : 'Spotlight for everyone'}
          >
            <Megaphone className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. Active Spotlight Badge */}
      {isSpotlighted && (
        <div className="absolute top-3 left-3 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider select-none z-10 flex items-center gap-1.5">
          <Megaphone className="w-3 h-3 animate-pulse" />
          Spotlighted
        </div>
      )}

      {/* 5. Pinned Badge */}
      {isPinned && (
        <div className="absolute top-3 right-3 bg-indigo-500/25 backdrop-blur-md border border-indigo-500/35 text-indigo-300 rounded-xl p-1.5 select-none z-10 flex items-center justify-center">
          <Pin className="w-3.5 h-3.5 fill-current" />
        </div>
      )}
    </div>
  );
}

export default function GridView({
  isTeacher,
  activeStudentTrack,
  teacherTrack,
  remoteStudents,
  gridStudents,
  cameraTracksCount,
  layoutMode,
  pinnedTrackSid,
  setPinnedTrackSid,
  spotlightTrackSid,
  setSpotlightTrackSid,
  onBroadcastSpotlight,
  localTrack,
}: GridViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(containerRef);

  // Compile list of tiles depending on layout modes
  const allParticipants = useMemo(() => {
    const list = [teacherTrack, ...remoteStudents].filter((t): t is NonNullable<typeof t> => !!t);
    if (localTrack && !list.some(t => t.participant.sid === localTrack.participant.sid)) {
      list.push(localTrack);
    }
    return list;
  }, [teacherTrack, remoteStudents, localTrack]);

  // Determine active featured tile (pinned locally, spotlighted globally, speaker focus, or teacher)
  const featuredTrack = useMemo(() => {
    // 1. Pinned locally
    if (pinnedTrackSid) {
      const found = allParticipants.find((t) => t.participant.sid === pinnedTrackSid);
      if (found) return found;
    }
    // 2. Spotlighted globally
    if (spotlightTrackSid) {
      const found = allParticipants.find((t) => t.participant.sid === spotlightTrackSid);
      if (found) return found;
    }
    // 3. Fallback depending on role
    return isTeacher ? activeStudentTrack : teacherTrack;
  }, [allParticipants, pinnedTrackSid, spotlightTrackSid, isTeacher, activeStudentTrack, teacherTrack]);

  // Handler for toggle pin
  const handleTogglePin = (sid: string) => {
    if (pinnedTrackSid === sid) {
      setPinnedTrackSid(null);
    } else {
      setPinnedTrackSid(sid);
    }
  };

  // Handler for toggle spotlight
  const handleToggleSpotlight = (sid: string) => {
    if (spotlightTrackSid === sid) {
      setSpotlightTrackSid(null);
      if (onBroadcastSpotlight) onBroadcastSpotlight(null);
    } else {
      setSpotlightTrackSid(sid);
      if (onBroadcastSpotlight) onBroadcastSpotlight(sid);
    }
  };

  // Check if spotlight mode or single participant spotlight
  const currentViewMode = useMemo(() => {
    if (layoutMode === 'spotlight') return 'spotlight';
    if (layoutMode === 'tiled') return 'tiled';
    if (layoutMode === 'sidebar') return 'sidebar';
    // 'auto' mode default switches: Tiled if no presentation, Sidebar if active content exists
    return 'tiled'; 
  }, [layoutMode]);

  // Grid sizing parameters for Tiled view
  const tiledLayout = useMemo(() => {
    return calculateOptimalLayout(width, height, allParticipants.length);
  }, [width, height, allParticipants.length]);

  if (cameraTracksCount === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <div className="text-center space-y-3 select-none">
          <svg className="w-12 h-12 mx-auto text-white/20 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <p className="text-sm text-foreground/30 font-medium">Connecting you to the room...</p>
        </div>
      </div>
    );
  }

  // 1. Spotlight Mode
  if (currentViewMode === 'spotlight') {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4">
        {featuredTrack ? (
          <div className="w-full h-full max-w-5xl aspect-video relative">
            <CustomVideoTile
              trackRef={featuredTrack}
              isPinned={pinnedTrackSid === featuredTrack.participant.sid}
              onPin={() => handleTogglePin(featuredTrack.participant.sid)}
              isSpotlighted={spotlightTrackSid === featuredTrack.participant.sid}
              onSpotlight={() => handleToggleSpotlight(featuredTrack.participant.sid)}
              showSpotlightBtn={isTeacher}
            />
          </div>
        ) : (
          <div className="text-center text-[#C2CCDE]/30">No target for spotlight</div>
        )}
      </div>
    );
  }

  // 2. Tiled Mode (fluid Google Meet style grid)
  if (currentViewMode === 'tiled') {
    return (
      <div 
        ref={containerRef} 
        className="w-full h-full flex items-center justify-center p-4 min-h-0 min-w-0 overflow-hidden"
      >
        <div 
          className="grid gap-4 items-center justify-center transition-all duration-300"
          style={{
            gridTemplateColumns: `repeat(${tiledLayout.cols}, minmax(0, 1fr))`,
            width: tiledLayout.cols * tiledLayout.tileWidth + (tiledLayout.cols - 1) * 16,
            height: tiledLayout.rows * tiledLayout.tileHeight + (tiledLayout.rows - 1) * 16,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {allParticipants.map((trackRef) => (
            <div 
              key={trackRef.participant.sid}
              style={{
                width: tiledLayout.tileWidth,
                height: tiledLayout.tileHeight,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            >
              <CustomVideoTile
                trackRef={trackRef}
                isPinned={pinnedTrackSid === trackRef.participant.sid}
                onPin={() => handleTogglePin(trackRef.participant.sid)}
                isSpotlighted={spotlightTrackSid === trackRef.participant.sid}
                onSpotlight={() => handleToggleSpotlight(trackRef.participant.sid)}
                showSpotlightBtn={isTeacher}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Sidebar Mode (Split Screen) - Stacks on narrow screens
  return (
    <div ref={containerRef} className="w-full h-full flex flex-col md:flex-row gap-6 p-4 md:p-6 overflow-y-auto md:overflow-hidden min-h-0">
      
      {/* Featured Stage (Left on desktop, Top on mobile) */}
      <div className="w-full aspect-video md:flex-1 shrink-0 min-w-0 min-h-0 flex items-center justify-center relative md:h-full">
        {featuredTrack ? (
          <div className="w-full h-full aspect-video max-h-full">
            <CustomVideoTile
              trackRef={featuredTrack}
              isPinned={pinnedTrackSid === featuredTrack.participant.sid}
              onPin={() => handleTogglePin(featuredTrack.participant.sid)}
              isSpotlighted={spotlightTrackSid === featuredTrack.participant.sid}
              onSpotlight={() => handleToggleSpotlight(featuredTrack.participant.sid)}
              showSpotlightBtn={isTeacher}
            />
          </div>
        ) : (
          <div className="w-full aspect-video flex flex-col items-center justify-center bg-surface border border-white/5 rounded-2xl text-foreground/30 font-medium">
            <Users className="w-12 h-12 text-white/20 mb-3" />
            <span>{isTeacher ? 'Waiting for students...' : 'Connecting to teacher...'}</span>
          </div>
        )}
      </div>

      {/* Grid of Other Students (Right scrollable column on desktop, Bottom grid on mobile) */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 h-auto md:h-full min-w-0 min-h-0 flex flex-col relative justify-start">
        {gridStudents.length === 0 ? (
          <div className="text-center text-foreground/30 text-sm font-medium py-10">
            No other participants active
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto w-full pr-1 gap-4 grid grid-cols-2 md:flex md:flex-col max-h-[35vh] md:max-h-full scrollbar-thin">
            {gridStudents.map((trackRef) => (
              <div 
                key={trackRef.participant.sid}
                className="w-full aspect-video shrink-0 relative"
              >
                <CustomVideoTile
                  trackRef={trackRef}
                  isPinned={pinnedTrackSid === trackRef.participant.sid}
                  onPin={() => handleTogglePin(trackRef.participant.sid)}
                  isSpotlighted={spotlightTrackSid === trackRef.participant.sid}
                  onSpotlight={() => handleToggleSpotlight(trackRef.participant.sid)}
                  showSpotlightBtn={isTeacher}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
