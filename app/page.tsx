'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !room.trim()) return;
    setIsJoining(true);

    try {
      const res = await fetch('/api/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: room.trim(), teacherName: name.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to create class session');
      }

      const data = await res.json();
      
      // Redirect to the room with both the teacher's session token and the student's token
      router.push(
        `/room/${encodeURIComponent(room.trim())}?name=${encodeURIComponent(name.trim())}&sessionToken=${encodeURIComponent(data.teacherToken)}&studentToken=${encodeURIComponent(data.studentToken)}`
      );
    } catch (err) {
      console.error(err);
      alert('Failed to initialize class session. Please check if the backend server is running.');
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-surface/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/15 mb-2">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Host a Live Class</h1>
            <p className="text-sm text-foreground/50">
              Enter your name and a room code to start a collaborative class session
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name-input" className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
                Teacher Name
              </label>
              <input
                id="name-input"
                className="w-full px-4 py-3 rounded-xl bg-surface-light/60 border border-border/40 text-foreground placeholder-foreground/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary-glow transition-all duration-200"
                placeholder="e.g. Prof. Malhotra"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="room-input" className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
                Class Room Code
              </label>
              <input
                id="room-input"
                className="w-full px-4 py-3 rounded-xl bg-surface-light/60 border border-border/40 text-foreground placeholder-foreground/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary-glow transition-all duration-200"
                placeholder="e.g. math-101"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim() || !room.trim() || isJoining}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/40 cursor-pointer"
            >
              {isJoining ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Initializing...
                </span>
              ) : (
                'Host Class (as Teacher)'
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="text-center text-xs text-foreground/30">
            You will be able to copy the student invite link once the class starts
          </p>
        </div>
      </div>
    </main>
  );
}
