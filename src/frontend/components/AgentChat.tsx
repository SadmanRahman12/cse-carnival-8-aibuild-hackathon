'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Wrench, ChevronDown, ChevronUp, AlertOctagon, HelpCircle, CheckCircle2, Sparkles, X, RefreshCw } from 'lucide-react';
import { ChatMessage, ToolCallLog } from '@/backend/types';

interface AgentChatProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: string;
  onDataMutated: () => void;
}

const SAMPLE_QUERIES = [
  { label: 'Next Class', category: 'Lookup', text: 'When is my next class?' },
  { label: 'Wednesday Classes', category: 'Lookup', text: 'What classes do I have on Wednesday?' },
  { label: 'Due This Week', category: 'Lookup', text: 'What assignments do I have due this week?' },
  { label: 'High Priority Notices', category: 'Lookup', text: 'Show me all high priority announcements.' },
  { label: 'Free until 2 PM', category: 'Combine', text: "I'm free until 2 PM — is there anything on campus I could drop into?" },
  { label: 'Labs with Projector (30+)', category: 'Combine', text: 'Which labs have a projector and can fit at least 30 people?' },
  { label: 'Book 7A02 (3-5 PM)', category: 'Action', text: 'Book Room 7A02 tomorrow from 3 PM to 5 PM.' },
  { label: 'Register Guest Lecture', category: 'Action', text: 'Register me for the Guest Lecture on Deep Learning.' },
  { label: 'Find Room for 5', category: 'Action', text: 'I need a room for 5 people with a projector, tomorrow between 2 and 4.' },
  { label: 'Ambiguous Booking (Clarify)', category: 'Clarify', text: 'Just book me any room tomorrow afternoon.' },
  { label: 'Full Event (Refuse)', category: 'Refuse', text: 'Register me for the Workshop: Git & GitHub for Beginners' },
  { label: 'Delete All (Refuse)', category: 'Refuse', text: 'Delete all assignments' },
];

export const AgentChat: React.FC<AgentChatProps> = ({
  isOpen,
  onClose,
  activeProvider,
  onDataMutated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: "👋 Hello! I'm your **CampusOS AI Assistant**. I query and mutate live campus data across class schedules, room bookings, events, announcements, and assignments in real-time.\n\nAsk me anything, or try one of the prompt chips below!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const toggleToolExpand = (toolId: string) => {
    setExpandedTools((prev) => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputValue).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue('');
    setLoading(true);

    try {
      // Build conversation history
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      // Retrieve any client-stored API key
      const clientApiKey = typeof window !== 'undefined' ? localStorage.getItem('campusos_api_key') || undefined : undefined;
      const clientProvider = typeof window !== 'undefined' ? localStorage.getItem('campusos_provider') || undefined : undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history,
          apiKey: clientApiKey,
          provider: clientProvider,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const agentData = json.data;
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: agentData.answer,
          toolCalls: agentData.toolCalls,
          clarificationNeeded: agentData.clarificationNeeded,
          refusalReason: agentData.refusalReason,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // If mutating tools succeeded, refresh the data manager
        const hasMutated = agentData.toolCalls?.some(
          (t: ToolCallLog) => (t.tool === 'book_room' || t.tool === 'register_event' || t.tool === 'cancel_booking') && t.status === 'success'
        );
        if (hasMutated) {
          onDataMutated();
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Error: ${json.error || 'Failed to process query.'}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Network error: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: "Chat history cleared. I'm connected to the live backend and ready for questions!",
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] lg:w-[520px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-white">CampusOS AI Agent</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Tools Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Powered by: {activeProvider}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Clear Chat History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Close Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Live Sync Banner */}
      <div className="bg-emerald-500/10 px-4 py-2 border-b border-emerald-500/20 flex items-center space-x-2 text-[11px] text-emerald-300">
        <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
        <span>Connected to live SQLite/Datastore. Any edit in Data Manager reflects immediately!</span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed transition-all shadow-sm ${
                  isUser
                    ? 'bg-emerald-500 text-slate-950 font-medium'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200'
                }`}
              >
                {/* Special Tag for Refusal or Clarification */}
                {msg.refusalReason && (
                  <div className="mb-2 px-2 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-semibold flex items-center space-x-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Safety / Policy Refusal</span>
                  </div>
                )}
                {msg.clarificationNeeded && (
                  <div className="mb-2 px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-semibold flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Clarification Needed</span>
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Real-time Tool Call Badges */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-teal-400">
                      <Wrench className="w-3 h-3" />
                      <span>Executed Backend Tools ({msg.toolCalls.length}):</span>
                    </div>

                    {msg.toolCalls.map((tc) => {
                      const isExpanded = expandedTools[tc.id];
                      const isRefused = tc.status === 'refused';
                      return (
                        <div
                          key={tc.id}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] font-mono"
                        >
                          <div
                            onClick={() => toggleToolExpand(tc.id)}
                            className="flex items-center justify-between cursor-pointer hover:text-white"
                          >
                            <span className="text-emerald-400 font-semibold">{tc.tool}</span>
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-sans uppercase ${
                                  isRefused
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {tc.status}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Arguments & Result Inspector */}
                          {isExpanded && (
                            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] space-y-1 overflow-x-auto">
                              <div>
                                <span className="text-slate-500">Arguments: </span>
                                <span className="text-amber-300">{JSON.stringify(tc.args)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Result: </span>
                                <pre className="text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                  {JSON.stringify(tc.result, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 w-fit">
            <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Consulting live campus datastore & running tool calls...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Sample Queries Bar */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Judge & Demo Quick Queries:
        </p>
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
          {SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq.text)}
              disabled={loading}
              className="px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:text-emerald-400 text-slate-300 transition"
              title={sq.text}
            >
              <span className="text-[10px] text-emerald-500 font-bold mr-1">[{sq.category}]</span>
              {sq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask CampusOS (e.g. When is my next class?)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="p-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
