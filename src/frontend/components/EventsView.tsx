'use client';

import React, { useState } from 'react';
import { EventItem } from '@/backend/types';
import { Plus, Search, Trash2, Edit3, Users, Calendar, Clock, MapPin, UserPlus, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface EventsViewProps {
  events: EventItem[];
  onRefresh: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ events, onRefresh, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [targetEvent, setTargetEvent] = useState<EventItem | null>(null);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [viewingAttendeesEvent, setViewingAttendeesEvent] = useState<EventItem | null>(null);

  // Event Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2026-09-10');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [venue, setVenue] = useState('7C01');
  const [organizer, setOrganizer] = useState('AUSTPIC');
  const [capacity, setCapacity] = useState<number>(50);
  const [status, setStatus] = useState<EventItem['status']>('upcoming');

  // Registration Form state
  const [studentId, setStudentId] = useState('20-40532');
  const [studentName, setStudentName] = useState('Sakibul Hassan');
  const [submitting, setSubmitting] = useState(false);

  const filtered = events.filter((e) => {
    const matchesStatus = selectedStatus === 'All' || e.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesQuery =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const openAddEventModal = () => {
    setEditingEvent(null);
    setName('');
    setDescription('');
    setDate('2026-09-15');
    setStartTime('11:00');
    setEndTime('13:00');
    setVenue('7C01');
    setOrganizer('CSE Department');
    setCapacity(50);
    setStatus('upcoming');
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (e: EventItem) => {
    setEditingEvent(e);
    setName(e.name);
    setDescription(e.description);
    setDate(e.date);
    setStartTime(e.start_time);
    setEndTime(e.end_time);
    setVenue(e.venue);
    setOrganizer(e.organizer);
    setCapacity(e.capacity);
    setStatus(e.status);
    setIsEventModalOpen(true);
  };

  const openRegisterModal = (e: EventItem) => {
    setTargetEvent(e);
    setStudentId('20-40532');
    setStudentName('Sakibul Hassan');
    setIsRegisterModalOpen(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingEvent) {
        const res = await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            date,
            start_time: startTime,
            end_time: endTime,
            venue,
            organizer,
            capacity: Number(capacity),
            status,
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Updated event: ${name}`);
          setIsEventModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to update event', 'error');
        }
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            date,
            start_time: startTime,
            end_time: endTime,
            venue,
            organizer,
            capacity: Number(capacity),
            status,
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Created new event: ${name}`);
          setIsEventModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to create event', 'error');
        }
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEvent) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: targetEvent.id,
          student_id: studentId,
          student_name: studentName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Successfully registered ${studentName} for ${targetEvent.name}!`);
        setIsRegisterModalOpen(false);
        onRefresh();
      } else {
        onShowToast(data.reason || 'Registration failed constraint gate check', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, eventName: string) => {
    if (!confirm(`Delete event "${eventName}"?`)) return;

    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Deleted event: ${eventName}`);
        onRefresh();
      } else {
        onShowToast(data.error || 'Failed to delete event', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search events, workshops, hackathons, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
          />
        </div>

        <button
          onClick={openAddEventModal}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', 'Upcoming', 'Full', 'Completed', 'Cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedStatus === st
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((ev) => {
          const percentFull = Math.min(100, Math.round((ev.registered / ev.capacity) * 100));
          const isFull = ev.registered >= ev.capacity || ev.status === 'full';

          return (
            <div
              key={ev.id}
              className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:bg-slate-950 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    {ev.organizer}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      isFull
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isFull ? 'Full' : ev.status}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white tracking-tight line-clamp-2 mt-1 mb-2">
                  {ev.name}
                </h4>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                  {ev.description}
                </p>

                <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{ev.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>{ev.start_time} – {ev.end_time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Venue: Room {ev.venue}</span>
                  </div>
                </div>

                {/* Capacity Progress */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setViewingAttendeesEvent(ev);
                        setIsAttendeesModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-white underline decoration-dotted flex items-center space-x-1"
                    >
                      <Users className="w-3 h-3" />
                      <span>{ev.registered} / {ev.capacity} registered</span>
                    </button>
                    <span className="font-semibold text-slate-300">{percentFull}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentFull >= 100 ? 'bg-rose-500' : percentFull > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentFull}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/60">
                <button
                  onClick={() => openRegisterModal(ev)}
                  disabled={isFull || ev.status === 'cancelled'}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isFull
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isFull ? 'Seats Full' : 'Register'}</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditEventModal(ev)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Edit Event"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(ev.id, ev.name)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Modal */}
      {isRegisterModalOpen && targetEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Event Registration</h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Registering for: <strong className="text-white">{targetEvent.name}</strong> ({targetEvent.registered}/{targetEvent.capacity} seats taken)
            </p>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Student ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20-40532"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sakibul Hassan"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendees Modal */}
      {isAttendeesModalOpen && viewingAttendeesEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Registered Attendees</h3>
              <button onClick={() => setIsAttendeesModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {viewingAttendeesEvent.name} • Total: {viewingAttendeesEvent.registered} / {viewingAttendeesEvent.capacity}
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {viewingAttendeesEvent.registrations?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No individual registrations recorded yet.</p>
              ) : (
                viewingAttendeesEvent.registrations?.map((r, i) => (
                  <div key={i} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{r.name}</span>
                    <span className="font-mono text-emerald-400">{r.student_id}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>

            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AUSTPIC AI Build Hackathon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe event..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start *</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End *</label>
                  <input
                    type="text"
                    required
                    placeholder="13:00"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7C01"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Capacity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="upcoming">upcoming</option>
                    <option value="ongoing">ongoing</option>
                    <option value="completed">completed</option>
                    <option value="full">full</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Organizer</label>
                <input
                  type="text"
                  placeholder="e.g. AUSTPIC"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
