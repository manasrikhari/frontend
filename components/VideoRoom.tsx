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
  useParticipants,
} from '@livekit/components-react';
import { Track, Room, RoomOptions, RoomConnectOptions } from 'livekit-client';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import WhiteboardWrapper from './WhiteboardWrapper';
import { decodeJwt } from '@/lib/api';
import { useClassroomSession } from '@/hooks/useClassroomSession';
import type { IceServer } from '@/lib/api';
import WhiteboardPageControls from './classroom/WhiteboardPageControls';
import { getPagesSorted } from './classroom/whiteboard-helpers';
import { Maximize2, Minimize2 } from 'lucide-react';



import Controls from './classroom/Controls';
import FloatingTeacherTile from './classroom/FloatingTeacherTile';
import StudentSidebar from './classroom/StudentSidebar';
import GridView from './classroom/GridView';
import ChatPanel from './classroom/ChatPanel';

export interface ChatMessage {
  id: string;
  senderSid: string;
  senderName: string;
  senderIdentity: string;
  text: string;
  timestamp: number;
  recipientIdentity?: string;
  recipientName?: string;
}

interface VideoRoomProps {
  token: string;
  roomName: string;
  serverUrl: string;
  userName?: string;
  iceServers?: IceServer[];
  onDisconnected?: () => void;
  sessionToken?: string;
  audioDeviceId?: string;
  videoDeviceId?: string;
  onConnected?: () => void;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

interface RoomContentProps {
  roomName: string;
  userName?: string;
  onLeave: () => void;
  onConnected?: () => void;
  sessionToken?: string;
}

function getSavedState<T>(roomName: string, keySuffix: string, defaultValue: T, sessionToken?: string): T {
  if (typeof window === 'undefined' || !sessionToken) return defaultValue;
  try {
    const decoded = decodeJwt(sessionToken);
    if (decoded?.role === 'teacher') {
      const saved = localStorage.getItem(`${keySuffix}_${roomName}`);
      if (saved !== null) return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse saved state:', e);
  }
  return defaultValue;
}

function RoomContent({ roomName, userName, onLeave, onConnected, sessionToken }: RoomContentProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const isTeacher = localParticipant?.metadata === 'teacher';

  useEffect(() => {
    if (connectionState === 'connected') {
      onConnected?.();
    }
  }, [connectionState, onConnected]);

  const [showWhiteboard, setShowWhiteboard] = useState(() =>
    getSavedState(roomName, 'whiteboard_active', false, sessionToken)
  );

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

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'tiled' | 'spotlight' | 'sidebar' | 'focus'>('auto');
  const [pinnedTrackSid, setPinnedTrackSid] = useState<string | null>(null);
  const [spotlightTrackSid, setSpotlightTrackSid] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileControlsVisible, setMobileControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const layoutLandscape = isLandscape || isFullscreen;

  const roomContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkIsMobileDevice = () => {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
    };
    setIsMobile(checkIsMobileDevice());

    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen) {
        const orientation = (screen as any).orientation;
        if (orientation && typeof orientation.unlock === 'function') {
          try {
            orientation.unlock();
          } catch (err) {
            // ignore
          }
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Inactivity timer to auto-hide controls on mobile
  useEffect(() => {
    if (!isMobile) return;
    let timer: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setMobileControlsVisible(false);
      }, 5000); // 5 seconds
    };

    if (mobileControlsVisible) {
      resetTimer();
      const handleUserActivity = () => {
        resetTimer();
      };
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('pointerdown', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('pointerdown', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
      };
    }
  }, [isMobile, mobileControlsVisible]);

  // Toggle controls on viewport click (ignoring interactive elements and controls bar itself)
  const handleViewportClick = useCallback((e: React.MouseEvent) => {
    if (!isMobile) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('[role="button"]') ||
      target.closest('a') ||
      target.closest('.whiteboard-container') ||
      target.closest('.screenshare-container') ||
      target.closest('.student-sidebar') ||
      target.closest('.controls-bar')
    ) {
      return;
    }
    setMobileControlsVisible(prev => !prev);
  }, [isMobile]);

