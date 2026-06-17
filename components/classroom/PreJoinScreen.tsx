'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PreJoinScreenProps {
  roomName: string;
  teacherName: string;
  userName: string;
  onJoin: (audioDeviceId: string, videoDeviceId: string, audioEnabled: boolean, videoEnabled: boolean) => void;
}

export default function PreJoinScreen({
  roomName,
  teacherName,
  userName,
  onJoin,
}: PreJoinScreenProps) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [showDeviceSettings, setShowDeviceSettings] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(true);
  const [isCamEnabled, setIsCamEnabled] = useState<boolean>(true);

  const [hasCamPermission, setHasCamPermission] = useState<boolean>(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean>(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    videoElementRef.current = node;
    if (node && previewStreamRef.current) {
      node.srcObject = previewStreamRef.current;
    }
  }, []);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const settingsCardRef = useRef<HTMLDivElement>(null);

  const isCamEnabledRef = useRef(isCamEnabled);
  const isMicEnabledRef = useRef(isMicEnabled);

  useEffect(() => {
    isCamEnabledRef.current = isCamEnabled;
  }, [isCamEnabled]);

  useEffect(() => {
    isMicEnabledRef.current = isMicEnabled;
  }, [isMicEnabled]);

  const startPreviewStream = useCallback(async (vId?: string, aId?: string) => {
    try {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop());
        previewStreamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: vId ? { deviceId: { exact: vId } } : true,
        audio: aId ? { deviceId: { exact: aId } } : true,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (errVideo) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          } catch (errAudio) {
            throw errAudio;
          }
        }
      }

      previewStreamRef.current = stream;

      stream.getVideoTracks().forEach(t => t.enabled = isCamEnabledRef.current);
      stream.getAudioTracks().forEach(t => t.enabled = isMicEnabledRef.current);
      
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
      }

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      setHasCamPermission(videoTracks.length > 0);
      setHasMicPermission(audioTracks.length > 0);

      const activeVid = videoTracks[0]?.getSettings().deviceId;
      const activeAud = audioTracks[0]?.getSettings().deviceId;

      if (activeVid && !vId) setSelectedVideoId(activeVid);
      if (activeAud && !aId) setSelectedAudioId(activeAud);

      setErrorMsg(null);
    } catch (err: any) {
      console.error('Error starting preview stream:', err);
      setErrorMsg(err.message || 'Permission denied or no devices found.');
    }
  }, []);

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audios = allDevices.filter((d) => d.kind === 'audioinput');
      const videos = allDevices.filter((d) => d.kind === 'videoinput');
      setAudioDevices(audios);
      setVideoDevices(videos);
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      await startPreviewStream();
      if (active) {
        await enumerateDevices();
      }
    }
    init();

    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      active = false;
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startPreviewStream, enumerateDevices]);

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    startPreviewStream(selectedVideoId, selectedAudioId);
  }, [selectedVideoId, selectedAudioId, startPreviewStream]);

  useEffect(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMicEnabled;
      });
    }
  }, [isMicEnabled]);

  useEffect(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isCamEnabled;
      });
    }
  }, [isCamEnabled]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsCardRef.current && !settingsCardRef.current.contains(event.target as Node)) {
        setShowDeviceSettings(false);
      }
    }
    if (showDeviceSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeviceSettings]);

  const handleJoinClick = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }

    onJoin(selectedAudioId, selectedVideoId, isMicEnabled, isCamEnabled);
  };

  const displayTeacherName = teacherName || 'Teacher';

  return (
    <div className="min-h-screen w-screen bg-[#030712] text-white flex flex-col relative overflow-hidden font-sans select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[140px]" />
      </div>

      {/* Header bar */}
      <header className="h-16 w-full border-b border-white/5 flex items-center px-8 bg-[#030712]/40 backdrop-blur-md z-10 shrink-0">
        <span className="text-[#fff] text-sm font-semibold tracking-wider">
          OpenGrapes Live
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto flex flex-col items-center justify-center gap-8 p-8 lg:p-12 z-10 min-h-0">
        {/* Preview & Device Setup */}
        <div className="w-full flex flex-col items-center justify-center space-y-6 text-center min-h-0">
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#E2E8F0] mx-auto">
              Connecting you to{" "}
              <span className="text-[#6366F1] font-extrabold">
                {displayTeacherName}
              </span>
              's{" "}
              <span className="text-indigo-400 ">
                {roomName}
              </span>{" "}
              session
            </h1>
            <p className="text-sm text-foreground/50">
              Welcome, <span className="font-semibold text-white">{userName}</span>. Set up your devices before joining the class.
            </p>
          </div>

          {/* Self video feed box */}
          <div className="w-full max-w-xl md:max-w-2xl aspect-video rounded-2xl border border-white/10 bg-[#202124] shadow-2xl relative flex items-center justify-center overflow-hidden group">
            {!isCamEnabled ? (
              <div className="flex flex-col items-center justify-center text-foreground/20 space-y-3 p-6 select-none">
                <span className="text-2xl font-semibold text-foreground/60 font-sans">
                  Camera is off
                </span>
              </div>
            ) : errorMsg ? (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <svg
                  className="w-12 h-12 text-red-500/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"
                  />
                </svg>
                <span className="text-sm font-semibold text-red-400 max-w-xs">
                  {errorMsg}
                </span>
              </div>
            ) : !hasCamPermission ? (
              <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#6366F1] animate-pulse">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                    />
                  </svg>
                </div>
                <p className="text-base font-bold text-[#E2E8F0] leading-relaxed">
                  Allow permission to access microphone and camera
                </p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            )}
          </div>

          {/* Floating Controls Bar under the self video feed */}
          <div
            className="flex items-center gap-3 relative z-30"
            ref={settingsCardRef}
          >
            {/* Microphone Toggle Button */}
            <button
              onClick={() => setIsMicEnabled(!isMicEnabled)}
              className={`relative group w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                isMicEnabled
                  ? "bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
            >
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                xmlns="http://www.w3.org/2000/svg"
              >
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
                {!isMicEnabled && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18"
                  />
                )}
              </svg>
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1e2230]/95 backdrop-blur border border-white/10 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-75 scale-95 group-hover:scale-100 origin-bottom whitespace-nowrap shadow-xl z-50">
                {isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1e2230]/95" />
              </div>
            </button>

            {/* Camera Toggle Button */}
            <button
              onClick={() => setIsCamEnabled(!isCamEnabled)}
              className={`relative group w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                isCamEnabled
                  ? "bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
            >
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                xmlns="http://www.w3.org/2000/svg"
              >
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
                {!isCamEnabled && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18"
                  />
                )}
              </svg>
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1e2230]/95 backdrop-blur border border-white/10 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-75 scale-95 group-hover:scale-100 origin-bottom whitespace-nowrap shadow-xl z-50">
                {isCamEnabled ? "Turn Off Camera" : "Turn On Camera"}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1e2230]/95" />
              </div>
            </button>

            {/* Device Settings Toggle Button */}
            <button
              onClick={() => setShowDeviceSettings(!showDeviceSettings)}
              className={`relative group w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                showDeviceSettings
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]"
              }`}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992V12Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1e2230]/95 backdrop-blur border border-white/10 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-75 scale-95 group-hover:scale-100 origin-bottom whitespace-nowrap shadow-xl z-50">
                Device settings
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1e2230]/95" />
              </div>
            </button>

            {/* Dropdown Menu Card */}
            {showDeviceSettings && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-80 bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 text-left z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                    <svg
                      className="w-4 h-4 text-[#C2CCDE]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992V12Z"
                      />
                    </svg>
                    Device Settings
                  </div>
                  <button
                    onClick={() => setShowDeviceSettings(false)}
                    className="text-foreground/40 hover:text-white cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Microphone Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#C2CCDE]/40">
                    Microphone
                  </label>
                  <div className="relative">
                    <select
                      value={selectedAudioId}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                      className="w-full bg-[#161a26] border border-white/10 hover:border-white/20 text-white rounded-lg px-3 py-2 text-sm outline-none cursor-pointer focus:border-primary/50 transition-colors appearance-none pr-8"
                    >
                      {audioDevices.length === 0 ? (
                        <option value="">No microphones found</option>
                      ) : (
                        audioDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label ||
                              `Microphone ${device.deviceId.slice(0, 5)}`}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-[#C2CCDE]/50">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Camera Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#C2CCDE]/40">
                    Camera
                  </label>
                  <div className="relative">
                    <select
                      value={selectedVideoId}
                      onChange={(e) => setSelectedVideoId(e.target.value)}
                      className="w-full bg-[#161a26] border border-white/10 hover:border-white/20 text-white rounded-lg px-3 py-2 text-sm outline-none cursor-pointer focus:border-primary/50 transition-colors appearance-none pr-8"
                    >
                      {videoDevices.length === 0 ? (
                        <option value="">No cameras found</option>
                      ) : (
                        videoDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label ||
                              `Camera ${device.deviceId.slice(0, 5)}`}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-[#C2CCDE]/50">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Join class button right in the center */}
          <div className="w-full max-w-md pt-4 z-20">
            <button
              onClick={handleJoinClick}
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/40 cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <span>Join class</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
