'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMediaDeviceSelect } from '@livekit/components-react';
import { Lock, LayoutGrid, Maximize2, Columns, Eye, Target } from 'lucide-react';
import Tooltip from './Tooltip';

interface ControlsProps {
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
}

export default function Controls({
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
}: ControlsProps) {
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);

  // Close layout menu when clicking outside
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

  // Live system clock update
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setTimeStr(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Retrieve audio devices (microphones)
  const {
    devices: audioDevices,
    activeDeviceId: activeAudioId,
    setActiveMediaDevice: setActiveAudioDevice,
  } = useMediaDeviceSelect({ kind: 'audioinput', requestPermissions: true });

  // Retrieve video devices (cameras)
  const {
    devices: videoDevices,
    activeDeviceId: activeVideoId,
    setActiveMediaDevice: setActiveVideoDevice,
  } = useMediaDeviceSelect({ kind: 'videoinput', requestPermissions: true });

  // Close menu when clicking outside
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

  // Reset device sub-menu state when settings menu closes
  useEffect(() => {
    if (!showDeviceSettings) {
      setShowDevices(false);
    }
  }, [showDeviceSettings]);

  return (
    <div className="w-full h-20 bg-[#090d1a]/95 border-t border-white/10 px-6 py-4 flex items-center justify-between relative z-[999999] select-none">
      {/* Left side: Class details & time */}
      <div className="flex flex-col min-w-[200px]">
        <span className="font-bold text-sm text-white uppercase tracking-wider">
          {roomName}
        </span>
        <span className="text-xs text-[#C2CCDE]/50 font-semibold mt-0.5">
          {timeStr}
        </span>
      </div>

      {/* Center side: Meeting controls */}
      <div className="flex items-center gap-3">
        {/* Microphone Toggle */}
        <Tooltip
          content={
            isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"
          }
        >
          <button
            onClick={toggleMicrophone}
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
              isMicrophoneEnabled
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
              {!isMicrophoneEnabled && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3l18 18"
                />
              )}
            </svg>
          </button>
        </Tooltip>

        {/* Camera Toggle */}
        <Tooltip
          content={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          <button
            onClick={toggleCamera}
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
              isCameraEnabled
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
              {!isCameraEnabled && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3l18 18"
                />
              )}
            </svg>
          </button>
        </Tooltip>

        {/* Screen Share Toggle */}
        <Tooltip
          content={
            !isScreenShareAllowed
              ? "Screen Share Locked (Requires Teacher Permission)"
              : isScreenShareEnabled
              ? "Stop Screen Share"
              : "Share Screen"
          }
        >
          <button
            disabled={!isScreenShareAllowed}
            onClick={toggleScreenShare}
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg relative ${
              !isScreenShareAllowed
                ? "bg-zinc-800/40 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50"
                : isScreenShareEnabled
                ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                : "bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE] cursor-pointer"
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
                fillOpacity={0.25}
                stroke="none"
              />
              <path
                d="M9.63782 16.8768H1.24566C1.22045 16.8768 1.20001 16.8972 1.20001 16.9224C1.20001 18.2227 2.25409 19.2768 3.55437 19.2768H20.4457C21.7459 19.2768 22.8 18.2227 22.8 16.9224C22.8 16.8972 22.7796 16.8768 22.7544 16.8768H14.3622C14.229 17.3943 13.7592 17.7768 13.2 17.7768H10.8C10.2409 17.7768 9.77103 17.3943 9.63782 16.8768Z"
                fill="currentColor"
                fillOpacity={0.25}
                stroke="none"
              />
              <path
                d="M9.63782 16.8768H1.24566C1.22045 16.8768 1.20001 16.8972 1.20001 16.9224C1.20001 18.2227 2.25409 19.2768 3.55437 19.2768H20.4457C21.7459 19.2768 22.8 18.2227 22.8 16.9224C22.8 16.8972 22.7796 16.8768 22.7544 16.8768H14.3622C14.229 17.3943 13.7592 17.7768 13.2 17.7768H10.8C10.2409 17.7768 9.77103 17.3943 9.63782 16.8768H20.4V6.07677C20.4 5.41403 19.8628 4.87677 19.2 4.87677H4.80001C4.13727 4.87677 3.60001 5.41403 3.60001 6.07677V16.8768H9.63782"
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

        {/* Whiteboard Toggle */}
        <Tooltip
          content={
            showWhiteboard
              ? !isWhiteboardAllowed
                ? "Close Whiteboard (Read-Only)"
                : "Close Collaborative Whiteboard"
              : !isWhiteboardAllowed
              ? "Open Whiteboard (Read-Only)"
              : "Open Collaborative Whiteboard"
          }
        >
          <button
            onClick={toggleWhiteboard}
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg relative cursor-pointer ${
              showWhiteboard
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]"
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
                <path
                  d="M11.8477 11.0978L10.5112 9.76138"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.90984 10.4964L11.1126 11.6992C11.1544 11.741 11.1725 11.8008 11.1609 11.8587L11.0203 12.5617C10.9123 13.1017 10.5201 13.5407 9.99563 13.7085L7.77427 14.4193C7.60846 14.4724 7.4269 14.4284 7.3038 14.3053C7.18069 14.1821 7.13668 14.0006 7.18974 13.8348L7.90057 11.6134C8.06839 11.089 8.50736 10.6967 9.04731 10.5887L9.75035 10.4481C9.80824 10.4366 9.86809 10.4547 9.90984 10.4964Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.3038 14.3052L9.04117 12.5679"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                  />
                  <feBlend
                    mode="normal"
                    in2="BackgroundImageFix"
                    result="effect1_dropShadow_5_489"
                  />
                  <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="effect1_dropShadow_5_489"
                    result="shape"
                  />
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

        {/* Adjust View Toggle Button */}
        <div ref={layoutMenuRef} className="relative">
          <Tooltip content="Adjust view">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className={`relative group w-10 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                showLayoutMenu
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "bg-[#2d3139] hover:bg-[#3b3e45] text-[#ffffff]"
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
                    <span className="text-[10px] text-[#C2CCDE]/50 font-normal">Featured center with side list</span>
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
                title={!showSplitLayout ? "Focus View (Only available during presentations)" : ""}
              >
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>Focus View</span>
                    <span className="text-[10px] text-[#C2CCDE]/50 font-normal">Whiteboard/screen share only</span>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Settings Toggle Button (Ellipsis icon) */}
        <div ref={menuRef} className="relative">
          <Tooltip content="Settings">
            <button
              onClick={() => setShowDeviceSettings(!showDeviceSettings)}
              className={`relative group w-10 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
                showDeviceSettings
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "bg-[#2d3139] hover:bg-[#3b3e45] text-[#ffffff]"
              }`}
            >
              <svg
                className="w-8 h-8"
                viewBox="0 0 80 80"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M36 22C36 20.8954 36.8954 20 38 20H42C43.1046 20 44 20.8954 44 22V26C44 27.1046 43.1046 28 42 28H38C36.8954 28 36 27.1046 36 26V22Z"
                  fill="currentColor"
                  fillOpacity={0.25}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M36 38C36 36.8954 36.8954 36 38 36H42C43.1046 36 44 36.8954 44 38V42C44 43.1046 43.1046 44 42 44H38C36.8954 44 36 43.1046 36 42V38Z"
                  fill="currentColor"
                  fillOpacity={0.25}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M36 54C36 52.8954 36.8954 52 38 52H42C43.1046 52 44 52.8954 44 54V58C44 59.1046 43.1046 60 42 60H38C36.8954 60 36 59.1046 36 58V54Z"
                  fill="currentColor"
                  fillOpacity={0.25}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </Tooltip>

          {/* Dropdown Settings Menu */}
          {showDeviceSettings && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-72 bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 text-[#C2CCDE] z-[999999] animate-in fade-in slide-in-from-bottom-2 duration-150">
              {/* 1st Option: Device Settings */}
              <div className="flex flex-col">
                <button
                  onClick={() => setShowDevices(!showDevices)}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none text-[#C2CCDE]"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-[#C2CCDE]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M9.90705 4.26083C9.92771 4.00148 10.1128 3.78282 10.3687 3.73596C11.3596 3.55454 12.376 3.55465 13.3669 3.73627C13.6228 3.78317 13.8078 4.00181 13.8285 4.26112L13.9398 5.65808C13.9585 5.89328 14.1144 6.09328 14.3312 6.18654C14.5539 6.28236 14.7723 6.39175 14.9853 6.51472C15.1984 6.63775 15.4025 6.77231 15.5969 6.91735C15.786 7.05845 16.0372 7.0935 16.2503 6.99212L17.515 6.39035C17.75 6.27856 18.0319 6.32955 18.2004 6.52778C18.853 7.29531 19.3611 8.17569 19.6992 9.12473C19.7865 9.36976 19.6896 9.63931 19.4754 9.78684L18.3221 10.5811C18.1278 10.7149 18.0326 10.9499 18.0602 11.1843C18.0885 11.425 18.103 11.6688 18.103 11.9147C18.103 12.1607 18.0885 12.4047 18.0601 12.6455C18.0325 12.8799 18.1277 13.1149 18.3221 13.2488L19.4748 14.0426C19.689 14.1901 19.7858 14.4598 19.6985 14.7048C19.3601 15.6538 18.8518 16.5341 18.199 17.3016C18.0304 17.4997 17.7486 17.5506 17.5137 17.4389L16.2499 16.8376C16.0369 16.7362 15.7857 16.7712 15.5966 16.9123C15.4023 17.0573 15.1983 17.1918 14.9853 17.3147C14.7723 17.4377 14.5539 17.5471 14.3312 17.6429C14.1145 17.7361 13.9585 17.9361 13.9398 18.1714L13.8287 19.5665C13.808 19.8258 13.623 20.0444 13.3671 20.0913C12.3761 20.273 11.3596 20.2731 10.3685 20.0916C10.1126 20.0448 9.92753 19.8261 9.90687 19.5668L9.79572 18.1715C9.77699 17.9363 9.62104 17.7362 9.40429 17.643C9.18151 17.5472 8.96299 17.4377 8.74993 17.3147C8.53698 17.1918 8.33306 17.0573 8.13876 16.9124C7.94963 16.7713 7.69846 16.7363 7.4854 16.8377L6.22074 17.4394C5.98586 17.5512 5.70401 17.5002 5.53545 17.3021C4.88262 16.5348 4.37423 15.6546 4.03581 14.7058C3.9484 14.4607 4.04522 14.191 4.2595 14.0435L5.41319 13.2489C5.60753 13.1151 5.70277 12.88 5.67514 12.6457C5.64674 12.4048 5.63224 12.1608 5.63224 11.9147C5.63224 11.6688 5.64673 11.4249 5.6751 11.1841C5.70271 10.9498 5.60747 10.7147 5.41314 10.5809L4.25886 9.78598C4.04462 9.63843 3.9478 9.36885 4.03512 9.12381C4.37329 8.17489 4.88142 7.29463 5.53401 6.52721C5.70254 6.32901 5.98446 6.27804 6.21939 6.38982L7.48506 6.99204C7.69813 7.09342 7.94931 7.05837 8.13844 6.91728C8.33284 6.77227 8.53687 6.63773 8.74993 6.51472C8.963 6.3917 9.18154 6.28227 9.40432 6.18643C9.62108 6.09318 9.77702 5.89318 9.79576 5.65796L9.90705 4.26083ZM13.4264 9.21482C12.4617 8.6579 11.2733 8.6579 10.3087 9.21482C9.34405 9.77175 8.74983 10.801 8.74983 11.9148C8.74983 13.0287 9.34405 14.0579 10.3087 14.6148C11.2733 15.1717 12.4617 15.1717 13.4264 14.6148C14.391 14.0579 14.9852 13.0287 14.9852 11.9148C14.9852 10.801 14.391 9.77175 13.4264 9.21482Z"
                        fill="currentColor"
                        fillOpacity={0.25}
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Device Settings</span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showDevices ? "rotate-180" : ""}`}
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
                </button>

                {showDevices && (
                  <div className="mx-2 mb-2 p-3.5 flex flex-col gap-3.5 border-t border-white/5 pt-3 bg-black/20 rounded-xl">
                    {/* Microphone selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#C2CCDE]/50 flex items-center gap-1.5 select-none font-sans">
                        Microphone
                      </label>
                      <div className="relative">
                        <select
                          value={activeAudioId}
                          onChange={(e) => setActiveAudioDevice(e.target.value)}
                          className="w-full bg-[#161a26] border border-white/10 hover:border-white/20 text-white rounded-lg px-3 py-2.5 text-sm outline-none cursor-pointer focus:border-primary/50 transition-colors appearance-none pr-8 font-sans"
                        >
                          {audioDevices.length === 0 ? (
                            <option value="">No microphones found</option>
                          ) : (
                            audioDevices.map((device) => (
                              <option
                                key={device.deviceId}
                                value={device.deviceId}
                              >
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

                    {/* Camera selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#C2CCDE]/50 flex items-center gap-1.5 select-none font-sans">
                        Camera
                      </label>
                      <div className="relative">
                        <select
                          value={activeVideoId}
                          onChange={(e) => setActiveVideoDevice(e.target.value)}
                          className="w-full bg-[#161a26] border border-white/10 hover:border-white/20 text-white rounded-lg px-3 py-2.5 text-sm outline-none cursor-pointer focus:border-primary/50 transition-colors appearance-none pr-8 font-sans"
                        >
                          {videoDevices.length === 0 ? (
                            <option value="">No cameras found</option>
                          ) : (
                            videoDevices.map((device) => (
                              <option
                                key={device.deviceId}
                                value={device.deviceId}
                              >
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

              {/* 2nd Option: Publish Notes (Visible to Teacher) */}
              {isTeacher && (
                <button
                  onClick={handleEndClass}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none text-[#C2CCDE] disabled:opacity-40 disabled:cursor-not-allowed font-sans"
                >
                  {isExporting ? (
                    <>
                      <svg
                        className="w-5 h-5 animate-spin text-[#C2CCDE]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth={4}
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 text-[#C2CCDE]"
                        viewBox="0 0 80 80"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19 16C19 13.7909 20.7909 12 23 12H59C61.2091 12 63 13.7909 63 16V64C63 66.2091 61.2091 68 59 68H23C20.7909 68 19 66.2091 19 64V16Z"
                          fill="currentColor"
                          fillOpacity={0.25}
                          stroke="none"
                        />
                        <path
                          d="M29 24H53M29 32H45M29 40H53M29 48H45M29 56H53M21 28H17M21 20H17M21 36H17M21 52H17M21 60H17M21 44H17M23 68H59C61.2091 68 63 66.2091 63 64V16C63 13.7909 61.2091 12 59 12H23C20.7909 12 19 13.7909 19 16V64C19 66.2091 20.7909 68 23 68Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>Publish Notes</span>
                    </>
                  )}
                </button>
              )}

              {/* 3rd Option: Download Notes (Only visible when exportedPdfUrl is set) */}
              {exportedPdfUrl && (
                <button
                  onClick={() => {
                    window.open(exportedPdfUrl, "_blank");
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none text-[#C2CCDE] font-sans"
                >
                  <svg
                    className="w-5 h-5 text-[#C2CCDE] rotate-180"
                    viewBox="0 0 80 80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M48 44H56.4013C59.5401 44 61.0823 40.1787 58.8229 38L43.8005 23.5141C41.7667 21.553 38.5458 21.553 36.512 23.5141L21.4896 38C19.2302 40.1787 20.7724 44 23.9112 44H32L32 62C32 63.1046 32.8954 64 34 64H46C47.1046 64 48 63.1046 48 62V44Z"
                      fill="currentColor"
                      fillOpacity={0.25}
                      stroke="none"
                    />
                    <path
                      d="M16 30L16 16C16 13.7909 17.7909 12 20 12L60 12C62.2091 12 64 13.7909 64 16V30M56.4013 44H48V62C48 63.1046 47.1046 64 46 64H34C32.8954 64 32 63.1046 32 62L32 44H23.9112C20.7724 44 19.2302 40.1787 21.4896 38L36.512 23.5141C38.5458 21.553 41.7667 21.553 43.8005 23.5141L58.8229 38C61.0823 40.1787 59.5401 44 56.4013 44Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Download Notes</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Leave Room / Hangup Button */}
        <Tooltip content="Leave Room">
          <button
            onClick={onLeave}
            className="relative group w-15 h-12 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg"
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
                d="M16.2426 14.7441C16.1035 14.6935 15.9638 14.6454 15.8234 14.5999C15.2443 14.4123 14.9034 13.7877 15.1171 13.2177C15.4113 12.4332 14.8314 11.5964 13.9935 11.5964H10.2567C9.4189 11.5964 8.83896 12.4332 9.13315 13.2177C9.33571 13.7579 9.0062 14.349 8.4534 14.514C8.2199 14.5836 7.98794 14.6604 7.75785 14.7441C7.29867 14.9112 6.85182 15.1046 6.4192 15.3225C5.7059 15.6819 4.79793 15.3721 4.55111 14.6125L3.90067 12.6106C3.79359 12.2811 3.8866 11.9171 4.15205 11.6944C6.38599 9.81989 9.20895 8.79242 12.1251 8.79242C15.0413 8.79242 17.8643 9.81989 20.0982 11.6944C20.3639 11.9173 20.4569 12.2815 20.3498 12.6113L19.664 14.7218C19.4141 15.4909 18.488 15.7971 17.7722 15.4208C17.2805 15.1623 16.7697 14.9359 16.2426 14.7441Z"
                fill="currentColor"
                fillOpacity={0.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </Tooltip>
      </div>

      {/* Right side: Sidebar toggles */}
      <div className="flex items-center gap-3 min-w-[200px] justify-end">
        {/* Chat Toggle */}
        <Tooltip
          content={activeRightPanelTab === "chat" ? "Hide Chat" : "Show Chat"}
          align="right"
        >
          <button
            onClick={() =>
              setActiveRightPanelTab(
                activeRightPanelTab === "chat" ? null : "chat",
              )
            }
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md ${
              activeRightPanelTab === "chat"
                ? "bg-primary text-white shadow-lg"
                : "bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]"
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
                fillOpacity={activeRightPanelTab === "chat" ? 0.4 : 0.25}
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
          content={
            activeRightPanelTab === "participants"
              ? "Hide Participants"
              : "Show Participants"
          }
          align="right"
        >
          <button
            onClick={() =>
              setActiveRightPanelTab(
                activeRightPanelTab === "participants" ? null : "participants",
              )
            }
            className={`w-15 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md ${
              activeRightPanelTab === "participants"
                ? "bg-primary text-white shadow-lg"
                : "bg-[#2d3139] hover:bg-[#3b3e45] text-[#C2CCDE]"
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
                fillOpacity={
                  activeRightPanelTab === "participants" ? 0.4 : 0.25
                }
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2.40002 16.8399C2.40002 17.1492 2.65075 17.3999 2.96003 17.3999H6.39322C6.61397 16.4192 7.21453 15.5619 8.06255 15.0195C7.90992 14.9106 7.74197 14.8199 7.56123 14.7509L7.43468 14.7026C6.31753 14.2763 5.08252 14.2763 3.96537 14.7026L3.83882 14.7509C2.97243 15.0815 2.40002 15.9126 2.40002 16.8399Z"
                fill="currentColor"
                fillOpacity={
                  activeRightPanelTab === "participants" ? 0.4 : 0.25
                }
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21.04 17.4H17.6068C17.3861 16.4193 16.7856 15.5619 15.9375 15.0195C16.0902 14.9107 16.2581 14.8199 16.4388 14.7509L16.5654 14.7027C17.6825 14.2763 18.9175 14.2763 20.0347 14.7027L20.1612 14.7509C21.0276 15.0816 21.6 15.9127 21.6 16.84C21.6 17.1493 21.3493 17.4 21.04 17.4Z"
                fill="currentColor"
                fillOpacity={
                  activeRightPanelTab === "participants" ? 0.4 : 0.25
                }
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.51 11.792C16.6224 12.3268 16.968 12.7834 17.4523 13.0366C17.9833 13.3144 18.6167 13.3144 19.1478 13.0366C19.632 12.7834 19.9777 12.3268 20.0901 11.792L20.129 11.6066C20.2447 11.0561 20.1206 10.4825 19.7877 10.0291L19.7246 9.94316C19.3916 9.48969 18.8626 9.22184 18.3 9.22184C17.7374 9.22184 17.2085 9.48969 16.8755 9.94316L16.8124 10.0291C16.4795 10.4825 16.3553 11.0561 16.471 11.6066L16.51 11.792Z"
                fill="currentColor"
                fillOpacity={
                  activeRightPanelTab === "participants" ? 0.4 : 0.25
                }
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.74 19.2H7.26003C6.72983 19.2 6.30002 18.7702 6.30002 18.24C6.30002 16.651 7.28292 15.2277 8.76888 14.6649L9.01835 14.5705C10.9395 13.8428 13.0605 13.8428 14.9817 14.5705L15.2312 14.6649C16.7171 15.2277 17.7 16.651 17.7 18.24C17.7 18.7702 17.2702 19.2 16.74 19.2Z"
                fill="currentColor"
                fillOpacity={
                  activeRightPanelTab === "participants" ? 0.4 : 0.25
                }
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.5424 11.7234C11.4563 12.1977 12.5438 12.1977 13.4576 11.7234C14.2981 11.2871 14.899 10.4972 15.0952 9.57076L15.1566 9.2808C15.3579 8.32986 15.1423 7.33822 14.5642 6.55681L14.4651 6.42288C13.8868 5.64132 12.9722 5.18028 12 5.18028C11.0278 5.18028 10.1132 5.64132 9.53498 6.42288L9.4359 6.55681C8.85778 7.33822 8.64211 8.32986 8.84347 9.2808L8.90487 9.57076C9.10104 10.4972 9.70191 11.2871 10.5424 11.7234Z"
                fill="currentColor"
                fillOpacity={
                  activeRightPanelTab === "participants" ? 0.4 : 0.25
                }
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
