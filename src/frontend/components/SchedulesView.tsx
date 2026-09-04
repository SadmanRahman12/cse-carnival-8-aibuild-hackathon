'use client';

import React, { useState } from 'react';
import { Schedule } from '@/backend/types';
import { Plus, Search, Trash2, Edit3, Clock, MapPin, User, BookOpen, AlertCircle } from 'lucide-react';

interface SchedulesViewProps {
  schedules: Schedule[];
  onRefresh: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

const DAYS = ['All', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export const SchedulesView: React.FC<SchedulesViewProps> = ({ schedules, onRefresh, onShowToast }) => {
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Schedule | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'>('Sunday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:15');
  const [room, setRoom] = useState('7A01');
  const [instructor, setInstructor] = useState('');
  const [section, setSection] = useState('A');

  const filtered = schedules.filter((s) => {
    const matchesDay = selectedDay === 'All' || s.day.toLowerCase() === selectedDay.toLowerCase();
    const matchesQuery =
      s.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDay && matchesQuery;
  });

  const openAddModal = () => {
    setEditingItem(null);
    setCourse('');
    setTitle('');
    setDay('Sunday');
    setStartTime('09:00');
    setEndTime('10:15');
    setRoom('7A01');
    setInstructor('');
    setSection('A');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Schedule) => {
    setEditingItem(item);
    setCourse(item.course);
    setTitle(item.title);
    setDay(item.day);
    setStartTime(item.start_time);
    setEndTime(item.end_time);
    setRoom(item.room);
    setInstructor(item.instructor);
    setSection(item.section);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingItem) {
        // Update
        const res = await fetch(`/api/schedules/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course,
            title,
            day,
            start_time: startTime,
            end_time: endTime,
            room,
            instructor,
            section,
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Updated schedule for ${course}`);
          setIsModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to update schedule', 'error');
        }
      } else {
        // Create
        const res = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course,
            title,
            day,
            start_time: startTime,
            end_time: endTime,
            room,
            instructor,
            section,
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Created new class schedule for ${course}`);
          setIsModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to add schedule', 'error');
        }
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, courseCode: string) => {
    if (!confirm(`Are you sure you want to delete schedule ${courseCode}?`)) return;

    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Deleted schedule ${courseCode}`);
        onRefresh();
      } else {
        onShowToast(data.error || 'Failed to delete schedule', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Day Filter Pills, Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by course code, title, room, or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
          />
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class</span>
        </button>
      </div>

      {/* Day Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedDay === d
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {d}
          </button>
        ))}
        <span className="text-xs text-slate-500 pl-2">Showing {filtered.length} of {schedules.length} slots</span>
      </div>

      {/* Schedules Grid / Cards */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 font-medium">No class schedules found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-md hover:bg-slate-950 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-base text-white tracking-tight">{s.course}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                      Sec {s.section}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {s.day}
                  </span>
                </div>

                <h4 className="text-sm font-medium text-slate-300 line-clamp-2 mb-3">{s.title}</h4>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{s.start_time} – {s.end_time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>Room {s.room}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{s.instructor}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end space-x-2 pt-4 mt-3 border-t border-slate-800/60">
                <button
                  onClick={() => openEditModal(s)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Edit schedule"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.course)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  title="Delete schedule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {editingItem ? 'Edit Class Schedule' : 'Add New Class Schedule'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE 4113"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Section</label>
                  <input
                    type="text"
                    placeholder="e.g. A, B, B1"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pattern Recognition and Machine Learning"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Day *</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start (24h) *</label>
                  <input
                    type="text"
                    required
                    placeholder="13:00"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End (24h) *</label>
                  <input
                    type="text"
                    required
                    placeholder="13:50"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Room Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7A07"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Instructor</label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. Dr. Shahriar Mahbub"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
