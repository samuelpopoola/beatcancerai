import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { geminiMedicalService } from '../services/geminiMedicalService';

type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string; ts?: string };

const GeminiChat: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user } = useApp();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { try { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); } catch (e) {} }, [messages]);

  const sendMessage = async () => {
    if (!acceptedDisclaimer) return alert('Please accept the medical disclaimer first.');
    if (!input.trim()) return;

    const id = String(Date.now());
    const userMsg: ChatMsg = { id: id + '-u', role: 'user', text: input.trim(), ts: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput('');

    // add assistant placeholder
    const assistantId = id + '-a';
    setMessages((m) => [...m, { id: assistantId, role: 'assistant', text: 'Thinking…', ts: new Date().toISOString() }] );

    setSending(true);
    try {
      const analysis = await geminiMedicalService.analyzeMedicalDocument(userMsg.text, { userId: user?.id });

      let reply = '';
      if (!analysis) {
        reply = 'No response from AI.';
      } else if ((analysis as any).patientFriendlySummary) {
        reply = (analysis as any).patientFriendlySummary;
      } else if ((analysis as any).diagnosis) {
        const d = (analysis as any).diagnosis;
        if (typeof d === 'string') reply = d;
        else if (d.primary) reply = d.primary + (d.notes ? ` — ${d.notes}` : '');
        else reply = JSON.stringify(d);
      } else if ((analysis as any).treatmentSuggestions) {
        reply = 'Treatment suggestions: ' + ((analysis as any).treatmentSuggestions || []).slice(0,3).map((t:any)=> typeof t === 'string'? t : t.name || t.title || JSON.stringify(t)).join('; ');
      } else if ((analysis as any).rawResponse) {
        reply = String((analysis as any).rawResponse).slice(0,1000);
      } else {
        reply = JSON.stringify(analysis).slice(0,2000);
      }

      setMessages((m) => m.map(msg => msg.id === assistantId ? { ...msg, text: reply } : msg));
    } catch (err: any) {
      setMessages((m) => m.map(msg => msg.id === assistantId ? { ...msg, text: `Error: ${String(err?.message || err)}` } : msg));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose && onClose()} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/40 w-full max-w-2xl h-[70vh] flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Chat with Gemini AI</h3>
          <div>
            <button className="text-sm text-gray-600 dark:text-gray-200" onClick={() => onClose && onClose()}>Close</button>
          </div>
        </div>

        <div ref={scrollRef} className="p-4 overflow-auto flex-1 space-y-3 bg-white dark:bg-gray-900">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
                <div>{m.text}</div>
                <div className="text-xs text-gray-300 dark:text-gray-400 mt-1">{m.ts ? new Date(m.ts).toLocaleString() : ''}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t flex items-center gap-2 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={acceptedDisclaimer} onChange={(e) => setAcceptedDisclaimer(e.target.checked)} className="mr-2" />
            <label className="text-sm text-gray-600 dark:text-gray-300">I accept medical disclaimer</label>
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            className="flex-1 p-2 rounded border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            placeholder="Message the AI about this record"
          />
          <button onClick={sendMessage} disabled={!acceptedDisclaimer || sending} className="btn-primary px-4 py-2 rounded">
            {sending ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiChat;
