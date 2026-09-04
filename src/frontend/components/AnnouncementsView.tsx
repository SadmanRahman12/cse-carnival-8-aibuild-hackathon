'use client';

import React, { useState } from 'react';
import { Announcement } from '@/backend/types';
import { Plus, Search, Trash2, Edit3, Bell, Calendar, User, Clock, AlertCircle } from 'lucide-react';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  onRefresh: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ announcements, onRefresh, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [postedBy, setPostedBy] = useState('Department Authority');
  const [date, setDate] = useState('2026-09-04');
  const [expires, setExpires] = useState('2026-09-15');

  const filtered = announcements.filter((a) => {
    const matchesPriority = selectedPriority === 'All' || a.priority.toLowerCase() === selectedPriority.toLowerCase();
    const matchesQuery =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.posted_by.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesQuery;
  });

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setBody('');
    setPriority('high');
    setPostedBy('Prof. Dr. Faisal Muhammad Shah');
    setDate('2026-09-04');
    setExpires('2026-09-20');
    setIsModalOpen(true);
  };

  const openEditModal = (a: Announcement) => {
    setEditingItem(a);
    setTitle(a.title);
    setBody(a.body);
    setPriority(a.priority);
    setPostedBy(a.posted_by);
    setDate(a.date);
    setExpires(a.expires);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingItem) {
        const res = await fetch(`/api/announcements/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            priority,
            posted_by: postedBy,
            date,
            expires,
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Updated announcement: "${title}"`);
          setIsModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to update announcement', 'error');
        }
      } else {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            priority,
            posted_by: postedBy,
            date,
            expires,
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Published new announcement: "${title}"`);
          setIsModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to publish announcement', 'error');
        }
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, titleStr: string) => {
    if (!confirm(`Delete announcement "${titleStr}"?`)) return;

    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Deleted announcement: "${titleStr}"`);
        onRefresh();
      } else {
        onShowToast(data.error || 'Failed to delete announcement', 'error');
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
            placeholder="Search announcements by keyword, instructor, course..."
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
          <span>Post Notice</span>
        </button>
      </div>

      {/* Priority Filters */}
      <div className="flex items-center space-x-2">
        {['All', 'High', 'Medium', 'Low'].map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPriority(p)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedPriority === p
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((a) => {
          const isHigh = a.priority === 'high';
          const isMed = a.priority === 'medium';

          return (
            <div
              key={a.id}
              className={`bg-slate-950/70 border rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:bg-slate-950 flex flex-col justify-between ${
                isHigh ? 'border-rose-500/30' : isMed ? 'border-amber-500/25' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      isHigh
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : isMed
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                    }`}
                  >
                    {a.priority} Priority
                  </span>

                  <span className="text-xs text-slate-500">Expires: {a.expires}</span>
                </div>

                <h4 className="text-base font-bold text-white tracking-tight mt-2 mb-2">
                  {a.title}
                </h4>

                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed mb-4">
                  {a.body}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{a.posted_by}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{a.date}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-slate-800/40">
                <button
                  onClick={() => openEditModal(a)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Edit notice"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(a.id, a.title)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  title="Delete notice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">{editingItem ? 'Edit Announcement' : 'Post New Notice'}</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE 4113 Class Rescheduled"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notice Body / Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type the full notice announcement..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date Posted</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Expires Date</label>
                  <input
                    type="date"
                    value={expires}
                    onChange={(e) => setExpires(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Posted By / Author *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Dr. Md. Shahriar Mahbub"
                  value={postedBy}
                  onChange={(e) => setPostedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
