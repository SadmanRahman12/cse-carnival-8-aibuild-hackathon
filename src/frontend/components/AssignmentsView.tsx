'use client';

import React, { useState } from 'react';
import { Assignment } from '@/backend/types';
import { Plus, Search, Trash2, Edit3, CheckCircle, Clock, BookOpen, ExternalLink, Award } from 'lucide-react';

interface AssignmentsViewProps {
  assignments: Assignment[];
  onRefresh: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ assignments, onRefresh, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Assignment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [course, setCourse] = useState('CSE 4113');
  const [courseTitle, setCourseTitle] = useState('Pattern Recognition');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDate, setAssignedDate] = useState('2026-08-30');
  const [deadline, setDeadline] = useState('2026-09-12');
  const [submissionPlatform, setSubmissionPlatform] = useState('Google Classroom');
  const [status, setStatus] = useState<Assignment['status']>('pending');
  const [marks, setMarks] = useState<number>(10);

  const filtered = assignments.filter((a) => {
    const matchesStatus = selectedStatus === 'All' || a.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesQuery =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const openAddModal = () => {
    setEditingItem(null);
    setCourse('CSE 4113');
    setCourseTitle('Pattern Recognition');
    setTitle('');
    setDescription('');
    setAssignedDate('2026-09-01');
    setDeadline('2026-09-15');
    setSubmissionPlatform('Google Classroom');
    setStatus('pending');
    setMarks(10);
    setIsModalOpen(true);
  };

  const openEditModal = (a: Assignment) => {
    setEditingItem(a);
    setCourse(a.course);
    setCourseTitle(a.course_title);
    setTitle(a.title);
    setDescription(a.description);
    setAssignedDate(a.assigned_date);
    setDeadline(a.deadline);
    setSubmissionPlatform(a.submission_platform);
    setStatus(a.status);
    setMarks(a.marks);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingItem) {
        const res = await fetch(`/api/assignments/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course,
            course_title: courseTitle,
            title,
            description,
            assigned_date: assignedDate,
            deadline,
            submission_platform: submissionPlatform,
            status,
            marks: Number(marks),
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Updated assignment: "${title}"`);
          setIsModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to update assignment', 'error');
        }
      } else {
        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course,
            course_title: courseTitle,
            title,
            description,
            assigned_date: assignedDate,
            deadline,
            submission_platform: submissionPlatform,
            status,
            marks: Number(marks),
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Created new assignment: "${title}"`);
          setIsModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to create assignment', 'error');
        }
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, titleStr: string) => {
    if (!confirm(`Delete assignment "${titleStr}"?`)) return;

    try {
      const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Deleted assignment: "${titleStr}"`);
        onRefresh();
      } else {
        onShowToast(data.error || 'Failed to delete assignment', 'error');
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
            placeholder="Search assignments by title, course, description..."
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
          <span>New Assignment</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2">
        {['All', 'Pending', 'Submitted', 'Graded', 'Late'].map((st) => (
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

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((a) => {
          const isPending = a.status === 'pending';
          const isSubmitted = a.status === 'submitted';

          return (
            <div
              key={a.id}
              className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:bg-slate-950 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-emerald-400 tracking-tight">{a.course}</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{a.course_title}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      isPending
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : isSubmitted
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white tracking-tight mt-1 mb-2">
                  {a.title}
                </h4>

                <p className="text-xs text-slate-300 line-clamp-3 mb-4 leading-relaxed">
                  {a.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-3 border-t border-slate-800/60">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Due: <strong className="text-slate-200">{a.deadline}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Marks: <strong className="text-slate-200">{a.marks} pts</strong></span>
                  </div>
                  <div className="col-span-2 flex items-center space-x-1.5 text-slate-400">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">Submit via: {a.submission_platform}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-slate-800/40">
                <button
                  onClick={() => openEditModal(a)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Edit assignment"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(a.id, a.title)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  title="Delete assignment"
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
            <h3 className="text-lg font-bold text-white">{editingItem ? 'Edit Assignment' : 'Add New Assignment'}</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Course Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Pattern Recognition"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assignment 1: Bayes Classifier"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Task Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Deadline *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
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
                    <option value="pending">pending</option>
                    <option value="submitted">submitted</option>
                    <option value="graded">graded</option>
                    <option value="late">late</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Submission Platform</label>
                <input
                  type="text"
                  placeholder="e.g. Google Classroom"
                  value={submissionPlatform}
                  onChange={(e) => setSubmissionPlatform(e.target.value)}
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
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
