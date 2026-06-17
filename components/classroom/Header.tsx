'use client';

import React from 'react';
import Tooltip from './Tooltip';

interface HeaderProps {
  isFocusMode: boolean;
  setIsFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  showSplitLayout: boolean;
}

export default function Header({
  isFocusMode,
  setIsFocusMode,
  showSplitLayout,
}: HeaderProps) {
  return (
    <header className="py-3 px-6 border-b border-border/30 flex justify-between items-center bg-[#090d1a]/85 backdrop-blur-md z-30 select-none">
      <div className="flex items-center">
        <span className="font-bold text-lg text-white tracking-wide leading-tight">
          OpenGrapes Live
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Focus View Button (visible only when whiteboard/screenshare is active) */}
        {showSplitLayout && (
          <Tooltip content={isFocusMode ? "Exit Focus Mode" : "Enable Focus Mode"}>
            <button
              onClick={() => setIsFocusMode((prev) => !prev)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                isFocusMode
                  ? "bg-primary border border-primary text-white shadow-lg shadow-primary-glow"
                  : "bg-surface-light/50 border border-border/40 hover:bg-border/30 text-[#C2CCDE]"
              }`}
            >
              <svg
                className="w-5.5 h-5.5"
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M57.5 40C57.5 49.665 49.665 57.5 40 57.5C30.335 57.5 22.5 49.665 22.5 40C22.5 30.335 30.335 22.5 40 22.5C49.665 22.5 57.5 30.335 57.5 40Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M68 40C68 55.464 55.464 68 40 68C24.536 68 12 55.464 12 40C12 24.536 24.536 12 40 12C55.464 12 68 24.536 68 40Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M40 12L43.135 12.1761L46.2306 12.702L49.2478 13.5713L52.1487 14.7729L54.8969 16.2917L57.4577 18.1087L59.799 20.201L61.8913 22.5423L63.7083 25.1031L65.2271 27.8513L66.4287 30.7522L67.298 33.7694L67.8239 36.865L68 40L67.8239 43.135L67.298 46.2306L66.4287 49.2478L65.2271 52.1487L63.7083 54.8969L61.8913 57.4577L59.799 59.799L57.4577 61.8913L54.8969 63.7083L52.1487 65.2271L49.2478 66.4287L46.2306 67.298L43.135 67.8239L40 68L36.865 67.8239L33.7694 67.298L30.7522 66.4287L27.8513 65.2271L25.1031 63.7083L22.5423 61.8913L20.201 59.799L18.1087 57.4577L16.2917 54.8969L14.7729 52.1487L13.5713 49.2478L12.702 46.2306L12.1761 43.135L12 40L12.1761 36.865L12.702 33.7694L13.5713 30.7522L14.7729 27.8513L16.2917 25.1031L18.1087 22.5423L20.201 20.201L22.5423 18.1087L25.1031 16.2917L27.8513 14.7729L30.7522 13.5713L33.7694 12.702L36.865 12.1761L40 12Z"
                  fill="currentColor"
                  fillOpacity={isFocusMode ? 0.4 : 0.25}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M48.25 39.5C48.25 44.3325 44.3325 48.25 39.5 48.25C34.6675 48.25 30.75 44.3325 30.75 39.5C30.75 34.6675 34.6675 30.75 39.5 30.75C44.3325 30.75 48.25 34.6675 48.25 39.5Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
