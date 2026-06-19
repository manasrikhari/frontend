'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
const DEBUG_PERF = false;
import { 
  Tldraw, 
  TLAssetStore, 
  uniqueId,
  DefaultMainMenu,
  EditSubmenu, 
  ViewSubmenu, 
  PreferencesGroup, 
  KeyboardShortcutsMenuItem,
  TldrawUiMenuGroup,
  CollaboratorCursorOverlayUtil,
  CollaboratorHintOverlayUtil
} from 'tldraw';

class HiddenCollaboratorCursorOverlayUtil extends CollaboratorCursorOverlayUtil {
  override render() {
    // intentionally draw nothing
  }
}

class HiddenCollaboratorHintOverlayUtil extends CollaboratorHintOverlayUtil {
  override render() {
    // intentionally draw nothing
  }
}
import 'tldraw/tldraw.css';
import { useSync } from '@tldraw/sync';
import { useStrokeCapture } from '../hooks/useStrokeCapture';
import { useCursorBroadcast } from '../hooks/useCursorBroadcast';
import StrokeOverlay from './whiteboard/StrokeOverlay';

interface WhiteboardProps {
  roomName: string;
  userName?: string;
  isTeacher: boolean;
  isWritable: boolean;
  onEditorMount?: (editor: any) => void;
  room?: any;
  localParticipant?: any;
}

const SYNC_WORKER_URL = process.env.NEXT_PUBLIC_SYNC_WORKER_URL || 'http://localhost:8787';

