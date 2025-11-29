import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

interface VideoCallProps {
  roomUrl: string;
  onLeave: () => void;
  title?: string;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomUrl, onLeave, title }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callFrameRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    if (!containerRef.current || callFrameRef.current) return;
    const frame = DailyIframe.createFrame(containerRef.current, {
      url: roomUrl,
      showLeaveButton: true,
      showFullscreenButton: true,
    });
    callFrameRef.current = frame;
    frame.join();
    frame.on('left-meeting', () => {
      onLeave();
    });

    return () => {
      frame.leave();
      frame.destroy();
      callFrameRef.current = null;
    };
  }, [roomUrl, onLeave]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">{title || 'Video Consultation'}</h3>
          <button onClick={onLeave} className="rounded-full p-1 text-gray-500 hover:bg-gray-100" aria-label="Close video">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="w-full" style={{ minHeight: 500 }}>
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
