'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  IconLayoutDashboard, 
  IconTableSpark, 
  IconLayoutGrid, 
  IconLayoutSidebarRight, 
  IconRectangle, 
  IconChalkboard, 
  IconChalkboardOff, 
  IconPhone 
} from '@tabler/icons-react';
import Tooltip from './Tooltip';

interface MobileControlsProps {
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
  activeRightPanelTab: 'chat' | 'participants' | 'doubt' | 'summary' | null;
  setActiveRightPanelTab: (tab: 'chat' | 'participants' | 'doubt' | 'summary' | null) => void;
  isWhiteboardAllowed?: boolean;
  isScreenShareAllowed?: boolean;
  layoutMode: 'auto' | 'tiled' | 'spotlight' | 'sidebar' | 'focus';
  setLayoutMode: (mode: 'auto' | 'tiled' | 'spotlight' | 'sidebar' | 'focus') => void;
  showSplitLayout: boolean;
  mobileControlsVisible: boolean;
  onHideControls: () => void;

  // Devices info passed from parent
  audioDevices: MediaDeviceInfo[];
  activeAudioId: string;
  setActiveAudioDevice: (id: string) => void;
  videoDevices: MediaDeviceInfo[];
  activeVideoId: string;
  setActiveVideoDevice: (id: string) => void;
}

