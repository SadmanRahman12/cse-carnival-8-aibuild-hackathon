'use client';

import React, { useState, useEffect } from 'react';
import { Key, X, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: string, apiKey: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [provider, setProvider] = useState('Autonomous Engine');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('campusos_provider') || 'Autonomous Engine';
      const savedKey = localStorage.getItem('campusos_api_key') || '';
      setProvider(savedProvider);
      setApiKey(savedKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('campusos_provider', provider);
      localStorage.setItem('campusos_api_key', apiKey.trim());
    }
    onSave(provider, apiKey.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Key className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">AI Agent Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          CampusOS works <strong>out-of-the-box with the Built-in Autonomous Tool-Calling Engine</strong> without requiring any API keys. You can also plug in an OpenAI or Groq key if you wish.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">AI Engine / Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Autonomous Engine">Autonomous Built-in Tool Engine (No Key Required)</option>
              <option value="openai">OpenAI (gpt-4o-mini)</option>
              <option value="groq">Groq (llama-3.3-70b-versatile)</option>
            </select>
          </div>

          {provider !== 'Autonomous Engine' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {provider === 'openai' ? 'OpenAI API Key' : 'Groq API Key'}
              </label>
              <input
                type="password"
                placeholder={provider === 'openai' ? 'sk-...' : 'gsk_...'}
                value={apiKey}
                required
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Keys can also be placed in your <code>.env</code> file.
              </p>
            </div>
          )}

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full Tool Calling Guarantee</span>
            </div>
            <p className="text-slate-400">
              Regardless of provider, all 5 capabilities (reads, multi-source combine, 4-gate constraint validation, clarification, and refusal) are fully guaranteed against the live datastore.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
