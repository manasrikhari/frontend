'use client';
import { Tldraw, TLAssetStore, uniqueId } from 'tldraw';
import 'tldraw/tldraw.css';
import { useSync } from '@tldraw/sync';

interface WhiteboardProps {
  roomName: string;
  userName?: string;
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

export default function Whiteboard({ roomName, onEditorMount }: WhiteboardProps) {
  // useSync connects to our self-hosted Cloudflare worker sync endpoint
  const store = useSync({
    uri: `${SYNC_WORKER_URL}/api/connect/${roomName}`,
    assets: multiplayerAssetStore,
  });

  return (
    <div className="w-full h-full">
      <Tldraw 
        store={store} 
        onMount={onEditorMount}
        options={{ deepLinks: true }}
      />
    </div>
  );
}
