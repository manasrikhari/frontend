'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getToken, getTurnCredentials, IceServer } from '@/lib/api';
import VideoRoom from '@/components/VideoRoom';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomName = decodeURIComponent(params.roomName as string);

  // Extract session tokens from URL search params
  const sessionToken = searchParams.get('sessionToken') || '';
  const studentToken = searchParams.get('studentToken') || '';
  
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

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [iceServers, setIceServers] = useState<IceServer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

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

  const handleJoinFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
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

  // If the user hasn't submitted a name, show a beautiful name prompt UI
  if (!hasJoined) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 relative bg-[#030712] overflow-hidden">
        {/* Animated ambient blob */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="bg-surface/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/15 mb-2">
                <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">You're invited!</h1>
              <p className="text-sm text-foreground/50">
                You've been invited to join the room <span className="text-primary font-medium">{roomName}</span>. Enter your name below to connect.
              </p>
            </div>

            <form onSubmit={handleJoinFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="invite-name-input" className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Your Display Name
                </label>
                <input
                  id="invite-name-input"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-surface-light/60 border border-border/40 text-foreground placeholder-foreground/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary-glow transition-all duration-200"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/40 cursor-pointer"
              >
                Join Video Room
              </button>
            </form>

            <p className="text-center text-xs text-foreground/30">
              Your teacher is waiting in this room
            </p>
          </div>
        </div>
      </main>
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
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-surface-light border border-border/40 rounded-lg text-sm hover:bg-border/30 transition-colors cursor-pointer text-white"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl || !iceServers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] text-white">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div className="text-center">
            <p className="text-lg font-medium">Joining {roomName}...</p>
            <p className="text-sm text-foreground/40 mt-1">Connecting as {name}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VideoRoom
      token={token}
      roomName={roomName}
      serverUrl={serverUrl}
      userName={name}
      iceServers={iceServers}
      onDisconnected={handleDisconnected}
      sessionToken={sessionToken}
      studentToken={studentToken}
    />
  );
}