export default function MobileControls({
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
  mobileControlsVisible,
  onHideControls,
  audioDevices,
  activeAudioId,
  setActiveAudioDevice,
  videoDevices,
  activeVideoId,
  setActiveVideoDevice,
}: MobileControlsProps) {
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
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

  // Close device settings when clicking outside
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

  // Reset device list submenu when settings main menu closes
  useEffect(() => {
    if (!showDeviceSettings) {
      setShowDevices(false);
    }
  }, [showDeviceSettings]);

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest('button') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('[role="button"]') ||
          target.closest('a')
        ) {
          return;
        }
        onHideControls();
      }}
      className={`w-full h-20 bg-[#090d1a]/95 border-t border-white/10 px-4 py-4 flex items-center justify-center z-40 select-none transition-all duration-300 controls-bar fixed bottom-0 left-0 right-0 ${
        mobileControlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      {/* Center side: Meeting controls */}
      <div className="flex items-center gap-1.5">
        {/* Microphone Toggle */}
        <Tooltip content={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}>
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
        <Tooltip content={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}>
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
              <IconLayoutDashboard className="w-5.5 h-5.5" />
            </button>
          </Tooltip>

          {/* Adjust View Dropdown Menu */}
          {showLayoutMenu && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 text-[#C2CCDE] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 font-sans">
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
                  <IconTableSpark className="w-4 h-4" />
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
                  <IconLayoutGrid className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>Tiled</span>
                    <span className="text-[10px] text-[#C2CCDE]/50 font-normal">All participants in grid</span>
                  </div>
                </div>
              </button>

              {/* Spotlight view is commented out
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
              */}

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
                  <IconLayoutSidebarRight className="w-4 h-4" />
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
                  <IconRectangle className="w-4 h-4" />
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
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-72 bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 text-[#C2CCDE] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {/* Mobile-only: Screen Share, Whiteboard, Chat, and Participants options */}
              <div className="flex flex-col gap-1 border-b border-white/5 pb-1 mb-1">
                {/* Screen Share */}
                <button
                  disabled={!isScreenShareAllowed}
                  onClick={() => {
                    toggleScreenShare();
                    setShowDeviceSettings(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/5 transition-colors text-left text-sm font-semibold select-none ${
                    !isScreenShareAllowed
                      ? "opacity-40 cursor-not-allowed text-zinc-600"
                      : isScreenShareEnabled
                      ? "text-emerald-400 bg-emerald-500/10 cursor-pointer"
                      : "text-[#C2CCDE] cursor-pointer"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.80001 4.87677C4.13727 4.87677 3.60001 5.41403 3.60001 6.07677V16.8768H9.63782C9.77103 17.3943 10.2409 17.7768 10.8 17.7768H13.2C13.7592 17.7768 14.229 17.3943 14.3622 16.8768H20.4V6.07677C20.4 5.41403 19.8628 4.87677 19.2 4.87677H4.80001Z"
                      fill="currentColor"
                      fillOpacity={isScreenShareEnabled ? 0.4 : 0.25}
                      stroke="none"
                    />
                    <path
                      d="M9.63782 16.8768H1.24566C1.22045 16.8768 1.20001 16.8972 1.20001 16.9224C1.20001 18.2227 2.25409 19.2768 3.55437 19.2768H20.4457C21.7459 19.2768 22.8 18.2227 22.8 16.9224C22.8 16.8972 22.7796 16.8768 22.7544 16.8768H14.3622C14.229 17.3943 13.7592 17.7768 13.2 17.7768H10.8C10.2409 17.7768 9.77103 17.3943 9.63782 16.8768Z"
                      fill="currentColor"
                      fillOpacity={isScreenShareEnabled ? 0.4 : 0.25}
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
                  <span>Share Screen</span>
                </button>

                {/* Whiteboard */}
                <button
                  onClick={() => {
                    toggleWhiteboard();
                    setShowDeviceSettings(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none ${
                    showWhiteboard ? 'text-indigo-400 bg-indigo-500/10' : 'text-[#C2CCDE]'
                  }`}
                >
                  {showWhiteboard ? (
                    <IconChalkboard className="w-5 h-5" />
                  ) : (
                    <IconChalkboardOff className="w-5 h-5" />
                  )}
                  <span>Whiteboard</span>
                </button>

                {/* Chat */}
                <button
                  onClick={() => {
                    setActiveRightPanelTab(
                      activeRightPanelTab === 'chat' ? null : 'chat'
                    );
                    setShowDeviceSettings(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none ${
                    activeRightPanelTab === 'chat' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[#C2CCDE]'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 85 77"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
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
                  <span>Chat</span>
                </button>

                {/* Participants */}
                <button
                  onClick={() => {
                    setActiveRightPanelTab(
                      activeRightPanelTab === 'participants' ? null : 'participants'
                    );
                    setShowDeviceSettings(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left text-sm font-semibold select-none ${
                    activeRightPanelTab === 'participants' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[#C2CCDE]'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.49006 11.7919C7.37766 12.3267 7.03202 12.7833 6.54775 13.0366C6.01672 13.3143 5.38333 13.3143 4.8523 13.0366C4.36803 12.7833 4.02239 12.3267 3.90999 11.7919L3.87102 11.6065C3.75534 11.0561 3.87948 10.4824 4.21238 10.029L4.27549 9.94309C4.60846 9.48962 5.13744 9.22178 5.70002 9.22178C6.26261 9.22178 6.79158 9.48962 7.12456 9.94309L7.18767 10.029C7.52057 10.4824 7.64471 11.0561 7.52903 11.6065L7.49006 11.7919Z"
                      fill="currentColor"
                      fillOpacity={activeRightPanelTab === "participants" ? 0.4 : 0.25}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2.40002 16.8399C2.40002 17.1492 2.65075 17.3999 2.96003 17.3999H6.39322C6.61397 16.4192 7.21453 15.5619 8.06255 15.0195C7.90992 14.9106 7.74197 14.8199 7.56123 14.7509L7.43468 14.7026C6.31753 14.2763 5.08252 14.2763 3.96537 14.7026L3.83882 14.7509C2.97243 15.0815 2.40002 15.9126 2.40002 16.8399Z"
                      fill="currentColor"
                      fillOpacity={activeRightPanelTab === "participants" ? 0.4 : 0.25}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21.04 17.4H17.6068C17.3861 16.4193 16.7856 15.5619 15.9375 15.0195C16.0902 14.9107 16.2581 14.8199 16.4388 14.7509L16.5654 14.7027C17.6825 14.2763 18.9175 14.2763 20.0347 14.7027L20.1612 14.7509C21.0276 15.0816 21.6 15.9127 21.6 16.84C21.6 17.1493 21.3493 17.4 21.04 17.4Z"
                      fill="currentColor"
                      fillOpacity={activeRightPanelTab === "participants" ? 0.4 : 0.25}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16.51 11.792C16.6224 12.3268 16.968 12.7834 17.4523 13.0366C17.9833 13.3144 18.6167 13.3144 19.1478 13.0366C19.632 12.7834 19.9777 12.3268 20.0901 11.792L20.129 11.6066C20.2447 11.0561 20.1206 10.4825 19.7877 10.0291L19.7246 9.94316C19.3916 9.48969 18.8626 9.22184 18.3 9.22184C17.7374 9.22184 17.2085 9.48969 16.8755 9.94316L16.8124 10.0291C16.4795 10.4825 16.3553 11.0561 16.4795 11.6066L16.51 11.792Z"
                      fill="currentColor"
                      fillOpacity={activeRightPanelTab === "participants" ? 0.4 : 0.25}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Participants</span>
                </button>
              </div>

              {/* Device Settings Submenu Trigger */}
              <div className="flex flex-col text-left">
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
                    <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#C2CCDE]/50 flex items-center gap-1.5 select-none font-sans text-left">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#C2CCDE]/50 flex items-center gap-1.5 select-none font-sans text-left">
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

              {/* Publish Notes / Download Notes (Teacher) */}
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

        {/* Leave Room Button */}
        <Tooltip content="Leave Room">
          <button
            onClick={onLeave}
            className="relative group w-15 h-12 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg"
          >
            <IconPhone className="w-8 h-8" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
