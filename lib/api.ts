export async function getToken(roomName: string, participantName: string, sessionToken: string): Promise<string> {
  const response = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, participantName, sessionToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get token');
  }

  const data = await response.json();
  return data.token;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export async function getTurnCredentials(): Promise<IceServer[]> {
  const response = await fetch('/api/turn');

  if (!response.ok) {
    console.warn('Failed to fetch TURN credentials, falling back to STUN only');
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }

  const data = await response.json();
  return data.iceServers;
}
