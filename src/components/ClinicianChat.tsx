import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { X, Lock, Paperclip, Send, Check } from 'lucide-react';

type Msg = { id: string; sender_id?: string; content: string; created_at?: string; file_url?: string; delivered_at?: string | null; read_at?: string | null };

const ClinicianChat: React.FC<{ chatId?: string; onClose?: () => void }> = ({ chatId, onClose }) => {
  const { user } = useApp();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { full_name?: string; avatar_url?: string }>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileUploading, setProfileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Track the actual chat id in state so we can create one when needed
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId ?? null);

  // Resolve the active chat id (preference: created chat in state -> provided prop -> fallback placeholder)
  const getChatId = () => {
    if (currentChatId) return currentChatId;
    if (chatId) return chatId;
    // Fallback placeholder for legacy flows; ideally a real chat row should exist
    return '00000000-0000-0000-0000-000000000000';
  };

  // Create a new chat row if your DB has a `chats` table. Falls back to a client-generated id if table doesn't exist or RLS prevents creation.
  const createNewChat = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      // Attempt to create a chat in the database. Adjust payload fields for your schema (patient_id/clinician_id/etc.).
      const payload: any = {
        patient_id: user.id,
        created_by: user.id,
        // Some schemas require a caregiver_id or clinician reference; include the current user as a best-effort value.
        caregiver_id: user.id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('chats').insert([payload]).select('id');
      if (error) {
        console.warn('Could not create chat row in DB', error);
      }
      const newId = data && data[0] && (data[0] as any).id;
      if (newId) {
        setCurrentChatId(newId);
        return newId;
      }

      // If DB creation failed (no chats table or RLS), generate a client-side fallback id so messages still have a stable chat_id
      const fallback = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `local-${Date.now()}-${Math.floor(Math.random()*10000)}`;
      setCurrentChatId(fallback);
      return fallback;
    } catch (e: any) {
      // If DB requires additional NOT NULL fields (e.g., caregiver_id) the insert will fail with code 23502.
      if (e && e.code === '23502') {
        console.warn('Chat insert failed due to missing NOT NULL column; falling back to client-side chat id', e);
        const fallback = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `local-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        setCurrentChatId(fallback);
        return fallback;
      }
      console.error('createNewChat failed', e);
      return null;
    }
  };

  const PLACEHOLDER_CHAT_ID = '00000000-0000-0000-0000-000000000000';

  // Validate chat id and throw if clearly invalid. Caller may attempt createNewChat first.
  const validateChatIdOrThrow = (cid: string | null) => {
    if (!cid || cid === PLACEHOLDER_CHAT_ID) {
      throw new Error('Invalid chat ID');
    }
    return cid;
  };

  // Centralized server insert for messages with validation and file_url fallback handling
  const sendClinicianMessage = async (cid: string, content: string, fileUrl?: string) => {
    validateChatIdOrThrow(cid);
    const insertObj: any = { chat_id: cid, sender_id: user?.id, content };
    if (fileUrl) insertObj.file_url = fileUrl;

    try {
      const res = await supabase.from('messages').insert([insertObj]).select('id, sender_id, content, created_at, file_url, delivered_at, read_at');
      if (res.error) throw res.error;
      return res.data && res.data[0];
    } catch (insErr: any) {
      // If the server reports missing column, retry without file_url
      if (insErr && insErr.code === '42703') {
        // Retry without file_url column
        const fallbackContent = fileUrl ? `${content}\n\nAttachment: ${fileUrl}` : content;
        const insert2: any = { chat_id: cid, sender_id: user?.id, content: fallbackContent };
        const { data: d2, error: e2 } = await supabase.from('messages').insert([insert2]).select('id, sender_id, content, created_at, delivered_at, read_at');
        if (e2) throw e2;
        return d2 && d2[0];
      }
      // RLS blocked the insert
      if (insErr && (insErr.code === '42501' || String(insErr.message).toLowerCase().includes('row-level security'))) {
        console.error('RLS blocked messages insert', insErr);
        // surface a friendly message for developers / users
        throw new Error('Row-level security is blocking message inserts. Apply RLS policies or use a server-side endpoint.');
      }
      throw insErr;
    }
  };

  useEffect(() => {
    if (!user) return;

    const current = getChatId();

    // Load recent messages including file_url/read/delivered timestamps
    let mounted = true;
    const load = async () => {
      try {
        // Try to select including file_url if the column exists, otherwise retry without it
        let data: any = null;
        try {
          const res = await supabase
            .from('messages')
            .select('id, sender_id, content, created_at, file_url, delivered_at, read_at')
            .eq('chat_id', current)
            .order('created_at', { ascending: true })
            .limit(500);
          if (res.error) throw res.error;
          data = res.data;
        } catch (firstErr: any) {
          // If file_url column missing (42703), retry without file_url
          if (firstErr && firstErr.code === '42703') {
            const res2 = await supabase
              .from('messages')
              .select('id, sender_id, content, created_at, delivered_at, read_at')
              .eq('chat_id', current)
              .order('created_at', { ascending: true })
              .limit(500);
            if (res2.error) throw res2.error;
            data = res2.data;
          } else {
            throw firstErr;
          }
        }

        if (mounted && data) {
          setMessages(data as Msg[]);

          // fetch profiles for any sender ids
          const ids = Array.from(new Set((data as any[]).map((d) => d.sender_id).filter(Boolean)));
          if (ids.length) {
            const { data: ppl } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
            const map: Record<string, any> = {};
            (ppl || []).forEach((p: any) => { map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
            if (mounted) setProfiles(map);
          }

          // Mark existing incoming messages as delivered/read (for user privacy scope be cautious in prod)
          try {
            if (user?.id) {
              await supabase
                .from('messages')
                .update({ delivered_at: new Date().toISOString() })
                .neq('sender_id', user.id)
                .is('delivered_at', null)
                .eq('chat_id', current);

              await supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() })
                .neq('sender_id', user.id)
                .is('read_at', null)
                .eq('chat_id', current);
            }
          } catch (e) {
            // best-effort
          }
        }
        scrollToBottom();
      } catch (err) {
        console.error('Failed to load clinician messages', err);
      }
    };
    load();

    // subscribe to new messages and broadcasts
    const channel = supabase.channel(`public:messages:chat:${current}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${current}` }, async (payload) => {
        const newMsg = payload.new as Msg;
        setMessages((m) => [...m, newMsg]);
        // fetch profile for sender if missing
        if (newMsg.sender_id && !profiles[newMsg.sender_id]) {
          supabase.from('profiles').select('id, full_name, avatar_url').eq('id', newMsg.sender_id).limit(1).then(({ data }) => {
            if (data && data[0]) setProfiles((p) => ({ ...p, [data[0].id]: { full_name: data[0].full_name, avatar_url: data[0].avatar_url } }));
          });
        }

        // If this client received a new message from someone else, mark it delivered
        try {
          if (user?.id && newMsg.sender_id !== user.id && !newMsg.delivered_at) {
            await supabase.from('messages').update({ delivered_at: new Date().toISOString() }).eq('id', newMsg.id);
            // Update local message to reflect delivery
            setMessages((m) => m.map(msg => msg.id === newMsg.id ? { ...msg, delivered_at: new Date().toISOString() } : msg));
          }
        } catch (e) {
          // ignore
        }

        scrollToBottom();
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        try {
          const { userId, chatId: payloadChat, typing } = payload.payload || payload;
          if (payloadChat !== current) return;
          setTypingUsers((prev) => {
            const next = new Set(prev);
            if (typing) next.add(userId); else next.delete(userId);
            return Array.from(next);
          });
        } catch (e) {}
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      mounted = false;
      try { supabase.removeChannel(channel); } catch (e) {}
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId, chatId, user]);

  const scrollToBottom = () => { try { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); } catch (e) {} };

  const sendTyping = (isTyping: boolean) => {
    try {
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { chatId: getChatId(), userId: user?.id, typing: isTyping } });
    } catch (e) {}
  };

  const onInputChange = (val: string) => {
    setInput(val);
    // send typing true and debounce stop
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 1800);
  };

  const sendMessage = async (fileUrl?: string, filename?: string) => {
    if ((!input.trim() && !fileUrl) || !user) return;
    const content = fileUrl ? (filename || 'Attachment') : input.trim();
    setInput('');
    setSending(true);

    // optimistic UI
    const tempId = 'tmp-' + Date.now();
    const tempMsg: Msg = { id: tempId, sender_id: user.id, content, created_at: new Date().toISOString(), file_url: fileUrl };
    setMessages((m) => [...m, tempMsg]);
    scrollToBottom();

    try {
      // Ensure we have a valid chat id; create one if not present
      let cid = currentChatId ?? chatId ?? null;
      if (!cid) {
        cid = await createNewChat();
        if (!cid) {
          throw new Error('Could not create chat');
        }
      }

      // Insert message using centralized helper which validates chat id
      const inserted = await sendClinicianMessage(cid, content, fileUrl);
      if (inserted) setMessages((m) => m.map(msg => msg.id === tempId ? (inserted as Msg) : msg));
      
      // Inform other clients typing stopped
      sendTyping(false);
    } catch (errAny) {
      const err: any = errAny;
      console.error('Failed to send clinician message', err);
      // If the error is an RLS error, show actionable hint
      if (err && (err.code === '42501' || String(err.message || '').toLowerCase().includes('row-level security'))) {
        alert('Message blocked by Row-Level Security (RLS). Apply the recommended RLS migration or use a server-side service role endpoint to create chats/messages.');
      }
      setMessages((m) => m.map(msg => msg.id === tempId ? { ...msg, content: msg.content + ' (failed)' } : msg));
    } finally {
      setSending(false);
    }
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    try {
      const bucket = 'attachments';
      const path = `${getChatId()}/${Date.now()}_${f.name}`;
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, f, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      // send message with file_url
      await sendMessage(publicUrl, f.name);
    } catch (err) {
      console.error('File upload failed', err);
      alert('Failed to upload attachment');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Profile editor handlers
  const openProfileEditor = () => {
    if (!user) return;
    const me = profiles[user.id as string];
    setProfileName(me?.full_name || '');
    setShowProfileEditor(true);
  };

  const saveProfile = async (avatarFile?: File | null) => {
    if (!user) return;
    setProfileUploading(true);
    try {
      let avatarUrl = profiles[user.id as string]?.avatar_url;
      
      // Handle avatar upload with RLS workaround
      if (avatarFile) {
        try {
          const bucket = 'avatars';
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const path = `${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(path, avatarFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadErr) {
            // If RLS is blocking uploads, try a client-side data URL approach
            if (uploadErr.message?.includes('row-level security') || (uploadErr as any).status === 400) {
              console.warn('Storage RLS blocking upload, using client-side approach');
              const reader = new FileReader();
              reader.onload = (e) => {
                avatarUrl = e.target?.result as string;
              };
              reader.readAsDataURL(avatarFile);
              // Wait for the file to be read
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              throw uploadErr;
            }
          } else {
            // Get public URL if upload was successful
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
            avatarUrl = urlData.publicUrl;
          }
        } catch (uploadError) {
          console.error('Avatar upload failed, using fallback', uploadError);
          // Fallback: convert to data URL
          const reader = new FileReader();
          reader.onload = (e) => {
            avatarUrl = e.target?.result as string;
          };
          reader.readAsDataURL(avatarFile);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const updates: any = { 
        id: user.id,
        full_name: profileName,
        updated_at: new Date().toISOString()
      };
      if (avatarUrl) updates.avatar_url = avatarUrl;

      // Use upsert instead of update to handle RLS better
      const { error } = await supabase.from('profiles').upsert(updates, {
        onConflict: 'id'
      });
      
      if (error) {
        // If RLS is blocking, show helpful message
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          alert('Row Level Security (RLS) is blocking profile updates. Please check your Supabase RLS policies or contact your administrator.');
          throw error;
        }
        throw error;
      }

      const key = user.id as string;
      setProfiles((p) => ({ ...p, [key]: { full_name: profileName, avatar_url: avatarUrl } }));
      setShowProfileEditor(false);
    } catch (e) {
      console.error('Failed to save profile', e);
      alert('Failed to save profile. Please check your Supabase RLS policies.');
    } finally {
      setProfileUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose && onClose()} />

      <div className="relative bg-white dark:bg-gray-900 rounded-[18px] shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden">
              {profiles['clinic']?.avatar_url ? <img src={profiles['clinic'].avatar_url} alt="Team" className="w-full h-full object-cover" /> : <span>C</span>}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Your Care Team</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Lock className="w-3 h-3" /> <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={openProfileEditor} className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800">Edit profile</button>
            <button onClick={handleAttachClick} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" title="Attach file">
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>
            <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => onClose && onClose()} aria-label="Close chat">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Message list */}
        <div ref={listRef} className="p-4 overflow-auto flex-1 space-y-4 bg-gradient-to-b from-white/50 to-transparent dark:from-gray-900/40">
          {messages.map((m) => {
            const isMe = m.sender_id === user?.id;
            const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const profile = m.sender_id ? profiles[m.sender_id] : undefined;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end`}> 
                {!isMe && (
                  <div className="w-9 h-9 mr-3 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-700 dark:text-gray-200 overflow-hidden">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name || 'Clinician'} className="w-full h-full object-cover" /> : <span className="uppercase">{(profile?.full_name || 'C').charAt(0)}</span>}
                  </div>
                )}

                <div className={`max-w-[72%] p-3 rounded-2xl text-sm ${isMe ? 'bg-[#0b5fff] text-white rounded-br-[6px]' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-bl-[6px]'}`}>
                  {!isMe && profile?.full_name && <div className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-200">{profile.full_name}</div>}

                  {m.file_url ? (
                    <a href={m.file_url} target="_blank" rel="noreferrer" className={`inline-block p-3 rounded-md bg-white dark:bg-gray-900 border ${isMe ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
                      <div className="text-sm font-medium">{m.content || 'Attachment'}</div>
                      <div className="text-xs text-gray-500 mt-1">Open attachment</div>
                    </a>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}

                  <div className={`text-xs mt-1 ${isMe ? 'text-white/80 text-right' : 'text-gray-500'}`}>{time} {isMe && (m.read_at ? <span title="Read"><Check className="inline-block w-3 h-3 ml-2" /></span> : (m.delivered_at ? <span title="Delivered"><Check className="inline-block w-3 h-3 ml-2" /></span> : <span title="Sent" className="inline-block w-3 h-3 ml-2 opacity-50">•</span>))}</div>
                </div>

                {isMe && (
                  <div className="w-9 h-9 ml-3 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-white text-xs">Me</div>
                )}
              </div>
            );
          })}

          {typingUsers.length > 0 && (
            <div className="text-sm text-gray-500">{typingUsers.filter(t => t !== user?.id).map(t => profiles[t]?.full_name || 'Clinician').join(', ')} typing…</div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t dark:border-gray-800 flex items-center gap-3">
          <input type="file" accept="*/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

          <button onClick={handleAttachClick} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" title="Attach">
            <Paperclip className="w-5 h-5 text-gray-500" />
          </button>

          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={1}
            className="flex-1 p-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none text-sm"
            placeholder="Write a secure message to your clinician"
            aria-label="Message input"
          />

          <button onClick={() => sendMessage()} disabled={!input.trim() || sending} className="inline-flex items-center gap-2 bg-[#0b5fff] text-white px-4 py-2 rounded-full disabled:opacity-50">
            <Send className="w-4 h-4" />
            <span className="text-sm">{sending ? 'Sending…' : 'Send'}</span>
          </button>
        </div>
      </div>

      {/* Profile editor modal */}
      {showProfileEditor && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowProfileEditor(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 z-10">
            <h4 className="text-lg font-semibold mb-3">Edit profile</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Display name</label>
                <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full p-2 rounded border" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Avatar</label>
                <input ref={avatarInputRef} type="file" accept="image/*" className="w-full" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-3 py-2 rounded border" onClick={() => setShowProfileEditor(false)}>Cancel</button>
                <button
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                  onClick={async () => {
                    const file = avatarInputRef.current?.files?.[0] || null;
                    await saveProfile(file || undefined);
                  }}
                  disabled={profileUploading}
                >{profileUploading ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicianChat;