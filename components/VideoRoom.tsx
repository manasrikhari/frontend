'use client';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useConnectionState,
  useRoomContext,
} from '@livekit/components-react';
import { Track, Room, RoomOptions, RoomConnectOptions } from 'livekit-client';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import WhiteboardWrapper from './WhiteboardWrapper';
import type { IceServer } from '@/lib/api';

import Header from './classroom/Header';
import Controls from './classroom/Controls';
import FloatingTeacherTile from './classroom/FloatingTeacherTile';
import StudentSidebar from './classroom/StudentSidebar';
import GridView from './classroom/GridView';

interface VideoRoomProps {
  token: string;
  roomName: string;
  serverUrl: string;
  userName?: string;
  iceServers?: IceServer[];
  onDisconnected?: () => void;
  sessionToken?: string;
  studentToken?: string;
}

interface RoomContentProps {
  roomName: string;
  userName?: string;
  onLeave: () => void;
  studentToken?: string;
}

function RoomContent({ roomName, userName, onLeave, studentToken }: RoomContentProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const isTeacher = localParticipant?.metadata === 'teacher';

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [studentGridPage, setStudentGridPage] = useState(0);
  const [sidebarPage, setSidebarPage] = useState(0);
  const [lastActiveStudentSid, setLastActiveStudentSid] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [editor, setEditor] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedPdfUrl, setExportedPdfUrl] = useState<string | null>(null);

  const handleEditorMount = useCallback((editorInstance: any) => {
    setEditor(editorInstance);
  }, []);

  const handleEndClass = async () => {
    if (!editor) {
      alert('Whiteboard is not ready yet.');
      return;
    }
    
    const confirmEnd = confirm('Are you sure you want to end the class and export the notes?');
    if (!confirmEnd) return;

    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');

      // Get all pages
      const pages = editor.getPages();
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      let addedPageCount = 0;
      const originalPageId = editor.getCurrentPageId();

      for (const page of pages) {
        editor.setCurrentPage(page.id);
        const shapeIds = Array.from(editor.getCurrentPageShapeIds());
        if (shapeIds.length === 0) continue;

        // Export shapeIds as JPEG blob with compression and explicit scale limit
        const { blob, width, height } = await editor.toImage(shapeIds, {
          format: 'jpeg',
          background: true,
          quality: 0.75,
          scale: 1.5,
        });
        
        // Convert blob to DataURL
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const pdfWidth = 297;
        const pdfHeight = 210;
        const imgRatio = width / height;
        const pdfRatio = pdfWidth / pdfHeight;

        let printWidth = pdfWidth;
        let printHeight = pdfHeight;
        let x = 0;
        let y = 0;

        if (imgRatio > pdfRatio) {
          printHeight = pdfWidth / imgRatio;
          y = (pdfHeight - printHeight) / 2;
        } else {
          printWidth = pdfHeight * imgRatio;
          x = (pdfWidth - printWidth) / 2;
        }

        if (addedPageCount > 0) {
          pdf.addPage('a4', 'landscape');
        }
        pdf.addImage(dataUrl, 'JPEG', x, y, printWidth, printHeight, undefined, 'FAST');
        addedPageCount++;
      }

      // Restore original page view
      editor.setCurrentPage(originalPageId);

      if (addedPageCount === 0) {
        alert('Cannot export an empty whiteboard.');
        setIsExporting(false);
        return;
      }

      const pdfBlob = pdf.output('blob');

      // Upload to Worker R2 bucket
      const SYNC_WORKER_URL = process.env.NEXT_PUBLIC_SYNC_WORKER_URL || 'http://localhost:8787';
      const uploadUrl = `${SYNC_WORKER_URL}/api/pdf/${roomName}`;

      console.log('Uploading PDF to:', uploadUrl);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: pdfBlob,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Upload failed with status ${res.status}: ${errorText}`);
      }
      
      const downloadUrl = `${SYNC_WORKER_URL}/api/pdf/${roomName}`;
      setExportedPdfUrl(downloadUrl);

      // Broadcast notes exported notification to students
      if (localParticipant) {
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify({ type: 'NOTES_EXPORTED' }));
          await localParticipant.publishData(data, { reliable: true });
        } catch (broadcastErr) {
          console.error('Failed to broadcast NOTES_EXPORTED:', broadcastErr);
        }
      }

      alert('Class ended! Whiteboard notes exported and uploaded successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to end class and export PDF. R2 bucket might not be enabled or sync worker is offline.');
    } finally {
      setIsExporting(false);
    }
  };

  // Query all active camera feeds and screen shares
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenShareTrackRef = tracks.find(t => t.source === Track.Source.ScreenShare);
  const hasScreenShare = !!screenShareTrackRef;
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);

  // Whiteboard or Screen Share triggers the Split Layout (Main pane + right sidebar)
  const showSplitLayout = showWhiteboard || hasScreenShare;

  const handleCopyLink = useCallback(() => {
    // Generate the join URL using the window host and student session token
    const inviteUrl = `${window.location.origin}/room/${encodeURIComponent(roomName)}?sessionToken=${encodeURIComponent(studentToken || '')}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [roomName, studentToken]);

  const toggleMicrophone = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCamera = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    }
  }, [localParticipant, isCameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (localParticipant) {
      try {
        // Optimize publishing options for screen sharing legible text:
        // Set 1080p, 15fps framerate limit, and text optimization hint
        await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
          audio: true,
          contentHint: 'text',
          resolution: { width: 1920, height: 1080, frameRate: 15 },
        }, {
          simulcast: true,
          screenShareEncoding: {
            maxFramerate: 15,
            maxBitrate: 1500000,
          }
        });
      } catch (err) {
        console.error('Failed to toggle screen share:', err);
      }
    }
  }, [localParticipant, isScreenShareEnabled]);

  // Whiteboard Toggle that broadcasts state to all participants
  const toggleWhiteboard = useCallback(async () => {
    const nextState = !showWhiteboard;
    setShowWhiteboard(nextState);
    if (isTeacher && localParticipant) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify({ type: 'SET_WHITEBOARD', active: nextState }));
        await localParticipant.publishData(data, { reliable: true });
      } catch (err) {
        console.error('Failed to broadcast whiteboard state:', err);
      }
    }
  }, [showWhiteboard, isTeacher, localParticipant]);

  // Listen for whiteboard state broadcasts and note exports
  useEffect(() => {
    if (!room) return;
    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const msg = JSON.parse(decoder.decode(payload));
        if (msg.type === 'SET_WHITEBOARD') {
          setShowWhiteboard(msg.active);
        } else if (msg.type === 'QUERY_WHITEBOARD_STATE') {
          if (isTeacher && localParticipant) {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify({ type: 'SET_WHITEBOARD', active: showWhiteboard }));
            localParticipant.publishData(data, { reliable: true }).catch(err => {
              console.error('Failed to reply to whiteboard query:', err);
            });
          }
        } else if (msg.type === 'NOTES_EXPORTED') {
          const SYNC_WORKER_URL = process.env.NEXT_PUBLIC_SYNC_WORKER_URL || 'http://localhost:8787';
          setExportedPdfUrl(`${SYNC_WORKER_URL}/api/pdf/${roomName}`);
        }
      } catch (err) {
        console.error('Failed to parse data channel message:', err);
      }
    };
    room.on('dataReceived', handleDataReceived);
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, isTeacher, showWhiteboard, localParticipant, roomName]);

  // Query whiteboard state when joining
  useEffect(() => {
    if (!room || isTeacher || !localParticipant) return;
    const timer = setTimeout(() => {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: 'QUERY_WHITEBOARD_STATE' }));
      localParticipant.publishData(data, { reliable: true }).catch(err => {
        console.error('Failed to query whiteboard state:', err);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [room, isTeacher, localParticipant]);

  // Extract separate camera track categories
  const remoteStudents = useMemo(() => {
    return cameraTracks.filter(t => 
      t.participant.metadata !== 'teacher' && 
      t.participant.sid !== localParticipant?.sid
    );
  }, [cameraTracks, localParticipant]);

  const teacherTrack = useMemo(() => {
    return cameraTracks.find(t => t.participant.metadata === 'teacher');
  }, [cameraTracks]);

  const localTrack = useMemo(() => {
    return cameraTracks.find(t => t.participant.sid === localParticipant?.sid);
  }, [cameraTracks, localParticipant]);

  const activeStudentTrack = useMemo(() => {
    if (remoteStudents.length === 0) return null;
    const active = remoteStudents.find(t => t.participant.sid === lastActiveStudentSid);
    return active || remoteStudents[0];
  }, [remoteStudents, lastActiveStudentSid]);

  // Sorted list of remote student camera tracks
  const [orderedRemoteStudents, setOrderedRemoteStudents] = useState<typeof remoteStudents>([]);
  // Keep track of the last spoke timestamps for the remote student queue
  const lastSpokeRef = useRef<Record<string, number>>({});

  // Synchronize orderedRemoteStudents queue when participants join/leave or change camera states
  useEffect(() => {
    setOrderedRemoteStudents(prev => {
      const filtered = prev
        .map(p => remoteStudents.find(r => r.participant.sid === p.participant.sid))
        .filter((t): t is NonNullable<typeof t> => !!t);
      const added = remoteStudents.filter(r => !filtered.some(f => f.participant.sid === r.participant.sid));
      const nextQueue = [...filtered, ...added];
      
      // Prevent infinite loops by returning prev if tracks and participants are identical
      const isIdentical = prev.length === nextQueue.length && 
                          prev.every((t, i) => {
                            const nextItem = nextQueue[i];
                            return t.participant === nextItem.participant &&
                                   t.source === nextItem.source &&
                                   t.publication === nextItem.publication;
                          });
      
      if (isIdentical) {
        return prev;
      }
      return nextQueue;
    });
  }, [remoteStudents]);

  // Track active speaker student with queue swap logic
  useEffect(() => {
    if (!room) return;

    const handleActiveSpeakers = (speakers: any[]) => {
      // Find remote student speakers
      const studentSpeakers = speakers.filter(s => 
        s.metadata === 'student' && 
        s.sid !== localParticipant?.sid
      );
      
      if (studentSpeakers.length === 0) return;

      // Update timestamps
      const now = Date.now();
      studentSpeakers.forEach(s => {
        lastSpokeRef.current[s.sid] = now;
      });

      // Update teacher's large featured tile last active speaker student
      const activeSpeaker = studentSpeakers[0];
      setLastActiveStudentSid(activeSpeaker.sid);

      // Perform queue swapping to keep speaking students visible
      setOrderedRemoteStudents(prev => {
        if (prev.length === 0) return prev;

        const visibleLimit = showSplitLayout ? 2 : 3;
        
        // Find if this speaker is in the top visible slots
        const visibleIndex = prev.findIndex(t => t.participant.sid === activeSpeaker.sid);
        
        // If speaker is not in top slots, swap them in
        if (visibleIndex >= visibleLimit || visibleIndex === -1) {
          const newQueue = [...prev];
          const sIndex = prev.findIndex(t => t.participant.sid === activeSpeaker.sid);
          if (sIndex === -1) return prev; // No camera track for this speaker

          // Find the visible slot (0 to visibleLimit-1) that spoke least recently
          let oldestIndex = 0;
          let oldestTime = lastSpokeRef.current[prev[0]?.participant.sid] || 0;
          
          const limit = Math.min(prev.length, visibleLimit);
          for (let i = 1; i < limit; i++) {
            const sid = prev[i].participant.sid;
            const time = lastSpokeRef.current[sid] || 0;
            if (time < oldestTime) {
              oldestTime = time;
              oldestIndex = i;
            }
          }
          
          // Swap the oldest visible student with the speaking student
          const temp = newQueue[oldestIndex];
          newQueue[oldestIndex] = newQueue[sIndex];
          newQueue[sIndex] = temp;
          
          return newQueue;
        }
        
        return prev;
      });
    };

    room.on('activeSpeakersChanged', handleActiveSpeakers);
    return () => {
      room.off('activeSpeakersChanged', handleActiveSpeakers);
    };
  }, [room, localParticipant, showSplitLayout]);

  // Check R2 bucket periodically for exported notes PDF
  useEffect(() => {
    let active = true;
    const checkPdf = async () => {
      try {
        const SYNC_WORKER_URL = process.env.NEXT_PUBLIC_SYNC_WORKER_URL || 'http://localhost:8787';
        const res = await fetch(`${SYNC_WORKER_URL}/api/pdf/${roomName}`, { method: 'HEAD' });
        if (res.ok && active) {
          setExportedPdfUrl(`${SYNC_WORKER_URL}/api/pdf/${roomName}`);
        }
      } catch (err) {
        // ignore
      }
    };
    checkPdf();
    const interval = setInterval(checkPdf, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomName]);

  // Grid View student list (uses orderedRemoteStudents)
  const gridStudents = useMemo(() => {
    if (isTeacher) {
      const gridRemoteStudents = orderedRemoteStudents.filter(t => t.participant.sid !== activeStudentTrack?.participant.sid);
      const start = studentGridPage * 3;
      const pageRemotes = gridRemoteStudents.slice(start, start + 3);
      return [...pageRemotes, localTrack].filter((t): t is NonNullable<typeof t> => !!t);
    } else {
      const start = studentGridPage * 3;
      const pageRemotes = orderedRemoteStudents.slice(start, start + 3);
      return [...pageRemotes, localTrack].filter((t): t is NonNullable<typeof t> => !!t);
    }
  }, [isTeacher, orderedRemoteStudents, activeStudentTrack, studentGridPage, localTrack]);

  // Sidebar student list (Split View - uses orderedRemoteStudents and places localTrack at Slot 4 / index 2)
  const sidebarStudents = useMemo(() => {
    if (isTeacher) {
      return orderedRemoteStudents;
    } else {
      const list = [...orderedRemoteStudents];
      const filteredList = list.filter(t => t.participant.sid !== localParticipant?.sid);
      if (localTrack) {
        filteredList.splice(2, 0, localTrack);
      }
      return filteredList.filter((t): t is NonNullable<typeof t> => !!t);
    }
  }, [isTeacher, orderedRemoteStudents, localTrack, localParticipant?.sid]);

  const pageSidebarStudents = useMemo(() => {
    const start = sidebarPage * 3;
    return sidebarStudents.slice(start, start + 3);
  }, [sidebarStudents, sidebarPage]);

  // Max pages for dynamic pagination bound checks
  const maxGridPage = useMemo(() => {
    const gridRemoteCount = isTeacher 
      ? remoteStudents.filter(t => t.participant.sid !== activeStudentTrack?.participant.sid).length
      : remoteStudents.length;
    return Math.max(0, Math.ceil(gridRemoteCount / 3) - 1);
  }, [remoteStudents, isTeacher, activeStudentTrack]);

  const maxSidebarPage = useMemo(() => {
    return Math.max(0, Math.ceil(sidebarStudents.length / 3) - 1);
  }, [sidebarStudents]);

  const handlePrevGridPage = useCallback(() => {
    setStudentGridPage(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextGridPage = useCallback(() => {
    setStudentGridPage(prev => Math.min(maxGridPage, prev + 1));
  }, [maxGridPage]);

  const handlePrevSidebarPage = useCallback(() => {
    setSidebarPage(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextSidebarPage = useCallback(() => {
    setSidebarPage(prev => Math.min(maxSidebarPage, prev + 1));
  }, [maxSidebarPage]);

  // Reset pagination index if out of bounds
  useEffect(() => {
    if (studentGridPage > maxGridPage) {
      setStudentGridPage(maxGridPage);
    }
  }, [studentGridPage, maxGridPage]);

  useEffect(() => {
    if (sidebarPage > maxSidebarPage) {
      setSidebarPage(maxSidebarPage);
    }
  }, [sidebarPage, maxSidebarPage]);

  const showReconnecting = connectionState === 'reconnecting';

  if (connectionState === 'disconnected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] text-white">
        <div className="bg-surface border border-red-500/30 rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-400">Disconnected</h2>
          <p className="text-sm text-foreground/50">You have been disconnected from the class session.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm transition-colors cursor-pointer text-white w-full font-semibold"
          >
            Rejoin Class
          </button>
          <button
            onClick={onLeave}
            className="px-6 py-2 bg-surface-light border border-border/40 rounded-lg text-sm hover:bg-border/30 transition-colors cursor-pointer text-white w-full"
          >
            Leave Class
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#030712] text-foreground overflow-hidden relative font-sans">
      
      {/* Reconnecting Overlay */}
      {showReconnecting && (
        <div className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md z-[1000] flex items-center justify-center pointer-events-auto">
          <div className="text-center space-y-4">
            <svg className="w-12 h-12 animate-spin text-primary mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-lg font-semibold text-white">Connection Lost</p>
              <p className="text-sm text-foreground/50 mt-1">Reconnecting to class session...</p>
            </div>
          </div>
        </div>
      )}

      {/* LEFT / CENTER PANE: Active Content (Grid OR Whiteboard OR Screen Share) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        <Header
          roomName={roomName}
          isFocusMode={isFocusMode}
          setIsFocusMode={setIsFocusMode}
          showSplitLayout={showSplitLayout}
          isCopied={isCopied}
          handleCopyLink={handleCopyLink}
          exportedPdfUrl={exportedPdfUrl}
        />

        {/* Content Viewport */}
        <div className="flex-1 overflow-hidden relative bg-[#060b18] pb-24">
          
          <FloatingTeacherTile
            teacherTrack={teacherTrack}
            isFocusMode={isFocusMode}
            showSplitLayout={showSplitLayout}
          />

          {showWhiteboard ? (
            /* Whiteboard takes center stage */
            <div className="w-full h-full bg-white relative">
              <WhiteboardWrapper roomName={roomName} userName={userName} onEditorMount={handleEditorMount} />
            </div>
          ) : hasScreenShare && screenShareTrackRef ? (
            /* Screen Share takes center stage */
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="w-full h-full max-h-full aspect-video overflow-hidden border border-border/20 bg-surface/50 shadow-2xl relative rounded-xl">
                <ParticipantTile trackRef={screenShareTrackRef} className="w-full h-full lk-screen-share-tile" />
              </div>
            </div>
          ) : (
            <GridView
              isTeacher={isTeacher}
              activeStudentTrack={activeStudentTrack}
              teacherTrack={teacherTrack}
              remoteStudents={remoteStudents}
              gridStudents={gridStudents}
              maxGridPage={maxGridPage}
              studentGridPage={studentGridPage}
              handlePrevGridPage={handlePrevGridPage}
              handleNextGridPage={handleNextGridPage}
              cameraTracksCount={cameraTracks.length}
            />
          )}

          <Controls
            isMicrophoneEnabled={isMicrophoneEnabled}
            toggleMicrophone={toggleMicrophone}
            isCameraEnabled={isCameraEnabled}
            toggleCamera={toggleCamera}
            isScreenShareEnabled={isScreenShareEnabled}
            toggleScreenShare={toggleScreenShare}
            showWhiteboard={showWhiteboard}
            toggleWhiteboard={toggleWhiteboard}
            isTeacher={isTeacher}
            isExporting={isExporting}
            handleEndClass={handleEndClass}
            onLeave={onLeave}
            exportedPdfUrl={exportedPdfUrl}
          />

        </div>

      </div>

      {/* RIGHT PANE: Participant Videos Sidebar (Only visible when Whiteboard or Screen Share is active and NOT in Focus Mode) */}
      {showSplitLayout && !isFocusMode && (
        <StudentSidebar
          showWhiteboard={showWhiteboard}
          maxSidebarPage={maxSidebarPage}
          sidebarPage={sidebarPage}
          handlePrevSidebarPage={handlePrevSidebarPage}
          handleNextSidebarPage={handleNextSidebarPage}
          teacherTrack={teacherTrack}
          pageSidebarStudents={pageSidebarStudents}
        />
      )}

    </div>
  );
}

export default function VideoRoom({ token, roomName, serverUrl, userName, iceServers, onDisconnected, sessionToken, studentToken }: VideoRoomProps) {
  // Create stable Room instance to prevent reconnection loops in React strict mode
  const room = useMemo(() => {
    const roomOptions: RoomOptions = {
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 640, height: 480, frameRate: 24 },
      },
    };
    return new Room(roomOptions);
  }, []);

  // Build connect options with TURN/STUN servers for cross-network calls
  const connectOptions: RoomConnectOptions = useMemo(() => {
    const opts: RoomConnectOptions = {};
    if (iceServers && iceServers.length > 0) {
      opts.rtcConfig = {
        iceServers: iceServers.map(s => ({
          urls: s.urls,
          username: s.username,
          credential: s.credential,
        })),
      };
    }
    return opts;
  }, [iceServers]);

  // Clean up the room connection on unmount
  useEffect(() => {
    return () => {
      room.disconnect().catch(() => {});
    };
  }, [room]);

  const handleLeave = useCallback(() => {
    room.disconnect().catch(() => {});
  }, [room]);

  return (
    <LiveKitRoom
      room={room}
      token={token}
      serverUrl={serverUrl}
      connectOptions={connectOptions}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={onDisconnected}
    >
      <RoomContent 
        roomName={roomName} 
        userName={userName} 
        onLeave={handleLeave} 
        studentToken={studentToken} 
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
