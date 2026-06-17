'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tldraw, 
  TLAssetStore, 
  uniqueId,
  DefaultMainMenu,
  EditSubmenu, 
  ViewSubmenu, 
  PreferencesGroup, 
  KeyboardShortcutsMenuItem,
  TldrawUiMenuGroup
} from 'tldraw';
import 'tldraw/tldraw.css';
import { useSync } from '@tldraw/sync';

interface WhiteboardProps {
  roomName: string;
  userName?: string;
  isTeacher: boolean;
  isWritable: boolean;
  onEditorMount?: (editor: any) => void;
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

// Custom components to hide native PageMenu and apply CustomMainMenu
const whiteboardComponents = {
  PageMenu: null,
  MainMenu: CustomMainMenu,
};

// Custom overrides to remove export, copy-as, upload-media, and insert-embed actions
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
    return newActions;
  },
};

export default function Whiteboard({ 
  roomName, 
  userName, 
  isTeacher, 
  isWritable, 
  onEditorMount 
}: WhiteboardProps) {
  // useSync connects to our self-hosted Cloudflare worker sync endpoint
  const store = useSync({
    uri: `${SYNC_WORKER_URL}/api/connect/${roomName}`,
    assets: multiplayerAssetStore,
  });

  const [editor, setEditor] = useState<any>(null);
  const [isFollowingTeacher, setIsFollowingTeacher] = useState(false);

  const handleMount = useCallback((editorInstance: any) => {
    setEditor(editorInstance);
    if (onEditorMount) {
      onEditorMount(editorInstance);
    }
  }, [onEditorMount]);

  // Set the user name in Tldraw preferences
  useEffect(() => {
    if (!editor || !userName) return;
    const nameToSet = isTeacher ? `${userName} (Teacher)` : userName;
    editor.user.updateUserPreferences({ name: nameToSet });
  }, [editor, userName, isTeacher]);

  // Enforce read-only and focus modes based on permissions
  useEffect(() => {
    if (!editor) return;
    if (isTeacher) {
      editor.updateInstanceState({ isReadonly: false });
    } else {
      if (isWritable) {
        editor.updateInstanceState({ isReadonly: false, isFocusMode: false });
      } else {
        editor.updateInstanceState({ isReadonly: true, isFocusMode: true });
      }
    }
  }, [editor, isTeacher, isWritable]);

  // Follow the teacher's cursor/viewport by default for students
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
      { source: 'all' }
    );

    return () => {
      cleanupPresence();
      cleanupLocalFollow();
    };
  }, [editor, isTeacher]);

  return (
    <div className="w-full h-full relative">
      <Tldraw 
        store={store} 
        onMount={handleMount}
        components={whiteboardComponents}
        overrides={whiteboardOverrides}
      />

      {/* Floating "Resume Following Teacher" Button for Students */}
      {!isTeacher && !isFollowingTeacher && editor && editor.getCollaborators().some((c: any) => c.userName?.endsWith('(Teacher)')) && (
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
      )}
    </div>
  );
}
