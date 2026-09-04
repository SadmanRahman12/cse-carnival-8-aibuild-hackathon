'use client';

import React from 'react';
import { Sparkles, RefreshCw, Layers, Calendar, DoorOpen, PartyPopper, Bell, BookOpen, Key, Bot } from 'lucide-react';

export type EntityTab = 'schedules' | 'rooms' | 'events' | 'announcements' | 'assignments';

interface HeaderProps {
  activeTab: EntityTab;
  setActiveTab: (tab: EntityTab) => void;
  onResetDb: () => void;
  isResetting: boolean;
  onOpenApiKeyModal: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  activeProvider: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onResetDb,
  isResetting,
  onOpenApiKeyModal,
  onToggleChat,
  isChatOpen,
  activeProvider,
}) => {
  const tabs: { id: EntityTab; label: string; icon: React.ReactNode; countLabel?: string }[] = [
    { id: 'schedules', label: 'Schedules', icon: <Calendar className="w-4 h-4" /> },
    { id: 'rooms', label: 'Rooms & Labs', icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'events', label: 'Campus Events', icon: <PartyPopper className="w-4 h-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Bell className="w-4 h-4" /> },
    { id: 'assignments', label: 'Assignments', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Semester Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Layers className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">CampusOS</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Truth Layer
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">AUST Campus Timetable & Intelligent Platform</p>
            </div>
          </div>

          {/* Center / Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Buttons: Reset, Settings, AI Agent Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onResetDb}
              disabled={isResetting}
              title="Reset all 5 entities back to original seed data"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 text-xs flex items-center space-x-1 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden lg:inline text-slate-300">Reset Seeds</span>
            </button>

            <button
              onClick={onOpenApiKeyModal}
              title="Configure AI Provider or API Key"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 text-xs flex items-center space-x-1.5 transition"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline text-xs text-slate-300">{activeProvider}</span>
            </button>

            <button
              onClick={onToggleChat}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isChatOpen
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-semibold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Agent</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center space-x-1 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/60">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white bg-slate-950/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
