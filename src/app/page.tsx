'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header, EntityTab } from '@/frontend/components/Header';
import { SchedulesView } from '@/frontend/components/SchedulesView';
import { RoomsView } from '@/frontend/components/RoomsView';
import { EventsView } from '@/frontend/components/EventsView';
import { AnnouncementsView } from '@/frontend/components/AnnouncementsView';
import { AssignmentsView } from '@/frontend/components/AssignmentsView';
import { AgentChat } from '@/frontend/components/AgentChat';
import { SettingsModal } from '@/frontend/components/SettingsModal';
import { Schedule, Room, EventItem, Announcement, Assignment } from '@/backend/types';
import { Sparkles, Calendar, DoorOpen, PartyPopper, Bell, BookOpen, CheckCircle2, AlertCircle, RefreshCw, Bot } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function CampusOSDashboard() {
  const [activeTab, setActiveTab] = useState<EntityTab>('announcements');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState('Autonomous Engine');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Fetch all live data from the single REST API
  const fetchAllData = useCallback(async (quiet = false) => {
    try {
      const [schedRes, roomRes, eventRes, annRes, asgnRes] = await Promise.all([
        fetch('/api/schedules').then((r) => r.json()),
        fetch('/api/rooms').then((r) => r.json()),
        fetch('/api/events').then((r) => r.json()),
        fetch('/api/announcements').then((r) => r.json()),
        fetch('/api/assignments').then((r) => r.json()),
      ]);

      if (schedRes.success) setSchedules(schedRes.data || []);
      if (roomRes.success) setRooms(roomRes.data || []);
      if (eventRes.success) setEvents(eventRes.data || []);
      if (annRes.success) setAnnouncements(annRes.data || []);
      if (asgnRes.success) setAssignments(asgnRes.data || []);

      if (!quiet) {
        // Initial load
      }
    } catch (err: any) {
      console.error('Failed fetching campus data:', err);
      showToast(`Error fetching live data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllData();
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('campusos_provider');
      if (savedProvider) setActiveProvider(savedProvider);
    }
  }, [fetchAllData]);

  // Reset database back to seed files
  const handleResetDb = async () => {
    if (!confirm('Reset all 5 entities back to original seed data? All custom additions/edits will be reinitialized.')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Successfully restored all 5 systems to initial seed data!');
        fetchAllData(true);
      } else {
        showToast(json.error || 'Failed resetting database', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Metrics summary
  const totalBookings = rooms.reduce((acc, r) => acc + (r.bookings?.length || 0), 0);
  const totalRegistrations = events.reduce((acc, e) => acc + e.registered, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetDb={handleResetDb}
        isResetting={isResetting}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
        isChatOpen={isChatOpen}
        activeProvider={activeProvider}
      />

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 ${isChatOpen ? 'lg:mr-[520px]' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div
              onClick={() => setActiveTab('schedules')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'schedules'
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Schedules</span>
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">{schedules.length}</div>
              <span className="text-[10px] text-slate-500">Weekly class slots</span>
            </div>

            <div
              onClick={() => setActiveTab('rooms')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'rooms'
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Rooms & Labs</span>
                <DoorOpen className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">{rooms.length}</div>
              <span className="text-[10px] text-teal-400">{totalBookings} active bookings</span>
            </div>

            <div
              onClick={() => setActiveTab('events')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'events'
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Campus Events</span>
                <PartyPopper className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">{events.length}</div>
              <span className="text-[10px] text-amber-400">{totalRegistrations} registered</span>
            </div>

            <div
              onClick={() => setActiveTab('announcements')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'announcements'
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Announcements</span>
                <Bell className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">{announcements.length}</div>
              <span className="text-[10px] text-rose-400">Notices active</span>
            </div>

            <div
              onClick={() => setActiveTab('assignments')}
              className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'assignments'
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Assignments</span>
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">{assignments.length}</div>
              <span className="text-[10px] text-purple-400">Course tasks</span>
            </div>
          </div>

          {/* Canonical Live-Sync Test Banner */}
          <div className="bg-gradient-to-r from-emerald-950/50 via-slate-950 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  The Non-Negotiable Canonical Acceptance Bar
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Edit an announcement or booking in the dashboard below → immediately ask the AI Agent in the right drawer. The agent reads live backend data instantly with <strong>zero cache, zero retraining, zero lag</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsChatOpen(true)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-semibold whitespace-nowrap transition shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 self-end sm:self-auto"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Test Live Agent</span>
            </button>
          </div>

          {/* Tab Views */}
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Connecting to persistent CampusOS datastore...</p>
            </div>
          ) : (
            <div className="transition-all duration-200">
              {activeTab === 'schedules' && (
                <SchedulesView
                  schedules={schedules}
                  onRefresh={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'rooms' && (
                <RoomsView
                  rooms={rooms}
                  onRefresh={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'events' && (
                <EventsView
                  events={events}
                  onRefresh={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'announcements' && (
                <AnnouncementsView
                  announcements={announcements}
                  onRefresh={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'assignments' && (
                <AssignmentsView
                  assignments={assignments}
                  onRefresh={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* AI Agent Chat Drawer */}
      <AgentChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeProvider={activeProvider}
        onDataMutated={() => fetchAllData(true)}
      />

      {/* Floating Chat Trigger for Mobile / when closed */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-30 p-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center space-x-2 transition-all transform hover:scale-105 font-bold text-sm"
        >
          <Bot className="w-5 h-5" />
          <span>CampusOS AI</span>
          <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping"></span>
        </button>
      )}

      {/* Settings / API Key Modal */}
      <SettingsModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={(prov) => {
          setActiveProvider(prov);
          showToast(`Agent provider switched to ${prov}`);
        }}
      />

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 left-6 z-50 space-y-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3 rounded-xl border shadow-xl text-xs flex items-center space-x-2 transition-all duration-300 pointer-events-auto ${
              t.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-slate-950/95 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span className="font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
