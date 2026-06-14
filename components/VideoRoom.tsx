'use client';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useConnectionState,
} from '@livekit/components-react';
import { Track, Room, RoomOptions, RoomConnectOptions } from 'livekit-client';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import WhiteboardWrapper from './WhiteboardWrapper';
import type { IceServer } from '@/lib/api';

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
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [editor, setEditor] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedPdfUrl, setExportedPdfUrl] = useState<string | null>(null);

  const connectionState = useConnectionState();

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

        // Export shapeIds as PNG blob
        const { blob, width, height } = await editor.toImage(shapeIds, { format: 'png', background: true });
        
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
        pdf.addImage(dataUrl, 'PNG', x, y, printWidth, printHeight);
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

  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();

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
        // Set higher resolution, lower framerate limit, and text optimization hint
        await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
          audio: true,
          contentHint: 'text',
        }, {
          simulcast: true,
          videoEncoding: {
            maxFramerate: 15,
            maxBitrate: 1500000,
          },
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

  // Determine grid columns based on participant count
  const getGridColsClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1 max-w-3xl';
    if (count === 2) return 'grid-cols-2 max-w-5xl';
    if (count <= 4) return 'grid-cols-2 max-w-5xl';
    return 'grid-cols-3 w-full';
  };

  const isTeacher = localParticipant?.metadata === 'teacher';
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
        <div className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md z-50 flex items-center justify-center pointer-events-auto">
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
        
        {/* Header Bar */}
        <header className="h-16 px-6 border-b border-border/30 flex justify-between items-center bg-[#090d1a]/85 backdrop-blur-md z-30 select-none">
          <div className="flex items-center gap-3">
            <span className="font-bold text-base text-white tracking-wide">OpenGrapes Live</span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-xs font-semibold text-primary">{roomName}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-surface-light/50 border border-border/40 hover:bg-border/30 rounded-xl text-xs text-white font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
              </svg>
              {isCopied ? 'Link Copied!' : 'Copy Invite Link'}
            </button>
            
            {/* Download Notes PDF */}
            <button
              onClick={() => {
                const SYNC_WORKER_URL = process.env.NEXT_PUBLIC_SYNC_WORKER_URL || 'http://localhost:8787';
                window.open(`${SYNC_WORKER_URL}/api/pdf/${roomName}`, '_blank');
              }}
              className="px-4 py-2 bg-[#10b981]/20 border border-[#10b981]/40 hover:bg-[#10b981]/30 rounded-xl text-xs text-[#10b981] font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              title="Download Class Notes PDF"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Notes
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-hidden relative bg-[#060b18] pb-24">
          {showWhiteboard ? (
            /* Whiteboard takes center stage */
            <div className="w-full h-full bg-white relative">
              <WhiteboardWrapper roomName={roomName} userName={userName} onEditorMount={handleEditorMount} />
            </div>
          ) : hasScreenShare && screenShareTrackRef ? (
            /* Screen Share takes center stage */
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-full h-full max-h-full aspect-video overflow-hidden border border-border/20 bg-surface/50 shadow-2xl relative">
                <ParticipantTile trackRef={screenShareTrackRef} />
              </div>
            </div>
          ) : (
            /* Standard Grid View */
            <div className="w-full h-full p-6 flex items-center justify-center overflow-hidden">
              {cameraTracks.length === 0 ? (
                <div className="text-center space-y-3 select-none">
                  <svg className="w-12 h-12 mx-auto text-white/20 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <p className="text-sm text-foreground/30 font-medium">Connecting you to the room...</p>
                </div>
              ) : (
                <div className={`grid gap-4 w-full h-full justify-center items-center ${getGridColsClass(cameraTracks.length)}`}>
                  {cameraTracks.map(trackRef => (
                    <div 
                      key={trackRef.participant.sid} 
                      className="w-full h-full relative aspect-video max-h-full flex items-center justify-center"
                    >
                      <ParticipantTile trackRef={trackRef} className="w-full h-full" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Glassmorphic Controls Bar (Floating at the bottom of the main viewport) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
            {/* Microphone Toggle */}
            <button
              onClick={toggleMicrophone}
              className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                isMicrophoneEnabled
                  ? 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
              title={isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M9.30001 6.30001C9.30001 4.80884 10.5088 3.60001 12 3.60001C13.4912 3.60001 14.7 4.80884 14.7 6.30001V11.7C14.7 13.1912 13.4912 14.4 12 14.4C10.5088 14.4 9.30001 13.1912 9.30001 11.7V6.30001Z" 
                  fill="currentColor" 
                  fillOpacity={0.25}
                  stroke="none"
                />
                <path 
                  d="M15 20.4H9.00001M12 16.5V20.4M12 16.5C9.34905 16.5 7.20001 14.351 7.20001 11.7V9.30001M12 16.5C14.651 16.5 16.8 14.351 16.8 11.7V9.30001M12 14.4C10.5088 14.4 9.30001 13.1912 9.30001 11.7V6.30001C9.30001 4.80884 10.5088 3.60001 12 3.60001C13.4912 3.60001 14.7 4.80884 14.7 6.30001V11.7C14.7 13.1912 13.4912 14.4 12 14.4Z" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                {!isMicrophoneEnabled && (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                )}
              </svg>
            </button>

            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                isCameraEnabled
                  ? 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
              title={isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M2.39999 7.2C2.39999 6.53726 2.93725 6 3.59999 6H15C15.6627 6 16.2 6.53726 16.2 7.2V16.8C16.2 17.4627 15.6627 18 15 18H3.59999C2.93725 18 2.39999 17.4627 2.39999 16.8V7.2Z" 
                  fill="currentColor" 
                  fillOpacity={0.25}
                  stroke="none"
                />
                <path 
                  d="M16.2 14.5737L20.762 16.5446C21.1581 16.7157 21.6 16.4253 21.6 15.9938V8.21945C21.6 7.78795 21.1581 7.49752 20.762 7.66866L16.2 9.6396V14.5737Z" 
                  fill="currentColor" 
                  fillOpacity={0.25}
                  stroke="none"
                />
                <path 
                  d="M2.39999 7.2C2.39999 6.53726 2.93725 6 3.59999 6H15C15.6627 6 16.2 6.53726 16.2 7.2V16.8C16.2 17.4627 15.6627 18 15 18H3.59999C2.93725 18 2.39999 17.4627 2.39999 16.8V7.2Z" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M16.2 14.5737L20.762 16.5446C21.1581 16.7157 21.6 16.4253 21.6 15.9938V8.21945C21.6 7.78795 21.1581 7.49752 20.762 7.66866L16.2 9.6396V14.5737Z" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                {!isCameraEnabled && (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                )}
              </svg>
            </button>

            {/* Screen Share Toggle */}
            <button
              onClick={toggleScreenShare}
              className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                isScreenShareEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
              }`}
              title={isScreenShareEnabled ? 'Stop Screen Share' : 'Share Screen'}
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M4.80001 4.87677C4.13727 4.87677 3.60001 5.41403 3.60001 6.07677V16.8768H9.63782C9.77103 17.3943 10.2409 17.7768 10.8 17.7768H13.2C13.7592 17.7768 14.229 17.3943 14.3622 16.8768H20.4V6.07677C20.4 5.41403 19.8628 4.87677 19.2 4.87677H4.80001Z" 
                  fill="currentColor" 
                  fillOpacity={0.25}
                  stroke="none"
                />
                <path 
                  d="M9.63782 16.8768H1.24566C1.22045 16.8768 1.20001 16.8972 1.20001 16.9224C1.20001 18.2227 2.25409 19.2768 3.55437 19.2768H20.4457C21.7459 19.2768 22.8 18.2227 22.8 16.9224C22.8 16.8972 22.7796 16.8768 22.7544 16.8768H14.3622C14.229 17.3943 13.7592 17.7768 13.2 17.7768H10.8C10.2409 17.7768 9.77103 17.3943 9.63782 16.8768Z" 
                  fill="currentColor" 
                  fillOpacity={0.25}
                  stroke="none"
                />
                <path 
                  d="M14.3622 16.8768H22.7544C22.7796 16.8768 22.8 16.8972 22.8 16.9224C22.8 18.2227 21.7459 19.2768 20.4457 19.2768H3.55437C2.25409 19.2768 1.20001 18.2227 1.20001 16.9224C1.20001 16.8972 1.22045 16.8768 1.24566 16.8768H9.63782C9.77103 17.3943 10.2409 17.7768 10.8 17.7768H13.2C13.7592 17.7768 14.229 17.3943 14.3622 16.8768H20.4V6.07677C20.4 5.41403 19.8628 4.87677 19.2 4.87677H4.80001C4.13727 4.87677 3.60001 5.41403 3.60001 6.07677V16.8768H9.63782" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M12 7.38614V9.5968M12 9.6V13.05M9.60001 9.6L11.6818 7.5182C11.8575 7.34247 12.1425 7.34247 12.3182 7.5182L14.4 9.6M9.60001 14.25H14.4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Whiteboard Toggle */}
            <button
              onClick={() => setShowWhiteboard(prev => !prev)}
              className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                showWhiteboard
                  ? 'bg-primary hover:bg-primary-hover text-white'
                  : 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
              }`}
              title={showWhiteboard ? 'Close Collaborative Whiteboard' : 'Open Collaborative Whiteboard'}
            >
              <svg className="w-8 h-8" viewBox="0 0 24 25" fill="none" stroke="currentColor" strokeWidth={1} xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M1.5 5.4001C1.5 4.73732 2.03733 4.20004 2.70011 4.2001L21.3001 4.20185C21.9628 4.20191 22.5 4.73915 22.5 5.40185V16.2C22.5 16.8627 21.9627 17.4 21.3 17.4H2.7C2.03726 17.4 1.5 16.8627 1.5 16.2L1.5 5.4001Z" 
                  fill="currentColor" 
                  fillOpacity={0.25}
                  stroke="none"
                />
                <path 
                  d="M12 19.8H18.3M12 19.8H5.7M12 19.8V17.4M1.5 16.2L1.5 5.4001C1.5 4.73732 2.03733 4.20004 2.70011 4.2001L21.3001 4.20185C21.9628 4.20191 22.5 4.73915 22.5 5.40185V16.2C22.5 16.8627 21.9627 17.4 21.3 17.4H2.7C2.03726 17.4 1.5 16.8627 1.5 16.2Z" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <g filter="url(#filter0_d_5_489)">
                  <path 
                    d="M12.8077 6.46792C13.4209 5.67466 14.5913 5.60007 15.3003 6.30905C16.0092 7.01795 15.9347 8.18816 15.1416 8.80146L11.3602 11.7258C11.2889 11.7809 11.1879 11.7744 11.1242 11.7108L9.89915 10.4857C9.83548 10.422 9.82904 10.321 9.88411 10.2497L12.8077 6.46792Z" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M11.8477 11.0978L10.5112 9.76138" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M9.90984 10.4964L11.1126 11.6992C11.1544 11.741 11.1725 11.8008 11.1609 11.8587L11.0203 12.5617C10.9123 13.1017 10.5201 13.5407 9.99563 13.7085L7.77427 14.4193C7.60846 14.4724 7.4269 14.4284 7.3038 14.3053C7.18069 14.1821 7.13668 14.0006 7.18974 13.8348L7.90057 11.6134C8.06839 11.089 8.50736 10.6967 9.04731 10.5887L9.75035 10.4481C9.80824 10.4366 9.86809 10.4547 9.90984 10.4964Z" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M7.3038 14.3052L9.04117 12.5679" 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M8.94331 12.2028C8.868 12.4838 9.1252 12.741 9.40627 12.6657V12.6657C9.68734 12.5904 9.78148 12.2391 9.57572 12.0333V12.0333C9.36996 11.8276 9.01863 11.9217 8.94331 12.2028V12.2028Z" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M7.04752 15.84H9.09634C9.38875 15.84 9.67211 15.7386 9.89813 15.5531L10.4936 15.0644C10.6135 14.9659 10.7863 14.9659 10.9063 15.0644L11.5024 15.5537C11.728 15.7388 12.0108 15.84 12.3026 15.84H12.4144C12.8797 15.84 13.2948 15.5478 13.4519 15.1099L14.4046 12.4537C14.4332 12.3742 14.5456 12.3742 14.5741 12.4537L15.3899 14.7281C15.6292 15.3951 16.2614 15.84 16.97 15.84H17.1275" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <filter id="filter0_d_5_489" x="1.70001" y="4.5" width="20.6" height="20.6" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity={0} result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy={4}/>
                    <feGaussianBlur stdDeviation={2}/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_5_489"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_5_489" result="shape"/>
                  </filter>
                </defs>
              </svg>
            </button>

            {/* End Class / Export Button (Visible only to Teacher) */}
            {isTeacher && (
              <button
                onClick={handleEndClass}
                disabled={isExporting}
                className="w-15 h-12 rounded-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95"
                title="End Class & Export Notes"
              >
                {isExporting ? (
                  <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </button>
            )}

            {/* Leave Room Button */}
            <button
              onClick={onLeave}
              className="w-15 h-12 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg"
              title="Leave Room"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M16.2426 14.7441C16.1035 14.6935 15.9638 14.6454 15.8234 14.5999C15.2443 14.4123 14.9034 13.7877 15.1171 13.2177C15.4113 12.4332 14.8314 11.5964 13.9935 11.5964H10.2567C9.4189 11.5964 8.83896 12.4332 9.13315 13.2177C9.33571 13.7579 9.0062 14.349 8.4534 14.514C8.2199 14.5836 7.98794 14.6604 7.75785 14.7441C7.29867 14.9112 6.85182 15.1046 6.4192 15.3225C5.7059 15.6819 4.79793 15.3721 4.55111 14.6125L3.90067 12.6106C3.79359 12.2811 3.8866 11.9171 4.15205 11.6944C6.38599 9.81989 9.20895 8.79242 12.1251 8.79242C15.0413 8.79242 17.8643 9.81989 20.0982 11.6944C20.3639 11.9173 20.4569 12.2815 20.3498 12.6113L19.664 14.7218C19.4141 15.4909 18.488 15.7971 17.7722 15.4208C17.2805 15.1623 16.7697 14.9359 16.2426 14.7441Z" 
                  fill="currentColor" 
                  fillOpacity={0.25} 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>

          </div>

        </div>

      </div>

      {/* RIGHT PANE: Participant Videos Sidebar (Only visible when Whiteboard or Screen Share is active) */}
      {showSplitLayout && (
        <aside className="w-80 border-l border-border/30 bg-[#090d1a]/85 backdrop-blur-xl flex flex-col h-full z-20">
          <div className="h-16 px-5 border-b border-border/30 flex justify-between items-center bg-surface/30 select-none">
            <h3 className="font-semibold text-sm text-white/90">
              {showWhiteboard ? 'Meeting View' : 'Participants'}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
              {cameraTracks.length} active
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cameraTracks.map(trackRef => (
              <div 
                key={trackRef.participant.sid} 
                className="aspect-video relative rounded-xl overflow-hidden border border-white/5 bg-surface-light/10 shadow-md group"
              >
                <ParticipantTile trackRef={trackRef} className="w-full h-full" />
              </div>
            ))}
          </div>
        </aside>
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