// Custom asset store to upload images/videos directly to the Cloudflare Worker (which puts them in R2)
const multiplayerAssetStore: TLAssetStore = {
  async upload(_asset, file) {
    const id = uniqueId();
    const objectName = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, '-');
    const url = `${SYNC_WORKER_URL}/api/uploads/${objectName}`;

    const response = await fetch(url, {
      method: 'POST',
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`);
    }

    return { src: url };
  },
  resolve(asset) {
    return asset.props.src;
  },
};

// Custom main menu to exclude Language, Upload Media, Insert Embed, and Export
function CustomMainMenu() {
  return (
    <DefaultMainMenu>
      <TldrawUiMenuGroup id="submenus">
        <EditSubmenu />
        <ViewSubmenu />
      </TldrawUiMenuGroup>
      <TldrawUiMenuGroup id="preferences">
        <PreferencesGroup />
      </TldrawUiMenuGroup>
    </DefaultMainMenu>
  );
}

// Custom components to hide native PageMenu, MainMenu, SharePanel, PeopleMenu, and HelperButtons
const whiteboardComponents = {
  PageMenu: null,
  MainMenu: CustomMainMenu,
  SharePanel: null,
  PeopleMenu: null,
  HelperButtons: null,
};

// Custom overrides to remove export, copy-as, upload-media, insert-embed actions, and toggle-focus-mode action
const whiteboardOverrides = {
  actions: (editor: any, actions: any) => {
    const newActions = { ...actions };
    delete newActions['copy-as-svg'];
    delete newActions['copy-as-png'];
    delete newActions['copy-as-json'];
    delete newActions['export-as-svg'];
    delete newActions['export-as-png'];
    delete newActions['export-as-json'];
    delete newActions['upload-media'];
    delete newActions['insert-embed'];
    delete newActions['toggle-focus-mode'];
    return newActions;
  },
};

export default function Whiteboard({ 
  roomName, 
  userName, 
  isTeacher, 
  isWritable, 
  onEditorMount,
  room,
  localParticipant
}: WhiteboardProps) {
  // useSync connects to our self-hosted Cloudflare worker sync endpoint
  const store = useSync({
    uri: `${SYNC_WORKER_URL}/api/connect/${roomName}`,
    assets: multiplayerAssetStore,
  });

  const [editor, setEditor] = useState<any>(null);

  const localParticipantRef = useRef(localParticipant);
  const isTeacherRef = useRef(isTeacher);
  const isWritableRef = useRef(isWritable);

  // Keep refs up-to-date
  useEffect(() => {
    localParticipantRef.current = localParticipant;
  }, [localParticipant]);

  useEffect(() => {
    isTeacherRef.current = isTeacher;
  }, [isTeacher]);

  useEffect(() => {
    isWritableRef.current = isWritable;
  }, [isWritable]);

  const handleMount = useCallback((editorInstance: any) => {
    setEditor(editorInstance);

    // Default to Hand tool and clear active selections if student starts in read-only mode
    const targetWritable = isTeacherRef.current || isWritableRef.current;
    if (!targetWritable) {
      editorInstance.setCurrentTool('hand');
      editorInstance.selectNone();
    }

    // Register side effects for shape permission & ownership
    editorInstance.sideEffects.registerBeforeCreateHandler('shape', (shape: any, source: any) => {
      if (source === 'remote') {
        return shape;
      }
      // Don't overwrite if it already has createdBy (e.g. synced from another user)
      if (shape.meta?.createdBy) {
        return shape;
      }
      return {
        ...shape,
        meta: {
          ...shape.meta,
          createdBy: localParticipantRef.current?.identity ?? 'unknown',
        },
      };
    });

    editorInstance.sideEffects.registerBeforeChangeHandler('shape', (prev: any, next: any, source: any) => {
      if (source === 'remote') {
        return next;
      }
      if (isTeacherRef.current) {
        return next;
      }
      const createdBy = prev.meta?.createdBy || 'unknown';
      const myIdentity = localParticipantRef.current?.identity || 'unknown';
      if (createdBy !== myIdentity) {
        return prev;
      }
      return next;
    });

    editorInstance.sideEffects.registerBeforeDeleteHandler('shape', (shape: any, source: any) => {
      if (source === 'remote') {
        return true;
      }
      if (isTeacherRef.current) {
        return true;
      }
      const createdBy = shape.meta?.createdBy || 'unknown';
      const myIdentity = localParticipantRef.current?.identity || 'unknown';
      if (createdBy !== myIdentity) {
        return false;
      }
      return true;
    });

    if (onEditorMount) {
      onEditorMount(editorInstance);
    }
  }, [onEditorMount]);

  // Temporary Performance Instrumentation (to be removed after diagnosis)
  useEffect(() => {
    if (!DEBUG_PERF) return;
    if (!editor || typeof window === 'undefined') return;

    console.log('[PERF_MONITOR] Initializing whiteboard sync performance monitors...');

    const OriginalWebSocket = window.WebSocket;

    class InstrumentedWebSocket extends OriginalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        console.log(`[PERF_MONITOR][WS Connect] Connected to: ${url}`);

        const originalSend = this.send;
        this.send = function (data: any) {
          const sendTime = Date.now();
          let size = 0;
          if (typeof data === 'string') size = data.length;
          else if (data instanceof ArrayBuffer) size = data.byteLength;
          else if (data instanceof Blob) size = data.size;

          console.log(`[PERF_MONITOR][WS Send] time: ${sendTime}, size: ${size} bytes`);
          return originalSend.call(this, data);
        };

        this.addEventListener('message', (event) => {
          const recvTime = performance.now();
          let size = 0;
          if (typeof event.data === 'string') size = event.data.length;
          else if (event.data instanceof ArrayBuffer) size = event.data.byteLength;
          else if (event.data instanceof Blob) size = event.data.size;

          console.log(`[PERF_MONITOR][WS Recv] time: ${Date.now()}, size: ${size} bytes`);
          (window as any).__lastWsRecvTime = recvTime;
        });
      }
    }

    window.WebSocket = InstrumentedWebSocket as any;

    const cleanupStore = editor.store.listen((event: any) => {
      const now = Date.now();
      const perfNow = performance.now();

      if (event.source === 'remote') {
        const lastRecv = (window as any).__lastWsRecvTime;
        if (lastRecv) {
          const processingDuration = perfNow - lastRecv;
          console.log(`[PERF_MONITOR][Remote Apply] time: ${now}, processing time: ${processingDuration.toFixed(2)}ms`);
        }

        if (event.changes.added) {
          Object.values(event.changes.added).forEach((shape: any) => {
            if (shape.meta && shape.meta.sentAt) {
              const latency = now - shape.meta.sentAt;
              console.log(`[PERF_MONITOR][Latency E2E Add] Shape: ${shape.id}, Latency: ${latency}ms`);
            }
          });
        }
        if (event.changes.updated) {
          Object.values(event.changes.updated).forEach(([prev, curr]: any) => {
            if (curr.meta && curr.meta.sentAt) {
              const latency = now - curr.meta.sentAt;
              console.log(`[PERF_MONITOR][Latency E2E Update] Shape: ${curr.id}, Latency: ${latency}ms`);
            }
          });
        }
      }

      if (event.source === 'user') {
        let modified = false;
        editor.run(() => {
          if (event.changes.added) {
            Object.values(event.changes.added).forEach((shape: any) => {
              if (shape.type !== 'pointer' && (!shape.meta || !shape.meta.sentAt)) {
                editor.updateShape({
                  id: shape.id,
                  meta: { ...shape.meta, sentAt: now }
                });
                modified = true;
              }
            });
          }
          if (event.changes.updated) {
            Object.values(event.changes.updated).forEach(([prev, curr]: any) => {
              if (curr.type !== 'pointer' && (!curr.meta || curr.meta.sentAt !== now)) {
                editor.updateShape({
                  id: curr.id,
                  meta: { ...curr.meta, sentAt: now }
                });
                modified = true;
              }
            });
          }
        });
        if (modified) {
          console.log(`[PERF_MONITOR][Local Send Timestamp Injected] time: ${now}`);
        }
      }
    }, { scope: 'document' });

    return () => {
      window.WebSocket = OriginalWebSocket;
      cleanupStore();
      console.log('[PERF_MONITOR] Whiteboard sync performance monitors cleaned up.');
    };
  }, [editor]);

  // Set the user name and keyboard shortcut preferences in Tldraw
  useEffect(() => {
    if (!editor || !userName) return;
    const nameToSet = isTeacher ? `${userName} (Teacher)` : userName;
    const targetWritable = isTeacher || isWritable;
    editor.user.updateUserPreferences({
      name: nameToSet,
      areKeyboardShortcutsEnabled: targetWritable,
    });
  }, [editor, userName, isTeacher, isWritable]);

  // Enforce read-only and focus modes based on permissions
  const lastAppliedWritable = useRef<boolean | null>(null);
  useEffect(() => {
    if (!editor) return;
    const targetWritable = isTeacher || isWritable;
    if (lastAppliedWritable.current !== targetWritable) {
      editor.updateInstanceState({
        isReadonly: !targetWritable,
        isFocusMode: !targetWritable,
      });

      // Lock read-only students to Hand tool and clear any active selections
      if (!targetWritable) {
        editor.setCurrentTool('hand');
        editor.selectNone();
      }

      lastAppliedWritable.current = targetWritable;
    }
  }, [editor, isTeacher, isWritable]);

  // Camera and zoom confinement logic
  useEffect(() => {
    if (!editor) return;

    let isClamping = false;
    const maxYRef = { current: 810 };

    const updateMaxY = () => {
      const frames = editor.getCurrentPageShapes().filter((s: any) => s.type === 'frame');
      maxYRef.current = frames.length > 0
        ? frames.reduce((max: number, f: any) => {
            const h = (f.props.h as number) ?? 810;
            return Math.max(max, f.y + h);
          }, 0)
        : 810;
    };

    const clampCamera = () => {
      if (isClamping) return;

      // Skip clamping if the user is a participant and currently following the teacher
      const instanceState = editor.getInstanceState();
      if (!isTeacher && instanceState?.followingUserId) {
        return;
      }

      const camera = editor.getCamera();
      const screen = editor.getViewportScreenBounds();
      if (!screen || screen.width === 0 || screen.height === 0) return;

      // 1. Calculate boundaries (100px padding from all 4 directions)
      const minCanvasX = -100;
      const maxCanvasX = 1440 + 100;

      const minCanvasY = -100;
      const maxCanvasY = maxYRef.current + 100;

      // 2. Clamp Zoom
      const minZoomX = screen.width / (maxCanvasX - minCanvasX);
      const minZoomY = screen.height / (maxCanvasY - minCanvasY);
      
      // We clamp zoom to be at least minZoomX and minZoomY so they can't zoom out past the pages
      const MAX_ZOOM = 4;
      let clampedZ = Math.max(camera.z, minZoomX, minZoomY);
      clampedZ = Math.min(clampedZ, MAX_ZOOM);

      // 3. Clamp Positions
      const viewportWidthInCanvas = screen.width / clampedZ;
      const viewportHeightInCanvas = screen.height / clampedZ;

      // Current viewport top-left in page (canvas) coordinates
      const viewX = -camera.x;
      const viewY = -camera.y;

      let clampedViewX = viewX;
      if (viewportWidthInCanvas > (maxCanvasX - minCanvasX)) {
        clampedViewX = minCanvasX + (maxCanvasX - minCanvasX - viewportWidthInCanvas) / 2;
      } else {
        clampedViewX = Math.max(minCanvasX, Math.min(maxCanvasX - viewportWidthInCanvas, viewX));
      }

      let clampedViewY = viewY;
      if (viewportHeightInCanvas > (maxCanvasY - minCanvasY)) {
        clampedViewY = minCanvasY + (maxCanvasY - minCanvasY - viewportHeightInCanvas) / 2;
      } else {
        clampedViewY = Math.max(minCanvasY, Math.min(maxCanvasY - viewportHeightInCanvas, viewY));
      }

      const clampedX = -clampedViewX;
      const clampedY = -clampedViewY;

      // 4. Update if changed
      const EPSILON = 0.01;
      if (
        Math.abs(camera.x - clampedX) > EPSILON ||
        Math.abs(camera.y - clampedY) > EPSILON ||
        Math.abs(camera.z - clampedZ) > EPSILON
      ) {
        isClamping = true;
        try {
          editor.setCamera({ x: clampedX, y: clampedY, z: clampedZ });
        } finally {
          isClamping = false;
        }
      }
    };

    // Run clamp on mount or whenever editor changes
    updateMaxY();
    clampCamera();

    // Invalidate/update cache and re-clamp when frames change in document
    const cleanupFrames = editor.store.listen(
      (event: any) => {
        const hasAddedFrame = event.changes.added && 
          Object.values(event.changes.added).some((s: any) => s.typeName === 'shape' && s.type === 'frame');
        const hasRemovedFrame = event.changes.removed && 
          Object.values(event.changes.removed).some((s: any) => s.typeName === 'shape' && s.type === 'frame');
        const hasUpdatedFrame = event.changes.updated && 
          Object.values(event.changes.updated).some(([prev, curr]: any) => curr.typeName === 'shape' && curr.type === 'frame');

        if (hasAddedFrame || hasRemovedFrame || hasUpdatedFrame) {
          updateMaxY();
          clampCamera();
        }
      },
      { scope: 'document' }
    );

    // clampCamera only re-runs when the LOCAL user pans/zooms their own camera.
    const cleanupCamera = editor.store.listen(
      () => {
        clampCamera();
      },
      { scope: 'session', source: 'user' }
    );

    return () => {
      cleanupFrames();
      cleanupCamera();
    };
  }, [editor]);

  // Enforce shape selection permissions:
  // 1. Read-only students cannot select any shapes on the whiteboard.
  // 2. Editor students can only select shapes they created (cannot select teacher's drawings).
  useEffect(() => {
    if (!editor) return;

    const cleanupSelection = editor.store.listen((event: any) => {
      if (event.source === 'user') {
        if (isTeacherRef.current) return;

        const selectedIds = editor.getSelectedShapeIds();
        if (selectedIds.length === 0) return;

        const targetWritable = isTeacherRef.current || isWritableRef.current;
        if (!targetWritable) {
          editor.selectNone();
          return;
        }

        const myIdentity = localParticipantRef.current?.identity || 'unknown';
        const allowedIds = selectedIds.filter((id: string) => {
          const shape = editor.getShape(id);
          return shape && shape.meta?.createdBy === myIdentity;
        });

        if (allowedIds.length !== selectedIds.length) {
          if (allowedIds.length === 0) {
            editor.selectNone();
          } else {
            editor.select(...allowedIds);
          }
        }
      }
    }, { scope: 'session' });

    return () => {
      cleanupSelection();
    };
  }, [editor]);

  // Capture active writer coordinates (teacher or writable students)
  useStrokeCapture({ editor, localParticipant, isWritable });
  useCursorBroadcast({ editor, localParticipant, isWritable, userName: userName || 'Participant', isTeacher });

  return (
    <div className="w-full h-full relative">
      <Tldraw 
        store={store} 
        onMount={handleMount}
        components={whiteboardComponents}
        overrides={whiteboardOverrides}
        overlayUtils={[HiddenCollaboratorCursorOverlayUtil, HiddenCollaboratorHintOverlayUtil]}
      />

      {/* Read-Only Mode Status Badge for Students */}
      {!isTeacher && !isWritable && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-none select-none animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c101d]/90 border border-amber-500/30 text-amber-500 backdrop-blur-md rounded-full text-xs font-semibold shadow-lg">
            <svg className="w-3.5 h-3.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>Read-Only View</span>
          </div>
        </div>
      )}

      {/* Stroke Overlay Canvas */}
      <StrokeOverlay 
        editor={editor} 
        room={room} 
        localParticipant={localParticipant} 
      />

      {/* Empty Whiteboard Placeholder Overlay */}
      <EmptyWhiteboardOverlay editor={editor} isTeacher={isTeacher} />

      {/* Floating "Resume Following Teacher" Button for Students */}
      <ResumeFollowingButton 
        editor={editor} 
        isTeacher={isTeacher} 
      />
    </div>
  );
}

function EmptyWhiteboardOverlay({ editor, isTeacher }: { editor: any; isTeacher: boolean }) {
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!editor) return;

    const checkEmpty = () => {
      const frames = editor.getCurrentPageShapes().filter((s: any) => s.type === 'frame');
      setIsEmpty(frames.length === 0);
    };

    checkEmpty();

    const cleanup = editor.store.listen((event: any) => {
      const hasAddedFrame = event.changes.added && 
        Object.values(event.changes.added).some((s: any) => s.typeName === 'shape' && s.type === 'frame');
      const hasRemovedFrame = event.changes.removed && 
        Object.values(event.changes.removed).some((s: any) => s.typeName === 'shape' && s.type === 'frame');

      if (!hasAddedFrame && !hasRemovedFrame) {
        return;
      }

      checkEmpty();
    }, { scope: 'document' });

    return () => {
      cleanup();
    };
  }, [editor]);

  if (!isEmpty) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/50 pointer-events-none z-[100] animate-in fade-in duration-200">
      <div className="text-center p-6 max-w-sm rounded-2xl bg-white/85 border border-zinc-300 shadow-md backdrop-blur-md">
        <p className="text-sm font-semibold text-zinc-500 font-sans leading-relaxed">
          {isTeacher 
            ? "Click on + Add page to start writing"
            : "Waiting for the teacher to start writing..."}
        </p>
      </div>
    </div>
  );
}

function ResumeFollowingButton({ editor, isTeacher }: { editor: any; isTeacher: boolean }) {
  const [isFollowingTeacher, setIsFollowingTeacher] = useState(false);

  useEffect(() => {
    if (!editor || isTeacher) return;

    const checkAndFollowTeacher = () => {
      const instanceState = editor.getInstanceState();
      const currentFollowing = instanceState.followingUserId;
      const teacher = editor.getCollaborators().find((c: any) => c.userName?.endsWith('(Teacher)'));

      if (teacher) {
        if (!currentFollowing || currentFollowing !== teacher.userId) {
          editor.startFollowingUser(teacher.userId);
          setIsFollowingTeacher(true);
        }
      } else {
        setIsFollowingTeacher(false);
      }
    };

    checkAndFollowTeacher();

    // Listen to remote presence changes
    const cleanupPresence = editor.store.listen(
      () => {
        checkAndFollowTeacher();
      },
      { source: 'remote', scope: 'presence' }
    );

    // Track if user manually stopped following (pans/zooms)
    const cleanupLocalFollow = editor.store.listen(
      () => {
        const instanceState = editor.getInstanceState();
        const teacher = editor.getCollaborators().find((c: any) => c.userName?.endsWith('(Teacher)'));
        setIsFollowingTeacher(!!teacher && instanceState.followingUserId === teacher.userId);
      },
      { scope: 'session', source: 'user' }
    );

    return () => {
      cleanupPresence();
      cleanupLocalFollow();
    };
  }, [editor, isTeacher]);

  if (isTeacher || isFollowingTeacher || !editor) return null;

  const hasTeacher = editor.getCollaborators().some((c: any) => c.userName?.endsWith('(Teacher)'));
  if (!hasTeacher) return null;

  return (
    <button
      onClick={() => {
        const teacher = editor.getCollaborators().find((c: any) => c.userName?.endsWith('(Teacher)'));
        if (teacher) {
          editor.startFollowingUser(teacher.userId);
          setIsFollowingTeacher(true);
        }
      }}
      className="absolute bottom-6 right-6 z-[999] flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-lg hover:shadow-primary/25 cursor-pointer font-sans transition-all duration-200 border border-primary/20 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      Resume Following Teacher
    </button>
  );
}
