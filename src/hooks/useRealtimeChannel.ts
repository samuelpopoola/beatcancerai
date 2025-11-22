import { useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UseRealtimeChannelOptions {
  channelName: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: { table: string; filter?: string };
}

export const useRealtimeChannel = ({ channelName, onInsert, onUpdate, onDelete, filter }: UseRealtimeChannelOptions) => {
  useEffect(() => {
    if (!channelName) return;
    const channel: RealtimeChannel = supabase.channel(channelName);

    if (filter) {
      if (onInsert) {
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: filter.table, filter: filter.filter }, onInsert);
      }
      if (onUpdate) {
        channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: filter.table, filter: filter.filter }, onUpdate);
      }
      if (onDelete) {
        channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: filter.table, filter: filter.filter }, onDelete);
      }
    }

    channel.subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from realtime channel', error);
      }
    };
  }, [channelName, filter?.table, filter?.filter, onInsert, onUpdate, onDelete]);
};
