'use client';

import React, { useState } from 'react';
import { Room, Booking } from '@/backend/types';
import { Plus, Search, Trash2, Edit3, Users, Monitor, CalendarCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface RoomsViewProps {
  rooms: Room[];
  onRefresh: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({ rooms, onRefresh, onShowToast }) => {
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // Modals
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState<Room | null>(null);
  const [isBookingsListOpen, setIsBookingsListOpen] = useState(false);
  const [viewingBookingsRoom, setViewingBookingsRoom] = useState<Room | null>(null);

  // Room Form States
  const [roomNumber, setRoomNumber] = useState('');
  const [type, setType] = useState<'classroom' | 'lab' | 'seminar'>('classroom');
  const [capacity, setCapacity] = useState<number>(40);
  const [equipmentInput, setEquipmentInput] = useState('projector, whiteboard, AC');
  const [floor, setFloor] = useState<number>(7);
  const [status, setStatus] = useState<'available' | 'unavailable'>('available');

  // Booking Form States
  const [bookDate, setBookDate] = useState('2026-09-05');
  const [bookStartTime, setBookStartTime] = useState('14:00');
  const [bookEndTime, setBookEndTime] = useState('16:00');
  const [bookedBy, setBookedBy] = useState('Student');
  const [purpose, setPurpose] = useState('Group Project & Study');
  const [capacityNeeded, setCapacityNeeded] = useState<number>(10);

  const [submitting, setSubmitting] = useState(false);

  // Filter logic
  const filtered = rooms.filter((r) => {
    const matchesType = selectedType === 'All' || r.type.toLowerCase() === selectedType.toLowerCase();
    const matchesQuery =
      r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.equipment.some((eq) => eq.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesEq =
      selectedEquipment.length === 0 ||
      selectedEquipment.every((req) => r.equipment.some((eq) => eq.toLowerCase().includes(req.toLowerCase())));

    return matchesType && matchesQuery && matchesEq;
  });

  const toggleEquipmentFilter = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((item) => item !== eq) : [...prev, eq]
    );
  };

  const openAddRoomModal = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setType('classroom');
    setCapacity(40);
    setEquipmentInput('projector, whiteboard, AC');
    setFloor(7);
    setStatus('available');
    setIsRoomModalOpen(true);
  };

  const openEditRoomModal = (r: Room) => {
    setEditingRoom(r);
    setRoomNumber(r.room_number);
    setType(r.type);
    setCapacity(r.capacity);
    setEquipmentInput(r.equipment.join(', '));
    setFloor(r.floor);
    setStatus(r.status);
    setIsRoomModalOpen(true);
  };

  const openBookingModal = (r: Room) => {
    setTargetRoom(r);
    setBookDate('2026-09-05');
    setBookStartTime('14:00');
    setBookEndTime('16:00');
    setBookedBy('Sakibul Hassan');
    setPurpose('AI Project Discussion');
    setCapacityNeeded(Math.min(r.capacity, 15));
    setIsBookModalOpen(true);
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const eqList = equipmentInput.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      if (editingRoom) {
        const res = await fetch(`/api/rooms/${editingRoom.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_number: roomNumber,
            type,
            capacity: Number(capacity),
            equipment: eqList,
            floor: Number(floor),
            status,
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Updated Room ${roomNumber}`);
          setIsRoomModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to update room', 'error');
        }
      } else {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_number: roomNumber,
            type,
            capacity: Number(capacity),
            equipment: eqList,
            floor: Number(floor),
            status,
          }),
        });
        const data = await res.json();
        if (data.success) {
          onShowToast(`Added new Room ${roomNumber}`);
          setIsRoomModalOpen(false);
          onRefresh();
        } else {
          onShowToast(data.error || 'Failed to add room', 'error');
        }
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoom) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/rooms/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: targetRoom.room_number,
          date: bookDate,
          start_time: bookStartTime,
          end_time: bookEndTime,
          booked_by: bookedBy,
          purpose,
          capacity_needed: Number(capacityNeeded),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Successfully booked Room ${targetRoom.room_number}! (ID: ${data.booking?.booking_id})`);
        setIsBookModalOpen(false);
        onRefresh();
      } else {
        onShowToast(data.reason || 'Booking rejected by constraint check', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (roomNumber: string, bookingId: string) => {
    if (!confirm(`Cancel booking ${bookingId}?`)) return;

    try {
      const res = await fetch('/api/rooms/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: roomNumber,
          booking_id: bookingId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Cancelled booking ${bookingId}`);
        setIsBookingsListOpen(false);
        onRefresh();
      } else {
        onShowToast(data.reason || 'Failed to cancel booking', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const handleDeleteRoom = async (id: string, roomNum: string) => {
    if (!confirm(`Are you sure you want to delete Room ${roomNum}?`)) return;

    try {
      const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Deleted Room ${roomNum}`);
        onRefresh();
      } else {
        onShowToast(data.error || 'Failed to delete room', 'error');
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
            placeholder="Search rooms (e.g. 7A02, lab, projector)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
          />
        </div>

        <button
          onClick={openAddRoomModal}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Room</span>
        </button>
      </div>

      {/* Type Filter & Quick Equipment Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-2">
          {['All', 'Classroom', 'Lab', 'Seminar'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedType === t
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Equipment Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-xs mr-1">Equipment:</span>
          {['projector', 'smart board', 'computers', 'AC'].map((eq) => {
            const isSelected = selectedEquipment.includes(eq);
            return (
              <button
                key={eq}
                onClick={() => toggleEquipmentFilter(eq)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  isSelected
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                +{eq}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((room) => {
          const bookingsCount = room.bookings?.length || 0;
          return (
            <div
              key={room.id}
              className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-md hover:bg-slate-950 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-tight">{room.room_number}</h4>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      {room.type} • Floor {room.floor}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      room.status === 'available'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-300 my-2">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Capacity: <strong className="text-white">{room.capacity}</strong> seats</span>
                </div>

                {/* Equipment chips */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {room.equipment.map((eq, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      {eq}
                    </span>
                  ))}
                </div>

                {/* Existing Bookings Badge */}
                {bookingsCount > 0 ? (
                  <button
                    onClick={() => {
                      setViewingBookingsRoom(room);
                      setIsBookingsListOpen(true);
                    }}
                    className="mt-3 text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 underline decoration-dotted"
                  >
                    <span>{bookingsCount} active booking(s)</span>
                  </button>
                ) : (
                  <div className="mt-3 text-[11px] text-slate-500 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>No conflicting bookings</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/60">
                <button
                  onClick={() => openBookingModal(room)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Book Room</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditRoomModal(room)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Edit Room"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.id, room.room_number)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete Room"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Book Room Modal */}
      {isBookModalOpen && targetRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Book Room {targetRoom.room_number}</h3>
              <button onClick={() => setIsBookModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Type: {targetRoom.type} • Max Capacity: {targetRoom.capacity} seats • Equipment: {targetRoom.equipment.join(', ')}
            </p>

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Date (YYYY-MM-DD) *</label>
                <input
                  type="date"
                  required
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Time (24h) *</label>
                  <input
                    type="text"
                    required
                    placeholder="14:00"
                    value={bookStartTime}
                    onChange={(e) => setBookStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Time (24h) *</label>
                  <input
                    type="text"
                    required
                    placeholder="16:00"
                    value={bookEndTime}
                    onChange={(e) => setBookEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Booked By *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sakibul Hassan"
                    value={bookedBy}
                    onChange={(e) => setBookedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Party Size *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={targetRoom.capacity}
                    value={capacityNeeded}
                    onChange={(e) => setCapacityNeeded(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Hackathon Team Meeting"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Checking Gates...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Bookings List Modal */}
      {isBookingsListOpen && viewingBookingsRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Bookings for Room {viewingBookingsRoom.room_number}</h3>
              <button onClick={() => setIsBookingsListOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {viewingBookingsRoom.bookings?.map((b) => (
                <div key={b.booking_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">{b.booking_id}</span>
                      <span className="text-xs text-white font-medium">• {b.booked_by}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      📅 {b.date} | ⏰ {b.start_time} – {b.end_time}
                    </p>
                    <p className="text-xs text-slate-300 italic">"{b.purpose}"</p>
                  </div>
                  <button
                    onClick={() => handleCancelBooking(viewingBookingsRoom.room_number, b.booking_id)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs"
                    title="Cancel this booking"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">{editingRoom ? 'Edit Room' : 'Add New Campus Room'}</h3>

            <form onSubmit={handleRoomSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Room Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7A08"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="classroom">Classroom</option>
                    <option value="lab">Lab</option>
                    <option value="seminar">Seminar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Floor</label>
                  <input
                    type="number"
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Equipment (comma-separated)</label>
                <input
                  type="text"
                  placeholder="projector, whiteboard, AC, smart board"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
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
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable (Maintenance)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
