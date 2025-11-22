import { useCallback, useEffect, useRef, useState } from 'react';

type Participant = {
  id: string;
  name: string;
  avatarUrl?: string;
  stream?: MediaStream;
};

interface UseWebRTCOptions {
  roomUrl?: string;
  token?: string;
}

export const useWebRTC = ({ roomUrl, token }: UseWebRTCOptions) => {
  const localStreamRef = useRef<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');

  useEffect(() => {
    if (!roomUrl || !token) return;
    let cancelled = false;

    const join = async () => {
      setConnectionState('connecting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) return;
        localStreamRef.current = stream;
        setParticipants([{ id: 'local', name: 'You', stream }]);
        setConnectionState('connected');
      } catch (error) {
        console.error('Failed to access media devices', error);
        setConnectionState('disconnected');
      }
    };

    join();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setParticipants([]);
      setConnectionState('idle');
    };
  }, [roomUrl, token]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    }
  }, []);

  return {
    participants,
    connectionState,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
  };
};
