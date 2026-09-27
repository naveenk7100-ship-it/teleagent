import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { BookingRequest, BookingStatus } from '../types';
import { api } from '../api/client';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Check,
  X,
  Info
} from 'lucide-react';

export const BookingsView: React.FC = () => {
  const { currentTenant, addNotification } = useApp();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadBookings = async () => {
    if (!currentTenant) return;
    try {
      const res = await api.getBookings(currentTenant.id);
      setBookings(res.bookings);
    } catch (err: any) {
      addNotification('error', 'Failed to load bookings', err.message);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [currentTenant]);

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      const updated = await api.updateBooking(id, { status: newStatus });
      addNotification('success', `Booking marked as ${newStatus}`);
      setBookings(prev => prev.map(b => b.id === id ? updated.booking : b));
    } catch (err: any) {
      addNotification('error', 'Failed to update booking', err.message);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return { label: 'Confirmed Slot', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'PENDING_APPROVAL':
        return { label: 'Pending Staff Approval', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'RESCHEDULED':
        return { label: 'Rescheduled', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'CANCELLED':
        return { label: 'Cancelled', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      default:
        return { label: status, color: 'bg-slate-800 text-slate-400 border-slate-750' };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold">
          <Calendar className="w-3.5 h-3.5" />
          <span>AI Receptionist Front Desk</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Appointment & Booking Requests
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Review and approve structured booking inquiries submitted by users through your AI Receptionist or Appointment Agents.
        </p>
      </div>

      {/* Real-World Honesty Alert */}
      <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Strict Integrity Notice:</strong> Unless automated calendar software (Google Calendar / Cal.com) is integrated, the AI agent politely sets expectations that all slots are recorded as requests and require staff confirmation.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookings by guest or service..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="RESCHEDULED">Rescheduled</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Bookings Grid */}
      {filteredBookings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-base text-slate-200">No booking requests found</h3>
          <p className="text-sm text-slate-400">Appointment requests collected by your AI Receptionist or Booking Agents will appear here in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBookings.map(b => {
            const badge = getStatusBadge(b.status);

            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl bg-slate-850/90 border border-slate-750 flex flex-col justify-between space-y-4 shadow-xl shadow-black/20"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{b.id}</span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-slate-100">{b.customerName}</h3>
                    <p className="text-sm text-sky-400 font-semibold">{b.serviceName}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-sm text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      <span>Date: <strong className="text-white">{b.requestedDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-sky-400" />
                      <span>Time: <strong className="text-white">{b.requestedTime}</strong></span>
                    </div>
                    {b.customerPhone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-sky-400" />
                        <span>Phone: <strong className="text-white">{b.customerPhone}</strong></span>
                      </div>
                    )}
                  </div>

                  {b.additionalNotes && (
                    <div className="text-xs text-slate-300 italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                      "{b.additionalNotes}"
                    </div>
                  )}
                </div>

                {/* Status Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  {b.status === 'PENDING_APPROVAL' ? (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Slot</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-750 hover:border-rose-500/30 font-semibold text-xs transition-colors"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs">
                      <span className="text-slate-500">Status updated</span>
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'PENDING_APPROVAL')}
                        className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                      >
                        Reopen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
