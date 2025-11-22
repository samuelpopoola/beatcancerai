import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquare, Paperclip, Plus, Send, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { CommunicationsProvider, useCommunications } from '../context/CommunicationsContext';
import { useApp } from '../context/AppContext';
import { useConversations } from '../hooks/useConversations';
import { AttachmentManifestEntry, useChat } from '../hooks/useChat';
import { supabase } from '../lib/supabase';

const CHAT_BUCKET = import.meta.env.VITE_SUPABASE_CHAT_BUCKET || 'chat-attachments';

const ConversationBadge: React.FC<{ label: string; active: boolean; onClick: () => void; urgency: string; lastMessageAt?: string | null }> = ({
  label,
  active,
  onClick,
  urgency,
  lastMessageAt,
}) => {
  const badgeColors = urgency === 'urgent' ? 'border-red-300 text-red-700' : 'border-gray-200 text-gray-700';
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        active ? 'border-blue-600 bg-blue-50 text-blue-700' : `bg-white hover:border-blue-300 ${badgeColors}`
      }`}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wide">
        <span>{urgency === 'urgent' ? 'Priority' : 'Standard'}</span>
        {lastMessageAt && <span className="text-gray-400">{new Date(lastMessageAt).toLocaleTimeString()}</span>}
      </div>
      <p className="mt-1 text-sm font-semibold">{label}</p>
    </button>
  );
};

const AttachmentPreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => (
  <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm">
    <div>
      <p className="font-medium text-gray-800">{file.name}</p>
      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
    </div>
    <button onClick={onRemove} className="text-xs text-red-500 hover:underline">
      Remove
    </button>
  </div>
);

const useTypingDisplay = (typingIds: string[], currentUserId?: string | null) => {
  const others = typingIds.filter((id) => id !== currentUserId);
  if (!others.length) return '';
  if (others.length === 1) return '1 participant typing…';
  return `${others.length} participants typing…`;
};

const ChatWorkspace: React.FC = () => {
  const { user, userProfile } = useApp();
  const { activeConversation, setActiveConversation } = useCommunications();
  const { conversations, isLoading: conversationsLoading } = useConversations(user?.id);
  const [composer, setComposer] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
  }, []);

  const resolvedConversation = useMemo(() => {
    if (activeConversation) return conversations.find((conv) => conv.id === activeConversation.id) || null;
    return conversations[0] || null;
  }, [activeConversation, conversations]);

  useEffect(() => {
    if (!activeConversation && conversations.length) {
      const first = conversations[0];
      setActiveConversation({ id: first.id, status: (first.status as 'open' | 'paused' | 'archived') ?? 'open', participants: first.participants.map((p) => ({ id: p.user_id, name: p.display_name || 'Care team', role: p.role })) });
    }
  }, [activeConversation, conversations, setActiveConversation]);

  const displayName = useMemo(() => {
    const name = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ');
    return name || userProfile?.cancer_type || user?.email || 'You';
  }, [userProfile, user]);

  const { messages, isLoading: messagesLoading, typingUsers, sendMessage, sendTypingIndicator } = useChat(
    resolvedConversation?.id,
    user?.id,
    displayName
  );

  const typingLabel = useTypingDisplay(typingUsers, user?.id);

  const selectConversation = (conversationId: string) => {
    const next = conversations.find((conv) => conv.id === conversationId);
    if (!next) return;
    setActiveConversation({
      id: next.id,
      status: (next.status as 'open' | 'paused' | 'archived') ?? 'open',
      participants: next.participants.map((p) => ({ id: p.user_id, name: p.display_name || 'Care team', role: p.role })),
    });
  };

  const triggerTyping = (value: string) => {
    setComposer(value);
    if (!resolvedConversation?.id) return;
    sendTypingIndicator(resolvedConversation.id, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (resolvedConversation.id) {
        sendTypingIndicator(resolvedConversation.id, false);
      }
    }, 1200);
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    setAttachmentFiles((prev) => [...prev, ...Array.from(event.target.files)]);
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const uploadAttachment = async (file: File, conversationId: string, senderId: string): Promise<AttachmentManifestEntry> => {
    const path = `${conversationId}/${senderId}/${Date.now()}_${file.name}`.replace(/\s+/g, '_');
    const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: signed, error: signedError } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60 * 24);
    if (signedError) throw signedError;
    return {
      bucket_id: CHAT_BUCKET,
      object_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      signed_url: signed?.signedUrl,
    };
  };

  const handleSendMessage = async () => {
    if (!composer.trim() || !resolvedConversation?.id || !user?.id) return;
    setIsSending(true);
    try {
      let attachments: AttachmentManifestEntry[] | undefined;
      if (attachmentFiles.length) {
        attachments = await Promise.all(
          attachmentFiles.map((file) => uploadAttachment(file, resolvedConversation.id!, user.id!))
        );
      }

      await sendMessage({
        conversationId: resolvedConversation.id,
        senderId: user.id,
        content: composer.trim(),
        attachments,
      });
      setComposer('');
      setAttachmentFiles([]);
    } catch (error) {
      console.error('Failed to send message', error);
      alert('Unable to send message right now. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessages = () => {
    if (!resolvedConversation) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-300 text-gray-500">
          Select a conversation to begin secure messaging.
        </div>
      );
    }

    if (messagesLoading) {
      return (
        <div className="flex flex-1 items-center justify-center text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading secure thread…
        </div>
      );
    }

    return (
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg rounded-2xl px-4 py-3 shadow ${
                isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
              }`}>
                {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
                {message.attachment_manifest?.length ? (
                  <div className={`mt-3 space-y-2 rounded-xl border px-3 py-2 text-xs ${isOwn ? 'border-blue-300 border-opacity-50' : 'border-gray-200'}`}>
                    {message.attachment_manifest.map((attachment) => (
                      <a
                        key={attachment.object_path}
                        href={attachment.signed_url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 hover:underline"
                      >
                        <span>{attachment.file_name || 'Attachment'}</span>
                        <span>{attachment.mime_type}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
                <div className={`mt-2 text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                  <span>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  {isOwn && (
                    <span className="ml-2">
                      {message.read_at ? 'Read' : message.delivered_at ? 'Delivered' : 'Sent'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {typingLabel && (
          <p className="text-xs text-gray-500">{typingLabel}</p>
        )}
      </div>
    );
  };

  const attachmentsUi = attachmentFiles.length ? (
    <div className="space-y-2">
      {attachmentFiles.map((file, index) => (
        <AttachmentPreview key={`${file.name}-${index}`} file={file} onRemove={() => removeAttachment(index)} />
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          HIPAA-compliant communications hub
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Coordinate with your oncology team, loop in AI summaries, and share clinical files without leaving the dashboard.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="rounded-3xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
            <span>Conversations</span>
            <button className="inline-flex items-center gap-1 text-blue-600">
              <Plus className="h-4 w-4" /> New
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {conversationsLoading && (
              <div className="text-sm text-gray-500">Loading conversations…</div>
            )}
            {conversations.map((conversation) => (
              <ConversationBadge
                key={conversation.id}
                label={
                  conversation.metadata?.title as string ||
                  conversation.participants.find((p) => p.user_id !== user?.id)?.display_name ||
                  'Care team thread'
                }
                urgency={conversation.urgency}
                active={resolvedConversation?.id === conversation.id}
                onClick={() => selectConversation(conversation.id)}
                lastMessageAt={conversation.last_message_at}
              />
            ))}
          </div>
        </aside>

        <section className="flex h-[70vh] flex-col rounded-3xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Conversation</p>
              <h2 className="text-lg font-semibold text-gray-900">
                {resolvedConversation?.metadata?.title as string || 'Secure thread'}
              </h2>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600">
              <Video className="h-4 w-4" /> Escalate to video
            </button>
          </div>

          {renderMessages()}

          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            {attachmentsUi}
            <div className="flex items-end gap-3">
              <div className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <textarea
                  rows={3}
                  value={composer}
                  onChange={(event) => triggerTyping(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full resize-none bg-transparent text-sm text-gray-900 focus:outline-none"
                  placeholder="Share updates, ask follow-ups, or prompt the AI assistant"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600"
                    >
                      <Paperclip className="h-4 w-4" /> Attach
                    </button>
                    <button className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600">
                      <Sparkles className="h-4 w-4" /> Summarize with AI
                    </button>
                  </div>
                  {typingLabel && <span>{typingLabel}</span>}
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!composer.trim() || isSending}
                className="rounded-2xl bg-blue-600 p-3 text-white shadow disabled:opacity-50"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleAttachmentChange} />
          </div>
        </section>

        <aside className="rounded-3xl border border-gray-200 bg-white p-4">
          <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">Clinical context</p>
            <p className="mt-1 text-blue-900/70">
              Upcoming appointments, recent labs, and medication schedules will surface here to keep the care team in sync during the chat.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <button className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Share latest lab results
            </button>
            <button className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Request oncology callback
            </button>
            <button className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Auto-generate visit summary
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

const MessagingSuite: React.FC = () => (
  <CommunicationsProvider>
    <div className="mx-auto max-w-7xl px-4 py-6">
      <ChatWorkspace />
    </div>
  </CommunicationsProvider>
);

export default MessagingSuite;
