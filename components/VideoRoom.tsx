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
import type { IceServer } from '@/lib/api';
import WhiteboardPageControls from './classroom/WhiteboardPageControls';
import { getPagesSorted } from './classroom/whiteboard-helpers';


import Header from './classroom/Header';
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

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
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
  const [globalWhiteboardAllowed, setGlobalWhiteboardAllowed] = useState(false);
  const [globalScreenShareAllowed, setGlobalScreenShareAllowed] = useState(false);
  const [allowedWhiteboardStudents, setAllowedWhiteboardStudents] = useState<Record<string, boolean>>({});
  const [allowedScreenShareStudents, setAllowedScreenShareStudents] = useState<Record<string, boolean>>({});
  const participants = useParticipants();

  // Auto-disconnect student if teacher is not present in the room
  const hasTeacher = useMemo(() => {
    return participants.some(p => p.metadata === 'teacher');
  }, [participants]);

  useEffect(() => {
    if (isTeacher || connectionState !== 'connected') return;

    if (!hasTeacher) {
      const timer = setTimeout(() => {
        alert("The teacher is not in the meeting. You will be redirected to the dashboard.");
        onLeave();
      }, 7000); // 7 seconds grace period to allow for transient refreshes or load times
      return () => clearTimeout(timer);
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

        return false;
      };

      // 1. Handle shapes added outside frames
      if (event.changes.added) {
        const shapesToDelete: string[] = [];
        Object.values(event.changes.added).forEach((shape: any) => {
          if (!isShapeInsideAnyFrame(shape)) {
            shapesToDelete.push(shape.id);
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
      const accessToken = sessionStorage.getItem('classroom_access_token');
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
      onLeave();
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

  // Listen for whiteboard state broadcasts, note exports, and chat messages
  useEffect(() => {
    if (!room) return;
    const handleDataReceived = (payload: Uint8Array, participant: any) => {
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
          isFocusMode={isFocusMode}
          setIsFocusMode={setIsFocusMode}
          showSplitLayout={showSplitLayout}
        />

        {/* Content Viewport */}
        <div className="flex-1 overflow-hidden relative bg-[#060b18]">
          
          <FloatingTeacherTile
            teacherTrack={teacherTrack}
            isFocusMode={isFocusMode}
            showSplitLayout={showSplitLayout}
          />

          {/* Whiteboard Wrapper (always mounted but hidden if not showWhiteboard to preserve editor state) */}
          <div className={`w-full h-full bg-white ${showWhiteboard ? 'relative block' : 'absolute inset-0 opacity-0 pointer-events-none'}`}>
            <WhiteboardWrapper 
              roomName={roomName} 
              userName={userName} 
              onEditorMount={handleEditorMount} 
              isTeacher={isTeacher}
              isWritable={isWhiteboardAllowed}
            />

            {/* Whiteboard Page Controls (restricted to teachers) */}
            <WhiteboardPageControls editor={editor} isTeacher={isTeacher} />
          </div>

          {!showWhiteboard && (
            hasScreenShare && screenShareTrackRef ? (
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
            )
          )}

        </div>

        {/* Full-width Google Meet Style Footer */}
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
        />

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
        />
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
  // Create stable Room instance to prevent reconnection loops in React strict mode
  const room = useMemo(() => {
    const roomOptions: RoomOptions = {
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 640, height: 480, frameRate: 24 },
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
      token={token}
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
