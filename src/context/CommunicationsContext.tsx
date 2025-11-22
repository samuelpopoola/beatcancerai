import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useApp } from './AppContext';

export type ConversationStatus = 'open' | 'paused' | 'archived';
export type CallStage = 'idle' | 'waiting-room' | 'ringing' | 'live' | 'post-call';

interface ActiveConversation {
  id: string;
  status: ConversationStatus;
  participants: Array<{ id: string; name: string; role: string; avatarUrl?: string }>;
}

interface CommunicationsState {
  activeConversation: ActiveConversation | null;
  typingUsers: Record<string, number>; // userId -> last seen timestamp
  unreadCounts: Record<string, number>;
  callStage: CallStage;
  joinCall: (conversationId: string) => void;
  leaveCall: () => void;
  setActiveConversation: (conversation: ActiveConversation | null) => void;
  markTyping: (userId: string) => void;
  setUnreadCount: (conversationId: string, count: number) => void;
}

const CommunicationsContext = createContext<CommunicationsState | undefined>(undefined);

export const CommunicationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useApp();
  const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [callStage, setCallStage] = useState<CallStage>('idle');

  const joinCall = useCallback((conversationId: string) => {
    if (!conversationId || !user?.id) return;
    setCallStage('waiting-room');
  }, [user?.id]);

  const leaveCall = useCallback(() => {
    setCallStage('post-call');
    setTimeout(() => setCallStage('idle'), 1500);
  }, []);

  const markTyping = useCallback((userId: string) => {
    setTypingUsers((prev) => ({ ...prev, [userId]: Date.now() }));
  }, []);

  const setUnreadCount = useCallback((conversationId: string, count: number) => {
    setUnreadCounts((prev) => ({ ...prev, [conversationId]: count }));
  }, []);

  const value = useMemo(() => ({
    activeConversation,
    typingUsers,
    unreadCounts,
    callStage,
    joinCall,
    leaveCall,
    setActiveConversation,
    markTyping,
    setUnreadCount,
  }), [activeConversation, typingUsers, unreadCounts, callStage, joinCall, leaveCall, markTyping, setUnreadCount]);

  return (
    <CommunicationsContext.Provider value={value}>
      {children}
    </CommunicationsContext.Provider>
  );
};

export const useCommunications = () => {
  const context = useContext(CommunicationsContext);
  if (!context) {
    throw new Error('useCommunications must be used within CommunicationsProvider');
  }
  return context;
};
