import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ConversationParticipant {
  user_id: string;
  role: string;
  is_primary?: boolean;
  display_name?: string;
  avatar_url?: string | null;
}

export interface ConversationSummary {
  id: string;
  status: string;
  urgency: string;
  last_message_at: string | null;
  metadata: Record<string, unknown> | null;
  role: string;
  participants: ConversationParticipant[];
}

interface UseConversationsResult {
  conversations: ConversationSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConversations(userId?: string | null): UseConversationsResult {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateParticipants = useCallback(async (conversationIds: string[]) => {
    if (!conversationIds.length) return {} as Record<string, ConversationParticipant[]>;

    const { data: participantRows, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, role, is_primary')
      .in('conversation_id', conversationIds);

    if (participantError) throw participantError;

    const uniqueUserIds = Array.from(new Set(participantRows?.map((row) => row.user_id).filter(Boolean)));
    let profileMap: Record<string, { first_name?: string; last_name?: string; avatar_url?: string | null }> = {};

    if (uniqueUserIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', uniqueUserIds);

      if (profileError) throw profileError;

      profileMap = (profiles || []).reduce<Record<string, { first_name?: string; last_name?: string; avatar_url?: string | null }>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
    }

    return (participantRows || []).reduce<Record<string, ConversationParticipant[]>>((acc, row) => {
      const existing = acc[row.conversation_id] || [];
      const profile = profileMap[row.user_id] || {};
      existing.push({
        user_id: row.user_id,
        role: row.role,
        is_primary: row.is_primary,
        display_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined,
        avatar_url: profile.avatar_url,
      });
      acc[row.conversation_id] = existing;
      return acc;
    }, {});
  }, []);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: convError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, role, conversations(id, status, urgency, last_message_at, metadata)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (convError) throw convError;

      const rows = (data || []) as any[];
      const formatted = rows
        .map((row) => ({
          id: row.conversations?.id,
          status: row.conversations?.status ?? 'open',
          urgency: row.conversations?.urgency ?? 'routine',
          last_message_at: row.conversations?.last_message_at ?? null,
          metadata: row.conversations?.metadata ?? {},
          role: row.role,
        }))
        .filter((row) => Boolean(row.id)) as Array<Omit<ConversationSummary, 'participants'>>;

      const participants = await hydrateParticipants(formatted.map((row) => row.id));

      setConversations(
        formatted.map((row) => ({
          ...row,
          participants: participants[row.id] || [],
        }))
      );
    } catch (err) {
      console.error('Error loading conversations', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [hydrateParticipants, userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase
      .channel(`conversation-list:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const nextPayload = payload.new as { conversation_id?: string; created_at?: string };
        if (!nextPayload?.conversation_id) return;
        setConversations((prev) => {
          const next = prev.map((conv) =>
            conv.id === nextPayload.conversation_id
              ? { ...conv, last_message_at: nextPayload.created_at ?? conv.last_message_at }
              : conv
          );
          return next;
        });
      })
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch (err) {
        console.error('Error unsubscribing from conversation list channel', err);
      }
    };
  }, [userId]);

  return useMemo(() => ({
    conversations,
    isLoading,
    error,
    refresh: loadConversations,
  }), [conversations, error, isLoading, loadConversations]);
}
