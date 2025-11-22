import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AttachmentManifestEntry {
  bucket_id: string;
  object_path: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  signed_url?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_display_name?: string | null;
  content?: string | null;
  message_type: string;
  attachment_manifest?: AttachmentManifestEntry[] | null;
  ai_metadata?: Record<string, unknown> | null;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at: string;
}

interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: string;
  senderDisplayName?: string;
  attachments?: AttachmentManifestEntry[];
  aiMetadata?: Record<string, unknown> | null;
}

export function useChat(
  conversationId?: string | null,
  currentUserId?: string | null,
  defaultSenderName?: string | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const markMessagesAsDelivered = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    const { error } = await supabase
      .from('messages')
      .update({ delivered_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .is('delivered_at', null)
      .neq('sender_id', currentUserId);

    if (error) console.error('Error marking messages as delivered:', error);
  }, [conversationId, currentUserId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages', error);
    } else {
      setMessages((data || []) as ChatMessage[]);
      await markMessagesAsDelivered();
    }
    setIsLoading(false);
  }, [conversationId, markMessagesAsDelivered]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return undefined;
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => prev.map((msg) => (msg.id === payload.new.id ? (payload.new as ChatMessage) : msg)));
        }
      )
      .subscribe();

    const typingChannel = supabase.channel(`typing:${conversationId}`);
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === currentUserId) return;
        setTypingUsers((prev) => (prev.includes(payload.userId) ? prev : [...prev, payload.userId]));

        if (typingTimeouts.current[payload.userId]) {
          clearTimeout(typingTimeouts.current[payload.userId]);
        }

        typingTimeouts.current[payload.userId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== payload.userId));
          delete typingTimeouts.current[payload.userId];
        }, 2500);
      })
      .subscribe();

    return () => {
      try { subscription.unsubscribe(); } catch (error) {
        console.error('Error unsubscribing from conversation channel', error);
      }
      try { typingChannel.unsubscribe(); } catch (error) {
        console.error('Error unsubscribing from typing channel', error);
      }
      Object.values(typingTimeouts.current).forEach(clearTimeout);
      typingTimeouts.current = {};
    };
  }, [conversationId, currentUserId]);

  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .is('read_at', null)
      .neq('sender_id', currentUserId);

    if (error) console.error('Error marking message as read:', error);
  }, [currentUserId]);

  const sendMessage = useCallback(async ({
    conversationId: convId,
    senderId,
    content,
    messageType = 'text',
    senderDisplayName: displayName,
    attachments,
    aiMetadata,
  }: SendMessagePayload) => {
    if (!convId || !senderId) throw new Error('Missing conversation or sender');
    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: senderId,
      sender_display_name: displayName ?? defaultSenderName ?? null,
      content,
      message_type: messageType,
      attachment_manifest: attachments?.length ? attachments : null,
      ai_metadata: aiMetadata ?? null,
    });

    if (error) throw error;
  }, [defaultSenderName]);

  const sendTypingIndicator = useCallback(async (convId: string, isTyping: boolean) => {
    if (!convId || !currentUserId) return;
    try {
      await supabase.channel(`typing:${convId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          isTyping,
        },
      });
    } catch (error) {
      console.error('Error sending typing indicator', error);
    }
  }, [currentUserId]);

  return {
    messages,
    typingUsers,
    isLoading,
    markMessageAsRead,
    sendMessage,
    sendTypingIndicator,
    refreshMessages: fetchMessages,
  };
}
