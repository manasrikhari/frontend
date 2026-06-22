'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lock, LayoutGrid, Maximize2, Columns, Eye, Target } from 'lucide-react';
import Tooltip from './Tooltip';

interface DesktopControlsProps {
  roomName: string;
  isMicrophoneEnabled: boolean;
  toggleMicrophone: () => void;
  isCameraEnabled: boolean;
  toggleCamera: () => void;
  isScreenShareEnabled: boolean;
  toggleScreenShare: () => void;
  showWhiteboard: boolean;
  toggleWhiteboard: () => void;
  isTeacher: boolean;
  isExporting: boolean;
  handleEndClass: () => void;
  onLeave: () => void;
  exportedPdfUrl: string | null;
  activeRightPanelTab: 'chat' | 'participants' | null;
  setActiveRightPanelTab: (tab: 'chat' | 'participants' | null) => void;
  isWhiteboardAllowed?: boolean;
  isScreenShareAllowed?: boolean;
  layoutMode: 'auto' | 'tiled' | 'spotlight' | 'sidebar' | 'focus';
  setLayoutMode: (mode: 'auto' | 'tiled' | 'spotlight' | 'sidebar' | 'focus') => void;
  showSplitLayout: boolean;

  // Devices info passed from parent
  audioDevices: MediaDeviceInfo[];
  activeAudioId: string;
  setActiveAudioDevice: (id: string) => void;
  videoDevices: MediaDeviceInfo[];
  activeVideoId: string;
  setActiveVideoDevice: (id: string) => void;
}