  // Toggle fullscreen and lock screen orientation
  const handleToggleFullscreen = useCallback(async () => {
    if (!roomContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await roomContainerRef.current.requestFullscreen();
        const orientation = (screen as any).orientation;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
        const orientation = (screen as any).orientation;
        if (orientation && typeof orientation.unlock === 'function') {
          try {
            orientation.unlock();
          } catch (err) {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Fullscreen/Orientation lock error:', err);
    }
  }, []);

  // Unified Mobile Layout state sync: Auto-switch focusMode and controls visibility
  useEffect(() => {
    if (isMobile) {
      if (layoutLandscape || isFullscreen || showWhiteboard) {
        setIsFocusMode(true);
        setLayoutMode('focus');
        setMobileControlsVisible(true); // Always show controls overlay initially in landscape / fullscreen / whiteboard
      } else {
        setIsFocusMode(false);
        setLayoutMode(showSplitLayout ? 'sidebar' : 'tiled');
        setMobileControlsVisible(true);
      }
    }
  }, [isMobile, layoutLandscape, isFullscreen, showWhiteboard, showSplitLayout]);

  // Auto-switch layout mode when a participant is pinned locally or spotlighted by teacher
  useEffect(() => {
    if (pinnedTrackSid || spotlightTrackSid) {
      setLayoutMode('sidebar');
    } else {
      setLayoutMode((prev) => (prev === 'focus' ? 'focus' : 'tiled'));
    }
  }, [pinnedTrackSid, spotlightTrackSid]);

  // Synchronize layoutMode and isFocusMode
  useEffect(() => {
    if (isFocusMode) {
      if (layoutMode !== 'focus') {
        setLayoutMode('focus');
      }
    } else {
      if (layoutMode === 'focus') {
        setLayoutMode(showSplitLayout ? 'sidebar' : 'tiled');
      }
    }
  }, [isFocusMode, showSplitLayout]);

  useEffect(() => {
    setIsFocusMode(layoutMode === 'focus');
  }, [layoutMode]);

  const [studentGridPage, setStudentGridPage] = useState(0);
  const [sidebarPage, setSidebarPage] = useState(0);
  const [lastActiveStudentSid, setLastActiveStudentSid] = useState<string | null>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedPdfUrl, setExportedPdfUrl] = useState<string | null>(null);

  const [showEndCallModal, setShowEndCallModal] = useState(false);

  const batchId = useMemo(() => {
    if (!sessionToken) return null;
    const decoded = decodeJwt(sessionToken);
    return decoded?.batchId || null;
  }, [sessionToken]);

  // Chat & Participants states
  const [activeRightPanelTab, setActiveRightPanelTab] = useState<'chat' | 'participants' | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChatTarget, setActiveChatTarget] = useState<{ identity: string; name: string } | null>(null);
  const [globalWhiteboardAllowed, setGlobalWhiteboardAllowed] = useState(() =>
    getSavedState(roomName, 'global_whiteboard_allowed', false, sessionToken)
  );
  const [globalScreenShareAllowed, setGlobalScreenShareAllowed] = useState(() =>
    getSavedState(roomName, 'global_screenshare_allowed', false, sessionToken)
  );
  const [allowedWhiteboardStudents, setAllowedWhiteboardStudents] = useState<Record<string, boolean>>(() =>
    getSavedState<Record<string, boolean>>(roomName, 'allowed_whiteboard_students', {}, sessionToken)
  );
  const [allowedScreenShareStudents, setAllowedScreenShareStudents] = useState<Record<string, boolean>>(() =>
    getSavedState<Record<string, boolean>>(roomName, 'allowed_screenshare_students', {}, sessionToken)
  );
  const [teacherAbsentTimeLeft, setTeacherAbsentTimeLeft] = useState<number | null>(null);
  const participants = useParticipants();

  // Auto-disconnect student if teacher is not present in the room
  const hasTeacher = useMemo(() => {
    return participants.some(p => p.metadata === 'teacher');
  }, [participants]);

