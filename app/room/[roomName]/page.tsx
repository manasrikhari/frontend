'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getToken, getTurnCredentials, IceServer, decodeJwt } from '@/lib/api';
import VideoRoom from '@/components/VideoRoom';
import PreJoinScreen from '@/components/classroom/PreJoinScreen';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomName = decodeURIComponent(params.roomName as string);

  // Extract session tokens from URL search params
  const sessionToken = searchParams.get('sessionToken') || '';
  const studentToken = searchParams.get('studentToken') || '';

  // Track teacher and class details
  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');

  // Track the participant name and whether they have submitted the join form
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') {
      return decodeURIComponent(searchParams.get('name') || '');
    }
    return '';
  });

  const [hasJoined, setHasJoined] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!searchParams.get('name');
    }
    return false;
  });

  // Track active device selection, toggles, and loading states
  const [audioDeviceId, setAudioDeviceId] = useState('');
  const [videoDeviceId, setVideoDeviceId] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Determine if the room should be fully visible
  const [isFullyConnected, setIsFullyConnected] = useState(() => {
    if (typeof window !== 'undefined') {
      const nameInUrl = searchParams.get('name');
      const tokenInUrl = searchParams.get('sessionToken') || '';
      const decoded = decodeJwt(tokenInUrl);
      // If teacher is returning directly with a name, bypass the pre-join screen
      return !!nameInUrl && decoded?.role === 'teacher';
    }
    return false;
  });

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [iceServers, setIceServers] = useState<IceServer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Decode JWT on load to extract teacher name
  useEffect(() => {
    if (sessionToken) {
      const decoded = decodeJwt(sessionToken);
      if (decoded) {
        if (decoded.teacherName) setTeacherName(decoded.teacherName);
        if (decoded.roomName) setClassName(decoded.roomName);
      }
    }
  }, [sessionToken]);

  // Fetch token, LiveKit server URL, and TURN credentials when hasJoined is true
  useEffect(() => {
    if (!hasJoined || !name || !sessionToken) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    Promise.all([
      getToken(roomName, name, sessionToken),
      fetch('/api/livekit-url').then(r => r.json()).then(d => d.url as string),
      getTurnCredentials(),
    ])
      .then(([fetchedToken, livekitUrl, turnCredentials]) => {
        setToken(fetchedToken);
        setServerUrl(livekitUrl);
        setIceServers(turnCredentials);
      })
      .catch((err) => {
        console.error('Failed to initialize room:', err);
        setError(err.message || 'Failed to connect');
        fetchedRef.current = false; // Allow retry on error
      });
  }, [roomName, name, hasJoined, sessionToken]);

  const handleDisconnected = useCallback(() => {
    window.location.href = '/';
  }, []);

  const handleJoin = (audioId: string, videoId: string, audioOn: boolean, videoOn: boolean) => {
    setAudioDeviceId(audioId);
    setVideoDeviceId(videoId);
    setAudioEnabled(audioOn);
    setVideoEnabled(videoOn);
    setIsConnecting(true);

    // Update URL query parameters so sharing/refresh works
    const url = new URL(window.location.href);
    url.searchParams.set('name', name.trim());
    window.history.replaceState(null, '', url.pathname + url.search);

    setHasJoined(true);
  };

  // If the session token is missing, show an Access Denied / Invite Link Required screen
  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="bg-surface border border-red-500/30 rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-400">Invite Link Required</h2>
          <p className="text-sm text-foreground/50">
            This live room requires a valid invite link to join. Please use the complete URL shared by your teacher.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-surface-light border border-border/40 rounded-lg text-sm hover:bg-border/30 transition-colors cursor-pointer text-white"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="bg-surface border border-red-500/30 rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-400">Connection Failed</h2>
          <p className="text-sm text-foreground/50">{error}</p>
          <p className="text-xs text-foreground/30">
            Make sure the backend server and tunneling ports are set up correctly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#6366F1] hover:bg-[#4f46e5] rounded-lg text-sm transition-colors cursor-pointer text-white w-full font-semibold"
          >
            Retry Connection
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-surface-light border border-border/40 rounded-lg text-sm hover:bg-border/30 transition-colors cursor-pointer text-white w-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const showRoom = token && serverUrl && iceServers;

  return (
    <div className="relative w-screen h-screen">
      {/* LiveKit Video Room rendered in the background */}
      {showRoom && (
        <VideoRoom
          token={token}
          roomName={roomName}
          serverUrl={serverUrl}
          userName={name}
          iceServers={iceServers}
          onDisconnected={handleDisconnected}
          sessionToken={sessionToken}
          studentToken={studentToken}
          audioDeviceId={audioDeviceId}
          videoDeviceId={videoDeviceId}
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          onConnected={() => setIsFullyConnected(true)}
        />
      )}

      {/* Show PreJoinScreen as interactive overlay only if the user hasn't clicked join */}
      {!hasJoined && (
        <div className="absolute inset-0 z-[1000]">
          <PreJoinScreen
            roomName={roomName}
            teacherName={teacherName}
            userName={name}
            setUserName={setName}
            onJoin={handleJoin}
          />
        </div>
      )}

      {/* Show full screen loading transition with centeed loader once student clicked "Join class" */}
      {hasJoined && !isFullyConnected && (
        <div className="absolute inset-0 z-[1000] bg-[#030712] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
          {/* Ambient background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#6366F1]/10 blur-[130px] animate-pulse" />
          </div>

          <div className="text-center space-y-8 z-10">
            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#E2E8F0] leading-relaxed max-w-xl mx-auto">
                Connecting you to{' '}
                <span className="text-[#6366F1]">{teacherName || 'Teacher'}</span>
                's{' '}
                <span className="text-indigo-400">{className ? className.toUpperCase() : roomName.toUpperCase()}</span>
              </h1>
              <p className="text-sm text-foreground/40 font-medium tracking-wide">
                Please wait while we establish your secure video connection...
              </p>
            </div>

            {/* Glowing circular loader below */}
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 rounded-full bg-[#6366F1]/10 blur-md animate-pulse pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