export default function DesktopControls({
  roomName,
  isMicrophoneEnabled,
  toggleMicrophone,
  isCameraEnabled,
  toggleCamera,
  isScreenShareEnabled,
  toggleScreenShare,
  showWhiteboard,
  toggleWhiteboard,
  isTeacher,
  isExporting,
  handleEndClass,
  onLeave,
  exportedPdfUrl,
  activeRightPanelTab,
  setActiveRightPanelTab,
  isWhiteboardAllowed = true,
  isScreenShareAllowed = true,
  layoutMode,
  setLayoutMode,
  showSplitLayout,
  audioDevices,
  activeAudioId,
  setActiveAudioDevice,
  videoDevices,
  activeVideoId,
  setActiveVideoDevice,
}: DesktopControlsProps) {
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Determine the meeting start time from roomName or fallback to component mount time
  const startTime = useMemo(() => {
    const parts = roomName.split('-');
    if (parts.length >= 3) {
      const tsPart = parts.find((part) => /^\d{13}$/.test(part));
      if (tsPart) {
        const ts = parseInt(tsPart, 10);
        if (Date.now() - ts > 0 && Date.now() - ts < 24 * 60 * 60 * 1000) {
          return ts;
        }
      }
    }
    return Date.now();
  }, [roomName]);

  // Update meeting duration timer
  useEffect(() => {
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Formatter for elapsedSeconds to hh:mm:ss
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(event.target as Node)) {
        setShowLayoutMenu(false);
      }
    }
    if (showLayoutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLayoutMenu]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  useEffect(() => {
    if (!showDeviceSettings) {
      setShowDevices(false);
    }
  }, [showDeviceSettings]);

  return (
    <div className="w-full h-20 bg-[#090d1a]/95 border-t border-white/10 px-4 lg:px-6 py-4 flex items-center justify-between z-[999999] select-none transition-all duration-300 controls-bar relative translate-y-0 opacity-100">
      {/* Left side: Class details & time */}
      <div className="hidden md:flex flex-col min-w-[120px] lg:min-w-[200px]">
        <span className="font-bold text-sm text-white tracking-wider">OpenGrapes Live</span>
        <span className="text-xs text-[#C2CCDE]/50 font-semibold mt-0.5">
          {formatDuration(elapsedSeconds)}
        </span>
      </div>

      {/* Center side: Meeting controls */}
      <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
        {/* Microphone Toggle */}
        <Tooltip content={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}>
          <button
            onClick={toggleMicrophone}
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
              isMicrophoneEnabled
                ? 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
                : 'bg-red-600 hover:bg-red-500 text-white'
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
              {!isMicrophoneEnabled && (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              )}
            </svg>
          </button>
        </Tooltip>

        {/* Camera Toggle */}
        <Tooltip content={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}>
          <button
            onClick={toggleCamera}
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
              isCameraEnabled
                ? 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
                : 'bg-red-600 hover:bg-red-500 text-white'
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
              {!isCameraEnabled && <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />}
            </svg>
          </button>
        </Tooltip>

        {/* Screen Share Toggle */}
        <div className="hidden md:block">
          <Tooltip
            content={
              !isScreenShareAllowed
                ? 'Screen Sharing Disabled by Teacher'
                : isScreenShareEnabled
                ? 'Stop Screen Sharing'
                : 'Share Screen'
            }
          >
            <button
              disabled={!isScreenShareAllowed}
              onClick={toggleScreenShare}
              className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg relative ${
                !isScreenShareAllowed
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-40'
                  : isScreenShareEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                  : 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE] cursor-pointer'
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
                  d="M4.80001 4.87677C4.13727 4.87677 3.60001 5.41403 3.60001 6.07677V16.8768H9.63782C9.77103 17.3943 10.2409 17.7768 10.8 17.7768H13.2C13.7592 17.7768 14.229 17.3943 14.3622 16.8768H20.4V6.07677C20.4 5.41403 19.8628 4.87677 19.2 4.87677H4.80001Z"
                  fill="currentColor"
                  fillOpacity={isScreenShareEnabled ? 0.4 : 0.25}
                  stroke="none"
                />
                <path
                  d="M9.63782 16.8768H1.24566C1.22045 16.8768 1.20001 16.9224 1.20001 16.9224C1.20001 18.2227 2.25409 19.2768 3.55437 19.2768H20.4457C21.7459 19.2768 22.8 18.2227 22.8 16.9224C22.8 16.8972 22.7796 16.8768 22.7544 16.8768H14.3622C14.229 17.3943 13.7592 17.7768 13.2 17.7768H10.8C10.2409 17.7768 9.77103 17.3943 9.63782 16.8768Z"
                  fill="currentColor"
                  fillOpacity={isScreenShareEnabled ? 0.4 : 0.25}
                  stroke="none"
                />
                <path
                  d="M9.63782 16.8768H1.24566C1.22045 16.8768 1.20001 16.9224 1.20001 16.9224C1.20001 18.2227 2.25409 19.2768 3.55437 19.2768H20.4457C21.7459 19.2768 22.8 18.2227 22.8 16.9224C22.8 16.8972 22.7796 16.8768 22.7544 16.8768H14.3622C14.229 17.3943 13.7592 17.7768 13.2 17.7768H10.8C10.2409 17.7768 9.77103 17.3943 9.63782 16.8768H20.4V6.07677C20.4 5.41403 19.8628 4.87677 19.2 4.87677H4.80001C4.13727 4.87677 3.60001 5.41403 3.60001 6.07677V16.8768H9.63782"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 7.38614V9.5968M12 9.6V13.05M9.60001 9.6L11.6818 7.5182C11.8575 7.34247 12.1425 7.34247 12.3182 7.5182L14.4 9.6M9.60001 14.25H14.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {!isScreenShareAllowed && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white border border-[#090d1a] shadow-md z-10">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Whiteboard Toggle */}
        <div className="hidden md:block">
          <Tooltip
            content={
              showWhiteboard
                ? !isWhiteboardAllowed
                  ? 'Close Whiteboard (Read-Only)'
                  : 'Close Collaborative Whiteboard'
                : !isWhiteboardAllowed
                ? 'Open Whiteboard (Read-Only)'
                : 'Open Collaborative Whiteboard'
            }
          >
            <button
              onClick={toggleWhiteboard}
              className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg relative cursor-pointer ${
                showWhiteboard
                  ? 'bg-primary hover:bg-primary-hover text-white'
                  : 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
              }`}
            >
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 25"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1.5 5.4001C1.5 4.73732 2.03733 4.20004 2.70011 4.2001L21.3001 4.20185C21.9628 4.20191 22.5 4.73915 22.5 5.40185V16.2C22.5 16.8627 21.9627 17.4 21.3 17.4H2.7C2.03726 17.4 1.5 16.8627 1.5 16.2L1.5 5.4001Z"
                  fill="currentColor"
                  fillOpacity={0.25}
                  stroke="none"
                />
                <path
                  d="M12 19.8H18.3M12 19.8H5.7M12 19.8V17.4M1.5 16.2L1.5 5.4001C1.5 4.73732 2.03733 4.20004 2.70011 4.2001L21.3001 4.20185C21.9628 4.20191 22.5 4.73915 22.5 5.40185V16.2C22.5 16.8627 21.9627 17.4 21.3 17.4H2.7C2.03726 17.4 1.5 16.8627 1.5 16.2Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <g filter="url(#filter0_d_5_489)">
                  <path
                    d="M12.8077 6.46792C13.4209 5.67466 14.5913 5.60007 15.3003 6.30905C16.0092 7.01795 15.9347 8.18816 15.1416 8.80146L11.3602 11.7258C11.2889 11.7809 11.1879 11.7744 11.1242 11.7108L9.89915 10.4857C9.83548 10.422 9.82904 10.321 9.88411 10.2497L12.8077 6.46792Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M11.8477 11.0978L10.5112 9.76138" strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    d="M9.90984 10.4964L11.1126 11.6992C11.1544 11.741 11.1725 11.8008 11.1609 11.8587L11.0203 12.5617C10.9123 13.1017 10.5201 13.5407 9.99563 13.7085L7.77427 14.4193C7.60846 14.4724 7.4269 14.4284 7.3038 14.3053C7.18069 14.1821 7.13668 14.0006 7.18974 13.8348L7.90057 11.6134C8.06839 11.089 8.50736 10.6967 9.04731 10.5887L9.75035 10.4481C9.80824 10.4366 9.86809 10.4547 9.90984 10.4964Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M7.3038 14.3052L9.04117 12.5679" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    d="M8.94331 12.2028C8.868 12.4838 9.1252 12.741 9.40627 12.6657V12.6657C9.68734 12.5904 9.78148 12.2391 9.57572 12.0333V12.0333C9.36996 11.8276 9.01863 11.9217 8.94331 12.2028V12.2028Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.04752 15.84H9.09634C9.38875 15.84 9.67211 15.7386 9.89813 15.5531L10.4936 15.0644C10.6135 14.9659 10.7863 14.9659 10.9063 15.0644L11.5024 15.5537C11.728 15.7388 12.0108 15.84 12.3026 15.84H12.4144C12.8797 15.84 13.2948 15.5478 13.4519 15.1099L14.4046 12.4537C14.4332 12.3742 14.5456 12.3742 14.5741 12.4537L15.3899 14.7281C15.6292 15.3951 16.2614 15.84 16.97 15.84H17.1275"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <filter
                    id="filter0_d_5_489"
                    x="1.70001"
                    y="4.5"
                    width="20.6"
                    height="20.6"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood floodOpacity={0} result="BackgroundImageFix" />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feOffset dy={4} />
                    <feGaussianBlur stdDeviation={2} />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_5_489" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_5_489" result="shape" />
                  </filter>
                </defs>
              </svg>
              {!isWhiteboardAllowed && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center text-white border border-[#090d1a] shadow-md z-10">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Adjust View Toggle Button */}
        <div ref={layoutMenuRef} className="relative">
          <Tooltip content="Adjust view">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className={`relative group w-10 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                showLayoutMenu
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#ffffff]'
              }`}
            >
              <LayoutGrid className="w-5.5 h-5.5" />
            </button>
          </Tooltip>

          {/* Adjust View Dropdown Menu */}
          {showLayoutMenu && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 text-[#C2CCDE] z-[999999] animate-in fade-in slide-in-from-bottom-2 duration-150 font-sans">
              <div className="px-3 py-2 border-b border-white/5 select-none text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-[#C2CCDE]/40">Adjust view</span>
              </div>

              <button
                onClick={() => {
                  setLayoutMode('auto');
                  setShowLayoutMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none ${
                  layoutMode === 'auto' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[#C2CCDE]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>Auto (dynamic)</span>
                    <span className="text-[10px] text-[#C2CCDE]/50 font-normal">Adapts to active content</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setLayoutMode('tiled');
                  setShowLayoutMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none ${
                  layoutMode === 'tiled' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[#C2CCDE]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>Tiled</span>
                    <span className="text-[10px] text-[#C2CCDE]/50 font-normal">All participants in grid</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setLayoutMode('spotlight');
                  setShowLayoutMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none ${
                  layoutMode === 'spotlight' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[#C2CCDE]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Maximize2 className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>Spotlight</span>
                    <span className="text-[10px] text-[#C2CCDE]/50 font-normal">Focus on featured tile</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setLayoutMode('sidebar');
                  setShowLayoutMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none ${
                  layoutMode === 'sidebar' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[#C2CCDE]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Columns className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>Sidebar</span>
                    <span className="text-[10px] text-[#C2CCDE]/50 font-normal">
                      Featured center with side list
                    </span>
                  </div>
                </div>
              </button>

              <button
                disabled={!showSplitLayout}
                onClick={() => {
                  if (showSplitLayout) {
                    setLayoutMode('focus');
                    setShowLayoutMenu(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left text-sm font-semibold select-none ${
                  !showSplitLayout
                    ? 'opacity-40 cursor-not-allowed text-[#C2CCDE]/50'
                    : layoutMode === 'focus'
                    ? 'text-indigo-400 bg-indigo-500/10 cursor-pointer'
                    : 'text-[#C2CCDE] cursor-pointer'
                }`}
                title={!showSplitLayout ? 'Focus View (Only available during presentations)' : ''}
              >
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>Focus View</span>
                    <span className="text-[10px] text-[#C2CCDE]/50 font-normal">
                      Whiteboard/screen share only
                    </span>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Settings gear with sub-menu for device outputs */}
        <div ref={menuRef} className="relative">
          <Tooltip content="Settings / Devices">
            <button
              onClick={() => setShowDeviceSettings(!showDeviceSettings)}
              className={`w-10 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                showDeviceSettings
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
              }`}
            >
              <svg
                className="w-5.5 h-5.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </Tooltip>

          {/* Devices Settings Menu */}
          {showDeviceSettings && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-72 bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 text-[#C2CCDE] z-[999999] animate-in fade-in slide-in-from-bottom-2 duration-150 font-sans">
              <div className="px-3.5 py-2 border-b border-white/5 flex items-center justify-between select-none">
                <span className="text-xs font-bold uppercase tracking-wider text-[#C2CCDE]/40">Settings</span>
                {isTeacher && (
                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase select-none">
                    Teacher Mode
                  </span>
                )}
              </div>

              {/* Audio Source Select */}
              <div className="px-3.5 py-2 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-[#C2CCDE]/45 uppercase select-none text-left">
                  Microphone Source
                </span>
                <select
                  value={activeAudioId}
                  onChange={(e) => setActiveAudioDevice(e.target.value)}
                  className="w-full bg-[#161a26] border border-white/10 hover:border-white/20 text-white rounded-lg px-2.5 py-2 text-xs outline-none cursor-pointer focus:border-primary/50 transition-colors appearance-none font-sans font-semibold pr-8"
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Source Select */}
              <div className="px-3.5 py-2 flex flex-col gap-1.5 border-b border-white/5 pb-3">
                <span className="text-[10px] font-bold text-[#C2CCDE]/45 uppercase select-none text-left">
                  Camera Source
                </span>
                <select
                  value={activeVideoId}
                  onChange={(e) => setActiveVideoDevice(e.target.value)}
                  className="w-full bg-[#161a26] border border-white/10 hover:border-white/20 text-white rounded-lg px-2.5 py-2 text-xs outline-none cursor-pointer focus:border-primary/50 transition-colors appearance-none font-sans font-semibold pr-8"
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* PDF export buttons for Teachers */}
              {isTeacher && (
                <div className="px-1 py-1">
                  {exportedPdfUrl ? (
                    <a
                      href={exportedPdfUrl}
                      download={`${roomName}_notes.pdf`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors cursor-pointer"
                    >
                      Download Board PDF
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        handleEndClass();
                        setShowDeviceSettings(false);
                      }}
                      disabled={isExporting}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors cursor-pointer"
                    >
                      Export Board to PDF
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* End Call / Leave Button */}
        <Tooltip content={isTeacher ? 'End class session' : 'Leave classroom'}>
          <button
            onClick={onLeave}
            className="w-16 h-12 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors duration-200 cursor-pointer shadow-lg"
          >
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.8 12H19.2M4.8 12C4.8 7.2 8.4 3.6 12 3.6M4.8 12C4.8 16.8 8.4 20.4 12 20.4M19.2 12C19.2 7.2 15.6 3.6 12 3.6M19.2 12C19.2 16.8 15.6 20.4 12 20.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M7.2 15.6L4.8 12L7.2 8.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Tooltip>
      </div>

      {/* Right side: Sidebar toggles */}
      <div className="hidden md:flex items-center gap-3 min-w-[120px] lg:min-w-[200px] justify-end">
        {/* Chat Toggle */}
        <Tooltip content={activeRightPanelTab === 'chat' ? 'Hide Chat' : 'Show Chat'} align="right">
          <button
            onClick={() => setActiveRightPanelTab(activeRightPanelTab === 'chat' ? null : 'chat')}
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md ${
              activeRightPanelTab === 'chat'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
            }`}
          >
            <svg
              className="w-8 h-8"
              viewBox="0 0 85 77"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 21L56 21"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M24 43H56"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M31 32H63"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M26.5625 11.55C18.9341 11.55 12.75 17.152 12.75 24.0625V41.3875C12.75 47.9741 18.368 53.372 25.5 53.8635V65.45L42.5 53.9H58.4375C66.0659 53.9 72.25 48.2979 72.25 41.3875V24.0625C72.25 17.152 66.0659 11.55 58.4375 11.55H26.5625Z"
                fill="currentColor"
                fillOpacity={activeRightPanelTab === 'chat' ? 0.4 : 0.25}
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </Tooltip>

        {/* Participants Toggle */}
        <Tooltip
          content={activeRightPanelTab === 'participants' ? 'Hide Participants' : 'Show Participants'}
          align="right"
        >
          <button
            onClick={() =>
              setActiveRightPanelTab(activeRightPanelTab === 'participants' ? null : 'participants')
            }
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md ${
              activeRightPanelTab === 'participants'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]'
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
                d="M7.49006 11.7919C7.37766 12.3267 7.03202 12.7833 6.54775 13.0366C6.01672 13.3143 5.38333 13.3143 4.8523 13.0366C4.36803 12.7833 4.02239 12.3267 3.90999 11.7919L3.87102 11.6065C3.75534 11.0561 3.87948 10.4824 4.21238 10.029L4.27549 9.94309C4.60846 9.48962 5.13744 9.22178 5.70002 9.22178C6.26261 9.22178 6.79158 9.48962 7.12456 9.94309L7.18767 10.029C7.52057 10.4824 7.64471 11.0561 7.52903 11.6065L7.49006 11.7919Z"
                fill="currentColor"
                fillOpacity={activeRightPanelTab === 'participants' ? 0.4 : 0.25}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2.40002 16.8399C2.40002 17.1492 2.65075 17.3999 2.96003 17.3999H6.39322C6.61397 16.4192 7.21453 15.5619 8.06255 15.0195C7.90992 14.9106 7.74197 14.8199 7.56123 14.7509L7.43468 14.7026C6.31753 14.2763 5.08252 14.2763 3.96537 14.7026L3.83882 14.7509C2.97243 15.0815 2.40002 15.9126 2.40002 16.8399Z"
                fill="currentColor"
                fillOpacity={activeRightPanelTab === 'participants' ? 0.4 : 0.25}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21.04 17.4H17.6068C17.3861 16.4193 16.7856 15.5619 15.9375 15.0195C16.0902 14.9107 16.2581 14.8199 16.4388 14.7509L16.5654 14.7027C17.6825 14.2763 18.9175 14.2763 20.0347 14.7027L20.1612 14.7509C21.0276 15.0816 21.6 15.9127 21.6 16.84C21.6 17.1493 21.3493 17.4 21.04 17.4Z"
                fill="currentColor"
                fillOpacity={activeRightPanelTab === 'participants' ? 0.4 : 0.25}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.51 11.792C16.6224 12.3268 16.968 12.7834 17.4523 13.0366C17.9833 13.3144 18.6167 13.3144 19.1478 13.0366C19.632 12.7834 19.9777 12.3268 20.0901 11.792L20.129 11.6066C20.2447 11.0561 20.1206 10.4825 19.7877 10.0291L19.7246 9.94316C19.3916 9.48969 18.8626 9.22184 18.3 9.22184C17.7374 9.22184 17.2085 9.48969 16.8755 9.94316L16.8124 10.0291C16.4795 10.4825 16.3553 11.0561 16.471 11.6066L16.51 11.792Z"
                fill="currentColor"
                fillOpacity={activeRightPanelTab === 'participants' ? 0.4 : 0.25}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.74 19.2H7.26003C6.72983 19.2 6.30002 18.7702 6.30002 18.24C6.30002 16.651 7.28292 15.2277 8.76888 14.6649L9.01835 14.5705C10.9395 13.8428 13.0605 13.8428 14.9817 14.5705L15.2312 14.6649C16.7171 15.2277 17.7 16.651 17.7 18.24C17.7 18.7702 17.2702 19.2 16.74 19.2Z"
                fill="currentColor"
                fillOpacity={activeRightPanelTab === 'participants' ? 0.4 : 0.25}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.5424 11.7234C11.4563 12.1977 12.5438 12.1977 13.4576 11.7234C14.2981 11.2871 14.899 10.4972 15.0952 9.57076L15.1566 9.2808C15.3579 8.32986 15.1423 7.33822 14.5642 6.55681L14.4651 6.42288C13.8868 5.64132 12.9722 5.18028 12 5.18028C11.0278 5.18028 10.1132 5.64132 9.53498 6.42288L9.4359 6.55681C8.85778 7.33822 8.64211 8.32986 8.84347 9.2808L8.90487 9.57076C9.10104 10.4972 9.70191 11.2871 10.5424 11.7234Z"
                fill="currentColor"
                fillOpacity={activeRightPanelTab === 'participants' ? 0.4 : 0.25}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