  useEffect(() => {
    if (isTeacher || connectionState !== 'connected') {
      setTeacherAbsentTimeLeft(null);
      return;
    }

    if (!hasTeacher) {
      setTeacherAbsentTimeLeft(600); // 10 minutes (600 seconds)
      const interval = setInterval(() => {
        setTeacherAbsentTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            alert("The teacher is not in the meeting. You will be redirected to the dashboard.");
            onLeave();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setTeacherAbsentTimeLeft(null);
    }
  }, [isTeacher, hasTeacher, connectionState, onLeave]);

  const isWhiteboardAllowed = useMemo(() => {
    if (isTeacher) return true;
    if (globalWhiteboardAllowed) return true;
    if (!localParticipant) return false;
    return !!allowedWhiteboardStudents[localParticipant.identity];
  }, [isTeacher, globalWhiteboardAllowed, localParticipant, allowedWhiteboardStudents]);

  const isScreenShareAllowed = useMemo(() => {
    if (isTeacher) return true;
    if (globalScreenShareAllowed) return true;
    if (!localParticipant) return false;
    return !!allowedScreenShareStudents[localParticipant.identity];
  }, [isTeacher, globalScreenShareAllowed, localParticipant, allowedScreenShareStudents]);

  const handleToggleGlobalPermission = useCallback(async (type: 'whiteboard' | 'screenshare') => {
    if (!isTeacher || !localParticipant) return;

    let nextWhiteboard = globalWhiteboardAllowed;
    let nextScreenShare = globalScreenShareAllowed;

    if (type === 'whiteboard') {
      nextWhiteboard = !globalWhiteboardAllowed;
      setGlobalWhiteboardAllowed(nextWhiteboard);
    } else {
      nextScreenShare = !globalScreenShareAllowed;
      setGlobalScreenShareAllowed(nextScreenShare);
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'UPDATE_PERMISSIONS',
        globalWhiteboardAllowed: nextWhiteboard,
        globalScreenShareAllowed: nextScreenShare,
        allowedWhiteboardStudents,
        allowedScreenShareStudents,
      }));
      await localParticipant.publishData(data, { reliable: true });
    } catch (err) {
      console.error('Failed to broadcast global permissions update:', err);
    }
  }, [isTeacher, localParticipant, globalWhiteboardAllowed, globalScreenShareAllowed, allowedWhiteboardStudents, allowedScreenShareStudents]);

  const handleToggleStudentPermission = useCallback(async (studentIdentity: string, type: 'whiteboard' | 'screenshare') => {
    if (!isTeacher || !localParticipant) return;

    let nextAllowedWhiteboard = { ...allowedWhiteboardStudents };
    let nextAllowedScreenShare = { ...allowedScreenShareStudents };

    if (type === 'whiteboard') {
      nextAllowedWhiteboard[studentIdentity] = !allowedWhiteboardStudents[studentIdentity];
      setAllowedWhiteboardStudents(nextAllowedWhiteboard);
    } else {
      nextAllowedScreenShare[studentIdentity] = !allowedScreenShareStudents[studentIdentity];
      setAllowedScreenShareStudents(nextAllowedScreenShare);
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'UPDATE_PERMISSIONS',
        globalWhiteboardAllowed,
        globalScreenShareAllowed,
        allowedWhiteboardStudents: nextAllowedWhiteboard,
        allowedScreenShareStudents: nextAllowedScreenShare,
      }));
      await localParticipant.publishData(data, { reliable: true });
    } catch (err) {
      console.error('Failed to broadcast student permission update:', err);
    }
  }, [isTeacher, localParticipant, globalWhiteboardAllowed, globalScreenShareAllowed, allowedWhiteboardStudents, allowedScreenShareStudents]);

  const boundsCleanupRef = useRef<(() => void) | null>(null);

  // Clean up bounds listener on unmount
  useEffect(() => {
    return () => {
      if (boundsCleanupRef.current) {
        boundsCleanupRef.current();
      }
    };
  }, []);

  // Save whiteboard permissions/state to localStorage for teachers
  useEffect(() => {
    if (!isTeacher || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`whiteboard_active_${roomName}`, JSON.stringify(showWhiteboard));
      localStorage.setItem(`global_whiteboard_allowed_${roomName}`, JSON.stringify(globalWhiteboardAllowed));
      localStorage.setItem(`global_screenshare_allowed_${roomName}`, JSON.stringify(globalScreenShareAllowed));
      localStorage.setItem(`allowed_whiteboard_students_${roomName}`, JSON.stringify(allowedWhiteboardStudents));
      localStorage.setItem(`allowed_screenshare_students_${roomName}`, JSON.stringify(allowedScreenShareStudents));
    } catch (e) {
      console.warn('[VideoRoom] Failed to save whiteboard state to localStorage:', e);
    }
  }, [
    isTeacher,
    roomName,
    showWhiteboard,
    globalWhiteboardAllowed,
    globalScreenShareAllowed,
    allowedWhiteboardStudents,
    allowedScreenShareStudents,
  ]);

  const hasBroadcastedInitialRef = useRef(false);

  // Broadcast whiteboard state on connection/reconnection
  useEffect(() => {
    if (connectionState !== 'connected') {
      hasBroadcastedInitialRef.current = false;
      return;
    }
    if (hasBroadcastedInitialRef.current) return;

    if (isTeacher && localParticipant) {
      hasBroadcastedInitialRef.current = true;
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'SET_WHITEBOARD',
        active: showWhiteboard,
        globalWhiteboardAllowed,
        globalScreenShareAllowed,
        allowedWhiteboardStudents,
        allowedScreenShareStudents,
      }));
      localParticipant.publishData(data, { reliable: true }).catch(err => {
        console.error('Failed to broadcast initial whiteboard state:', err);
      });
    }
  }, [
    connectionState,
    isTeacher,
    localParticipant,
    showWhiteboard,
    globalWhiteboardAllowed,
    globalScreenShareAllowed,
    allowedWhiteboardStudents,
    allowedScreenShareStudents,
  ]);

  // Auto-close chat/participants panel when entering focus mode
  useEffect(() => {
    if (isFocusMode) {
      setActiveRightPanelTab(null);
    }
  }, [isFocusMode]);

  const handleEditorMount = useCallback((editorInstance: any) => {
    setEditor(editorInstance);

    // Clean up previous listener if exists
    if (boundsCleanupRef.current) {
      boundsCleanupRef.current();
    }

    let cachedFramesBounds: { x: number; y: number; w: number; h: number }[] = [];

    const updateCachedFrames = () => {
      const frames = editorInstance.getCurrentPageShapes().filter((s: any) => s.type === 'frame');
      cachedFramesBounds = frames
        .map((f: any) => {
          const bounds = editorInstance.getShapePageBounds(f.id);
          return bounds ? { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h } : null;
        })
        .filter((b: any): b is { x: number; y: number; w: number; h: number } => !!b);
    };

    // Initialize cache
    updateCachedFrames();

    // Invalidate/update cache when frames change
    const cleanupFrames = editorInstance.store.listen((event: any) => {
      const hasAddedFrame = event.changes.added && 
        Object.values(event.changes.added).some((s: any) => s.typeName === 'shape' && s.type === 'frame');
      const hasRemovedFrame = event.changes.removed && 
        Object.values(event.changes.removed).some((s: any) => s.typeName === 'shape' && s.type === 'frame');
      const hasUpdatedFrame = event.changes.updated && 
        Object.values(event.changes.updated).some(([prev, curr]: any) => curr.typeName === 'shape' && curr.type === 'frame');

      if (hasAddedFrame || hasRemovedFrame || hasUpdatedFrame) {
        updateCachedFrames();
      }
    }, { scope: 'document' });

    // Register listener to enforce frame boundaries using cached bounds
    const cleanupEnforcer = editorInstance.store.listen((event: any) => {
      if (event.source !== 'user') return;

      const isShapeInsideAnyFrame = (shape: any) => {
        if (shape.type === 'frame') return true;

        // Check if parent is a frame
        if (shape.parentId && shape.parentId !== editorInstance.getCurrentPageId()) {
          const parent = editorInstance.getShape(shape.parentId);
          if (parent && parent.type === 'frame') return true;
        }

        // Check bounds
        try {
          const shapeBounds = editorInstance.getShapePageBounds(shape.id);
          if (!shapeBounds) return false;

          const shapeCenter = {
            x: shapeBounds.x + shapeBounds.w / 2,
            y: shapeBounds.y + shapeBounds.h / 2,
          };

          // See if center is inside any frame
          for (const fb of cachedFramesBounds) {
            if (
              shapeCenter.x >= fb.x &&
              shapeCenter.x <= fb.x + fb.w &&
              shapeCenter.y >= fb.y &&
              shapeCenter.y <= fb.y + fb.h
            ) {
              return true;
            }
          }
        } catch (e) {
          // If shape is not fully initialized in layout, assume it is inside/valid for now
          return true;
        }

        return false;
      };

      // 1. Handle shapes added outside frames
      if (event.changes.added) {
        const shapesToDelete: string[] = [];
        Object.values(event.changes.added).forEach((shape: any) => {
          if (shape.typeName === 'shape') {
            if (!isShapeInsideAnyFrame(shape)) {
              shapesToDelete.push(shape.id);
            }
          }
        });

        if (shapesToDelete.length > 0) {
          editorInstance.run(() => {
            editorInstance.deleteShapes(shapesToDelete);
          });
        }
      }

      // 2. Handle shapes moved/resized outside frames
      if (event.changes.updated) {
        const shapesToDelete: string[] = [];
        Object.keys(event.changes.updated).forEach((id) => {
          const shape = editorInstance.getShape(id);
          if (shape && !isShapeInsideAnyFrame(shape)) {
            shapesToDelete.push(id);
          }
        });

        if (shapesToDelete.length > 0) {
          editorInstance.run(() => {
            editorInstance.deleteShapes(shapesToDelete);
          });
        }
      }
    }, { scope: 'document' });

    boundsCleanupRef.current = () => {
      cleanupFrames();
      cleanupEnforcer();
    };
  }, []);

  const sendMessage = useCallback(async (text: string, targetIdentity?: string, targetName?: string) => {
    if (!localParticipant) return;
    try {
      const messageId = crypto.randomUUID();
      const msgObj: ChatMessage = {
        id: messageId,
        senderSid: localParticipant.sid,
        senderName: userName || localParticipant.name || localParticipant.identity,
        senderIdentity: localParticipant.identity,
        text,
        timestamp: Date.now(),
        recipientIdentity: targetIdentity,
        recipientName: targetName,
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'CHAT_MESSAGE',
        ...msgObj,
      }));

      const publishOptions: any = { reliable: true };
      if (targetIdentity) {
        publishOptions.destinationIdentities = [targetIdentity];
      }

      await localParticipant.publishData(data, publishOptions);

      // Add locally since LiveKit doesn't loop back published messages to the sender
      setMessages((prev) => [...prev, msgObj]);
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  }, [localParticipant, userName]);



  const handleEndClass = async (bypassConfirm = false) => {
    if (!bypassConfirm) {
      const confirmEnd = confirm('Are you sure you want to end the class for all users?');
      if (!confirmEnd) return;
    }

    setIsExporting(true);
    let hasNotes = false;
    try {
      // 1. Export whiteboard notes if editor is initialized
      if (editor) {
        const sortedFrames = getPagesSorted(editor);
        
        if (sortedFrames.length > 0) {
          const { jsPDF } = await import('jspdf');
          let pdf: any = null;
          let addedPageCount = 0;

          for (const frame of sortedFrames) {
            const bounds = editor.getShapePageBounds(frame.id);
            if (!bounds) continue;

            const childIds = editor.getSortedChildIdsForParent(frame.id);

            // Initialize or add page
            if (addedPageCount === 0) {
              pdf = new jsPDF({
                orientation: bounds.width > bounds.height ? 'landscape' : 'portrait',
                unit: 'pt',
                format: [bounds.width, bounds.height],
              });
            } else {
              pdf.addPage([bounds.width, bounds.height], bounds.width > bounds.height ? 'landscape' : 'portrait');
            }
            addedPageCount++;

            // If frame has child shapes, export them; otherwise leave page blank
            if (childIds && childIds.length > 0) {
              const { blob } = await editor.toImage(childIds, {
                format: 'jpeg',
                background: true,
                quality: 0.75, // Compressed quality to respect the 3-4 MB size limit
                scale: 1.5,    // Balanced scale for crisp text and smaller file size
                bounds,
              });

              const reader = new FileReader();
              const dataUrl = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });

              pdf.addImage(dataUrl, 'JPEG', 0, 0, bounds.width, bounds.height, undefined, 'FAST');
            }
          }

          if (pdf && addedPageCount > 0) {
            const pdfBlob = pdf.output('blob');
            const SYNC_WORKER_URL = process.env.NEXT_PUBLIC_SYNC_WORKER_URL || 'http://localhost:8787';
            const uploadUrl = `${SYNC_WORKER_URL}/api/pdf/${roomName}`;

            await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/pdf' },
              body: pdfBlob,
            });

            hasNotes = true;

            if (localParticipant) {
              const encoder = new TextEncoder();
              const data = encoder.encode(JSON.stringify({ type: 'NOTES_EXPORTED' }));
              await localParticipant.publishData(data, { reliable: true }).catch(() => {});
            }
          }
        }
      }

      // 2. Call backend to mark class as completed and terminate LiveKit room
      let accessToken = null;
      try {
        accessToken = sessionStorage.getItem('classroom_access_token');
      } catch (e) {
        console.warn('[VideoRoom] Failed to read classroom_access_token from sessionStorage:', e);
      }

      if (batchId && accessToken) {
        await fetch('/api/end-class', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ batchId, hasNotes })
        }).catch(err => console.error('Failed to notify backend of class end:', err));
      }

      alert('Class ended successfully for all participants.');
    } catch (err) {
      console.error('Error ending class:', err);
      alert('Class ended, but whiteboard notes could not be exported.');
    } finally {
      setIsExporting(false);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`whiteboard_active_${roomName}`);
          localStorage.removeItem(`global_whiteboard_allowed_${roomName}`);
          localStorage.removeItem(`global_screenshare_allowed_${roomName}`);
          localStorage.removeItem(`allowed_whiteboard_students_${roomName}`);
          localStorage.removeItem(`allowed_screenshare_students_${roomName}`);
        } catch (e) {
          console.warn('[VideoRoom] Failed to clean up localStorage keys:', e);
        }
      }
      onLeave();
    }
  };



  // Invite links copy mechanism removed

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
        const data = encoder.encode(JSON.stringify({
          type: 'SET_WHITEBOARD',
          active: nextState,
          globalWhiteboardAllowed,
          globalScreenShareAllowed,
          allowedWhiteboardStudents,
          allowedScreenShareStudents,
        }));
        await localParticipant.publishData(data, { reliable: true });
      } catch (err) {
        console.error('Failed to broadcast whiteboard state:', err);
      }
    }
  }, [showWhiteboard, isTeacher, localParticipant, globalWhiteboardAllowed, globalScreenShareAllowed, allowedWhiteboardStudents, allowedScreenShareStudents]);

  // Teacher broadcast spotlight callback
  const handleBroadcastSpotlight = useCallback((sid: string | null) => {
    if (!isTeacher || !localParticipant) return;
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'FORCE_SPOTLIGHT',
        participantSid: sid
      }));
      localParticipant.publishData(data, { reliable: true });
    } catch (err) {
      console.error('Failed to broadcast spotlight state:', err);
    }
  }, [isTeacher, localParticipant]);

  // Listen for whiteboard state broadcasts, note exports, and chat messages
  useEffect(() => {
    if (!room) return;
    const handleDataReceived = (payload: Uint8Array, participant: any, kind?: any, topic?: string) => {
      if (topic === 'wb-stroke') return; // Handled directly in StrokeOverlay for performance
      try {
        const decoder = new TextDecoder();
        const msg = JSON.parse(decoder.decode(payload));
        if (msg.type === 'SET_WHITEBOARD') {
          setShowWhiteboard(msg.active);
          if (msg.globalWhiteboardAllowed !== undefined) setGlobalWhiteboardAllowed(msg.globalWhiteboardAllowed);
          if (msg.globalScreenShareAllowed !== undefined) setGlobalScreenShareAllowed(msg.globalScreenShareAllowed);
          if (msg.allowedWhiteboardStudents !== undefined) setAllowedWhiteboardStudents(msg.allowedWhiteboardStudents);
          if (msg.allowedScreenShareStudents !== undefined) setAllowedScreenShareStudents(msg.allowedScreenShareStudents);
        } else if (msg.type === 'QUERY_WHITEBOARD_STATE') {
          if (isTeacher && localParticipant) {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify({
              type: 'SET_WHITEBOARD',
              active: showWhiteboard,
              globalWhiteboardAllowed,
              globalScreenShareAllowed,
              allowedWhiteboardStudents,
              allowedScreenShareStudents,
            }));
            localParticipant.publishData(data, { reliable: true }).catch(err => {
              console.error('Failed to reply to whiteboard query:', err);
            });
          }
        } else if (msg.type === 'UPDATE_PERMISSIONS') {
          if (msg.globalWhiteboardAllowed !== undefined) setGlobalWhiteboardAllowed(msg.globalWhiteboardAllowed);
          if (msg.globalScreenShareAllowed !== undefined) setGlobalScreenShareAllowed(msg.globalScreenShareAllowed);
          if (msg.allowedWhiteboardStudents !== undefined) setAllowedWhiteboardStudents(msg.allowedWhiteboardStudents);
          if (msg.allowedScreenShareStudents !== undefined) setAllowedScreenShareStudents(msg.allowedScreenShareStudents);
        } else if (msg.type === 'NOTES_EXPORTED') {
          const SYNC_WORKER_URL = process.env.NEXT_PUBLIC_SYNC_WORKER_URL || 'http://localhost:8787';
          setExportedPdfUrl(`${SYNC_WORKER_URL}/api/pdf/${roomName}`);
        } else if (msg.type === 'CHAT_MESSAGE') {
          setMessages((prev) => [...prev, msg]);
        } else if (msg.type === 'FORCE_SPOTLIGHT') {
          setSpotlightTrackSid(msg.participantSid);
        }
      } catch (err) {
        console.error('Failed to parse data channel message:', err);
      }
    };
    room.on('dataReceived', handleDataReceived);
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, isTeacher, showWhiteboard, localParticipant, roomName, globalWhiteboardAllowed, globalScreenShareAllowed, allowedWhiteboardStudents, allowedScreenShareStudents]);

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

  // Auto screen share revocation for students
  useEffect(() => {
    if (!isTeacher && isScreenShareEnabled && !isScreenShareAllowed) {
      localParticipant.setScreenShareEnabled(false).catch(err => {
        console.error('Failed to auto-stop screen share:', err);
      });
    }
  }, [isTeacher, isScreenShareEnabled, isScreenShareAllowed, localParticipant]);



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

        const visibleLimit = isMobile ? (showSplitLayout ? 1 : 2) : (showSplitLayout ? 2 : 4);
        
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
  }, [room, localParticipant, showSplitLayout, isMobile]);

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

  // Featured track helper for gridStudents filter
  const featuredTrackSid = useMemo(() => {
    if (pinnedTrackSid) return pinnedTrackSid;
    if (spotlightTrackSid) return spotlightTrackSid;
    return isTeacher ? activeStudentTrack?.participant.sid : teacherTrack?.participant.sid;
  }, [pinnedTrackSid, spotlightTrackSid, isTeacher, activeStudentTrack, teacherTrack]);

  // Grid View student list (uses orderedRemoteStudents and filters out featured track)
  const gridStudents = useMemo(() => {
    const list = [...orderedRemoteStudents];
    const filteredList = list.filter(t => 
      t.participant.sid !== featuredTrackSid && 
      t.participant.sid !== localParticipant?.sid
    );
    if (!isTeacher && localTrack && localParticipant?.sid !== featuredTrackSid) {
      filteredList.push(localTrack);
    }
    return filteredList;
  }, [orderedRemoteStudents, featuredTrackSid, localParticipant?.sid, isTeacher, localTrack]);

  // Sidebar student list (uses orderedRemoteStudents and places localTrack at Slot 3 / index 2)
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
    <div 
      ref={roomContainerRef}
      className="flex flex-col h-screen w-screen bg-[#030712] text-foreground overflow-hidden relative font-sans"
    >
      
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

      {/* Main Workspace + Sidebars (Top Flex Row) */}
      <div className="flex-1 flex flex-row min-h-0 relative overflow-hidden">
        
        {/* LEFT / CENTER PANE: Active Content (Grid OR Whiteboard OR Screen Share) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">

          {/* Content Viewport */}
          <div 
            className="flex-1 overflow-hidden relative bg-[#060b18]"
            onClick={handleViewportClick}
          >
            
            {!(isMobile && !layoutLandscape && mobileControlsVisible) && (
              <FloatingTeacherTile
                teacherTrack={teacherTrack}
                isFocusMode={isFocusMode}
                showSplitLayout={showSplitLayout}
              />
            )}

            {teacherAbsentTimeLeft !== null && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[50] w-full max-w-lg px-4">
                <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 text-amber-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-amber-100">Teacher Disconnected</span>
                      <span className="text-[10px] text-amber-200/70">
                        {teacherAbsentTimeLeft > 180
                          ? "Waiting for them to rejoin..."
                          : `${Math.floor(teacherAbsentTimeLeft / 60)}:${(teacherAbsentTimeLeft % 60).toString().padStart(2, '0')} until meeting ends automatically`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fullscreen Button for Mobile (when Whiteboard or Screen Sharing is active) */}
            {isMobile && (showWhiteboard || (hasScreenShare && screenShareTrackRef)) && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFullscreen();
                }}
                className={`absolute right-4 z-[999] p-2.5 rounded-xl bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/10 shadow-lg cursor-pointer transition-all duration-200 ${
                  mobileControlsVisible
                    ? 'bottom-24'
                    : 'bottom-4'
                }`}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Whiteboard Wrapper (always mounted but hidden if not showWhiteboard to preserve editor state) */}
            <div className={`z-10 bg-white whiteboard-container transition-all duration-300 ${
              showWhiteboard 
                ? isMobile
                  ? `absolute inset-0 m-auto aspect-video border border-white/10 rounded-lg shadow-2xl overflow-hidden ${
                      mobileControlsVisible
                        ? 'w-[calc(100%-32px)] max-h-[calc(100%-96px)]'
                        : 'w-[calc(100%-32px)] max-h-[calc(100%-32px)]'
                    }`
                  : 'w-full h-full relative block'
                : 'absolute inset-0 opacity-0 pointer-events-none'
            }`}>
              <WhiteboardWrapper 
                roomName={roomName} 
                userName={userName} 
                onEditorMount={handleEditorMount} 
                isTeacher={isTeacher}
                isWritable={isWhiteboardAllowed}
                room={room}
                localParticipant={localParticipant}
                isSidebarOpen={!isFocusMode}
                isMobile={isMobile}
              />

              {/* Whiteboard Page Controls (restricted to teachers & authorized students) */}
              <WhiteboardPageControls editor={editor} isTeacher={isTeacher} isWritable={isWhiteboardAllowed} />
            </div>

            {!showWhiteboard && (
              hasScreenShare && screenShareTrackRef ? (
                /* Screen Share takes center stage */
                <div className="w-full h-full flex items-center justify-center p-4">
                  <div className={`overflow-hidden border border-border/20 bg-surface/50 shadow-2xl relative rounded-xl screenshare-container transition-all duration-300 ${
                    isMobile
                      ? `absolute inset-0 m-auto aspect-video border border-white/10 rounded-lg shadow-2xl ${
                          mobileControlsVisible
                            ? 'w-[calc(100%-32px)] max-h-[calc(100%-96px)]'
                            : 'w-[calc(100%-32px)] max-h-[calc(100%-32px)]'
                        }`
                      : 'w-full h-full max-h-full aspect-video'
                  }`}>
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
                  cameraTracksCount={cameraTracks.length}
                  layoutMode={layoutMode === 'focus' ? 'tiled' : layoutMode}
                  pinnedTrackSid={pinnedTrackSid}
                  setPinnedTrackSid={setPinnedTrackSid}
                  spotlightTrackSid={spotlightTrackSid}
                  setSpotlightTrackSid={setSpotlightTrackSid}
                  onBroadcastSpotlight={handleBroadcastSpotlight}
                  localTrack={localTrack}
                />
              )
            )}

          </div>

        </div>

        {/* RIGHT PANE: Participant Videos Sidebar (Only visible when Whiteboard or Screen Share is active) */}
        {showSplitLayout && (
          <StudentSidebar
            showWhiteboard={showWhiteboard}
            teacherTrack={teacherTrack}
            sidebarStudents={sidebarStudents}
            isOpen={!isFocusMode}
            onToggle={() => {
              const nextFocus = !isFocusMode;
              setIsFocusMode(nextFocus);
              setLayoutMode(nextFocus ? 'focus' : 'sidebar');
            }}
                        isMobile={isMobile}
            mobileControlsVisible={mobileControlsVisible}
            isLandscape={layoutLandscape}
            isFullscreen={isFullscreen}
          />
        )}

        {/* RIGHT PANE: Chat & Participants Panel */}
        {activeRightPanelTab && localParticipant && (
          <ChatPanel
            activeTab={activeRightPanelTab}
            setActiveTab={setActiveRightPanelTab}
            messages={messages}
            onSendMessage={sendMessage}
            participants={participants}
            localParticipant={localParticipant}
            activeChatTarget={activeChatTarget}
            setActiveChatTarget={setActiveChatTarget}
            roomName={roomName}
            globalWhiteboardAllowed={globalWhiteboardAllowed}
            globalScreenShareAllowed={globalScreenShareAllowed}
            allowedWhiteboardStudents={allowedWhiteboardStudents}
            allowedScreenShareStudents={allowedScreenShareStudents}
            onToggleGlobalPermission={handleToggleGlobalPermission}
            onToggleStudentPermission={handleToggleStudentPermission}
            isMobile={isMobile}
          />
        )}

      </div>

      {/* BOTTOM ROW: Full-width Google Meet Style Footer */}
      {!activeRightPanelTab && (
        <Controls
          roomName={roomName}
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
          onLeave={() => {
            if (isTeacher) {
              setShowEndCallModal(true);
            } else {
              onLeave();
            }
          }}
          exportedPdfUrl={exportedPdfUrl}
          activeRightPanelTab={activeRightPanelTab}
          setActiveRightPanelTab={setActiveRightPanelTab}
          isWhiteboardAllowed={isWhiteboardAllowed}
          isScreenShareAllowed={isScreenShareAllowed}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          showSplitLayout={showSplitLayout}
                    isMobile={isMobile}
          mobileControlsVisible={mobileControlsVisible}
          onHideControls={() => setMobileControlsVisible(false)}
        />
      )}

      {/* End Call Options Modal for Teachers */}
      {showEndCallModal && (
        <div className="fixed inset-0 z-[1000000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19]/90 border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white text-center font-sans">End Session</h3>
            <p className="text-sm text-foreground/60 text-center leading-normal font-sans">
              Choose how you want to exit the class session.
            </p>
            <div className="flex flex-col gap-2.5 pt-2 font-sans">
              <button
                onClick={() => {
                  setShowEndCallModal(false);
                  handleEndClass(true);
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                End Call for All
              </button>
              <button
                onClick={() => {
                  setShowEndCallModal(false);
                  onLeave();
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-[#ffffff] font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Leave Meeting
              </button>
              <button
                onClick={() => setShowEndCallModal(false)}
                className="w-full py-2 text-xs text-foreground/45 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exporting / Publishing Notes Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[1000000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center space-y-4 max-w-sm text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              {/* Inner loading ring */}
              <div className="absolute inset-2 rounded-full border-4 border-b-emerald-400 border-t-transparent border-r-transparent border-l-transparent animate-spin duration-1000 ease-in-out"></div>
              {/* Center pulsing dot */}
              <div className="absolute inset-5.5 rounded-full bg-white/20 animate-pulse"></div>
            </div>
            <h3 className="text-xl font-bold text-white font-sans mt-4">Publishing Notes</h3>
            <p className="text-sm text-foreground/60 leading-relaxed font-sans">
              Generating high-fidelity multi-page PDF notes and uploading them. Please wait a moment...
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default function VideoRoom({
  token,
  roomName,
  serverUrl,
  userName,
  iceServers,
  onDisconnected,
  sessionToken,
  audioDeviceId,
  videoDeviceId,
  onConnected,
  audioEnabled = true,
  videoEnabled = true,
}: VideoRoomProps) {
  const currentToken = useClassroomSession(token, roomName, sessionToken);

  // Create stable Room instance to prevent reconnection loops in React strict mode
  const room = useMemo(() => {
    const roomOptions: RoomOptions = {
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 960, height: 540, frameRate: 24 },
        deviceId: videoDeviceId || undefined,
      },
      audioCaptureDefaults: {
        deviceId: audioDeviceId || undefined,
      },
    };
    return new Room(roomOptions);
  }, [audioDeviceId, videoDeviceId]);

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
      token={currentToken}
      serverUrl={serverUrl}
      connectOptions={connectOptions}
      connect={true}
      video={videoEnabled}
      audio={audioEnabled}
      onDisconnected={onDisconnected}
    >
      <RoomContent 
        roomName={roomName} 
        userName={userName} 
        onLeave={handleLeave} 
        onConnected={onConnected}
        sessionToken={sessionToken}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
