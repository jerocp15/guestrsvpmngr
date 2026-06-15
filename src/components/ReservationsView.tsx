/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Guest, RsvpStatus, EntryType } from "../types";
import { Search, Calendar, Filter, X, Edit, Trash2 } from "lucide-react";

interface ReservationsViewProps {
  guests: Guest[];
  onEditGuest: (guest: Guest) => void;
  onDeleteGuest: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: RsvpStatus) => void;
  onBulkUpdateStatus?: (ids: string[], newStatus: RsvpStatus) => void;
  onBulkDeleteGuests?: (ids: string[]) => void;
}

export default function ReservationsView({
  guests,
  onEditGuest,
  onDeleteGuest,
  onUpdateStatus,
  onBulkUpdateStatus,
  onBulkDeleteGuests
}: ReservationsViewProps) {
  const getTableIcon = (tableName: string) => {
    try {
      const cachedTables = localStorage.getItem("guest_rsvp_mngr_tables");
      if (cachedTables) {
        const parsed = JSON.parse(cachedTables);
        const match = parsed.find((t: any) => t.name === tableName);
        if (match && match.icon) return match.icon;
      }
    } catch (e) {}
    return "🔥";
  };

  // Filters State
  const [query, setQuery] = useState("");
  const [quickDateFilter, setQuickDateFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Checkbox Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination State (optimizes performance for 10,000+ records)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Automatically reset to the first page when any of the filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [query, quickDateFilter, startDate, endDate, filterType, filterStatus]);

  const formatGeneralDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      let normalized = dateStr;
      if (dateStr.includes("T") || dateStr.includes("Z")) {
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            normalized = `${year}-${month}-${day}`;
          } else {
            normalized = dateStr.split("T")[0];
          }
        } catch {
          normalized = dateStr.split("T")[0];
        }
      }

      const parts = normalized.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
          });
        }
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatGeneralTime = (timeStr: string) => {
    if (!timeStr) return "—";
    try {
      const parts = timeStr.split(":");
      const hour = parseInt(parts[0], 10);
      const min = parseInt(parts[1], 10);
      if (isNaN(hour) || isNaN(min)) return timeStr;
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      const mStr = String(min).padStart(2, "0");
      return `${h12}:${mStr} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Dynamic offset generator for date comparisons
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Human-legible description of the active date filter
  const getDateFilterDescription = () => {
    if (quickDateFilter === "all") return "Showing all days' history";
    if (quickDateFilter === "today") return `Today (${formatGeneralDate(getLocalDateString(0))})`;
    if (quickDateFilter === "tomorrow") return `Tomorrow (${formatGeneralDate(getLocalDateString(1))})`;
    if (quickDateFilter === "this_week") return `Next 7 Days (${formatGeneralDate(getLocalDateString(0))} to ${formatGeneralDate(getLocalDateString(6))})`;
    if (quickDateFilter === "next_week") return `Following Week (${formatGeneralDate(getLocalDateString(7))} to ${formatGeneralDate(getLocalDateString(13))})`;
    if (quickDateFilter === "future") return `Future Events (${formatGeneralDate(getLocalDateString(0))} onwards)`;
    if (quickDateFilter === "custom") {
      if (startDate && endDate) return `Range: ${formatGeneralDate(startDate)} to ${formatGeneralDate(endDate)}`;
      if (startDate) return `From ${formatGeneralDate(startDate)} onwards`;
      if (endDate) return `Up to ${formatGeneralDate(endDate)}`;
      return "Custom Range (unspecified)";
    }
    return "Filtered dates";
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setQuery("");
    setQuickDateFilter("all");
    setStartDate("");
    setEndDate("");
    setFilterType("");
    setFilterStatus("");
  };

  // Filter logic matching the HTML script closely
  const filteredGuests = guests.filter(g => {
    let matchesDate = true;
    
    if (quickDateFilter === "today") {
      matchesDate = g.date === getLocalDateString(0);
    } else if (quickDateFilter === "tomorrow") {
      matchesDate = g.date === getLocalDateString(1);
    } else if (quickDateFilter === "this_week") {
      const todayStr = getLocalDateString(0);
      const weekLaterStr = getLocalDateString(6);
      matchesDate = g.date >= todayStr && g.date <= weekLaterStr;
    } else if (quickDateFilter === "next_week") {
      const nextWeekStart = getLocalDateString(7);
      const nextWeekEnd = getLocalDateString(13);
      matchesDate = g.date >= nextWeekStart && g.date <= nextWeekEnd;
    } else if (quickDateFilter === "future") {
      matchesDate = g.date >= getLocalDateString(0);
    } else if (quickDateFilter === "custom") {
      const hasStart = !!startDate;
      const hasEnd = !!endDate;
      if (hasStart && hasEnd) {
        matchesDate = g.date >= startDate && g.date <= endDate;
      } else if (hasStart) {
        matchesDate = g.date >= startDate;
      } else if (hasEnd) {
        matchesDate = g.date <= endDate;
      }
    }

    const matchesType = !filterType || g.type === filterType;
    const matchesStatus = !filterStatus || g.status === filterStatus;

    const matchesQuery = !query || 
      g.name.toLowerCase().includes(query.toLowerCase()) || 
      (g.phone && String(g.phone).toLowerCase().includes(query.toLowerCase()));

    return matchesDate && matchesType && matchesStatus && matchesQuery;
  });

  const totalPax = filteredGuests.filter(g => g.status !== RsvpStatus.CANCELLED).reduce((sum, g) => sum + (g.pax || 0), 0);

  // Pagination calculations for performance on 10,000+ guest records
  const totalPages = Math.ceil(filteredGuests.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedGuests = filteredGuests.slice(startIndex, startIndex + pageSize);

  const isAllSelected = paginatedGuests.length > 0 && paginatedGuests.every((g) => selectedIds.includes(g.id));
  const isSomeSelected = paginatedGuests.length > 0 && !isAllSelected && paginatedGuests.some((g) => selectedIds.includes(g.id));

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      const visibleIds = paginatedGuests.map(g => g.id);
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const visibleIds = paginatedGuests.map(g => g.id);
      setSelectedIds(prev => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    }
  };

  const handleSelectRowToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = (status: RsvpStatus) => {
    if (selectedIds.length === 0) return;
    onBulkUpdateStatus?.(selectedIds, status);
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onBulkDeleteGuests?.(selectedIds);
    setSelectedIds([]);
  };

  const getStatusBadgeClass = (status: RsvpStatus) => {
    switch (status) {
      case RsvpStatus.CONFIRMED:
        return "bg-emerald-50 text-emerald-800 border border-emerald-200";
      case RsvpStatus.SEATED:
        return "bg-blue-50 text-blue-800 border border-blue-200";
      case RsvpStatus.PENDING:
        return "bg-amber-50 text-amber-800 border border-amber-200";
      case RsvpStatus.NO_SHOW:
        return "bg-orange-50 text-orange-850 border border-orange-200";
      case RsvpStatus.CANCELLED:
        return "bg-rose-50 text-rose-800 border border-rose-200";
      case RsvpStatus.ARRIVED:
        return "bg-emerald-600 text-white border border-emerald-750 font-extrabold shadow-3xs";
      case RsvpStatus.DEPARTED:
        return "bg-slate-500 text-white border border-slate-600 font-extrabold shadow-3xs";
      default:
        return "bg-slate-50 text-slate-800 border border-slate-200";
    }
  };

  const getTypeBadgeClass = (type: EntryType) => {
    return type === EntryType.WALK_IN
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
      : "bg-indigo-50 text-indigo-700 border border-indigo-100";
  };

  return (
    <div id="reservations-manager-view" className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h2 className="font-serif text-3xl font-bold text-navy tracking-tight">
          All Guest Reservations
        </h2>
        <p className="text-sm text-[#4b5c73] mt-1 font-medium">
          Search, filter, edit, or remove reservations across all past and future records.
        </p>
      </div>

      {/* Structured Card container */}
      <div className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-xs">
        {/* Filters Top rail */}
        <div className="p-6 bg-slate-50/50 border-b border-gray-150 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#8a9ab5]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guest list in real-time by name or phone number..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-full text-xs text-navy placeholder-[#8a9ab5] focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Quick date range selector */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8a9ab5] pointer-events-none" />
              <select
                value={quickDateFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuickDateFilter(val);
                  if (val === "custom") {
                    setStartDate(getLocalDateString(0));
                    setEndDate(getLocalDateString(7));
                  } else {
                    setStartDate("");
                    setEndDate("");
                  }
                }}
                className="pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
              >
                <option value="all">Any Date</option>
                <option value="today">Today Only</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this_week">Next 7 Days</option>
                <option value="next_week">Following Week</option>
                <option value="future">🔮 Future Events</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Custom fields ONLY when "custom" is chosen */}
            {quickDateFilter === "custom" && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl animate-fadeIn shadow-2xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-0 text-xs text-navy font-medium focus:outline-none focus:ring-0 p-0 w-[110px]"
                  title="Start Date"
                />
                <span className="text-slate-400 text-xs font-semibold px-1">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-0 text-xs text-navy font-medium focus:outline-none focus:ring-0 p-0 w-[110px]"
                  title="End Date"
                />
              </div>
            )}

            {/* Type selector */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
            >
              <option value="">All Types</option>
              <option value={EntryType.RESERVATION}>Reservation</option>
              <option value={EntryType.WALK_IN}>Walk-In</option>
            </select>

            {/* Status selector */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value={RsvpStatus.CONFIRMED}>Confirmed</option>
              <option value={RsvpStatus.SEATED}>Seated</option>
              <option value={RsvpStatus.PENDING}>Pending</option>
              <option value={RsvpStatus.NO_SHOW}>No-Show</option>
              <option value={RsvpStatus.CANCELLED}>Cancelled</option>
            </select>

            {/* Clear button */}
            {(query || quickDateFilter !== "all" || startDate || endDate || filterType || filterStatus) && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs text-navy-soft font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results summary band indicator */}
        <div className="px-6 py-3 bg-gold-pale/50 border-b border-gray-150 text-xs font-semibold text-gold flex justify-between">
          <span>
            📁 {getDateFilterDescription()} 
            {` (${filteredGuests.length} of ${guests.length} matches)`}
          </span>
          <span>Cumulative headcount: {totalPax} guests (pax)</span>
        </div>

        {/* Guest Listings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-navy text-white font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isSomeSelected;
                      }
                    }}
                    onChange={handleSelectAllToggle}
                    className="w-4 h-4 rounded border-gray-300 text-[#bf8f30] focus:ring-[#bf8f30] accent-[#bf8f30] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-5 w-12 text-center">#</th>
                <th className="py-4 px-5">Name</th>
                <th className="py-4 px-5">Phone</th>
                <th className="py-4 px-5">Type</th>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Time</th>
                <th className="py-4 px-5">Pax</th>
                <th className="py-4 px-5">Table</th>
                <th className="py-4 px-5">Arrive / Depart</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Booked By</th>
                <th className="py-4 px-5">Special Notes</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {paginatedGuests.length > 0 ? (
                paginatedGuests.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/50 transition-colors ${
                      selectedIds.includes(r.id) ? "bg-[#bf8f30]/10 hover:bg-[#bf8f30]/15" : ""
                    }`}
                  >
                    <td className="py-4 px-5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => handleSelectRowToggle(r.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#bf8f30] focus:ring-[#bf8f30] accent-[#bf8f30] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-5 text-center text-[#8a9ab5] font-semibold">
                      {startIndex + i + 1}
                    </td>
                    <td className="py-4 px-5 font-bold text-navy text-sm">
                      {r.name}
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-600">
                      {r.phone || "—"}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase ${getTypeBadgeClass(r.type)}`}>
                        {r.type === EntryType.WALK_IN ? "🚶 Walk-In" : "📋 RSVP"}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-medium text-slate-600">
                      {formatGeneralDate(r.date)}
                    </td>
                    <td className="py-4 px-5 font-semibold text-navy-soft">
                      {formatGeneralTime(r.time)}
                    </td>
                    <td className="py-4 px-5 font-bold text-navy text-sm">
                      {r.pax}
                    </td>
                    <td className="py-4 px-5">
                      {r.table && r.table !== "Unassigned" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                          {getTableIcon(r.table)} {r.table}
                        </span>
                      ) : (
                        <span className="text-[#8a9ab5] font-normal italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <div className="inline-flex rounded-lg border border-slate-205 p-0.5 bg-slate-50 gap-0.5 shadow-3xs">
                        <button
                          onClick={() => onUpdateStatus(r.id, r.status === RsvpStatus.ARRIVED ? RsvpStatus.CONFIRMED : RsvpStatus.ARRIVED)}
                          className={`px-2 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                            r.status === RsvpStatus.ARRIVED
                              ? "bg-emerald-600 text-white font-extrabold shadow-3xs"
                              : "text-slate-500 hover:text-navy hover:bg-slate-100"
                          }`}
                          title={r.status === RsvpStatus.ARRIVED ? "Arrived - Click to edit" : "Mark as Arrived"}
                        >
                          Arrive
                        </button>
                        <button
                          onClick={() => onUpdateStatus(r.id, r.status === RsvpStatus.DEPARTED ? RsvpStatus.ARRIVED : RsvpStatus.DEPARTED)}
                          className={`px-2 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                            r.status === RsvpStatus.DEPARTED
                              ? "bg-slate-500 text-white font-extrabold shadow-3xs"
                              : "text-slate-500 hover:text-navy hover:bg-slate-100"
                          }`}
                          title={r.status === RsvpStatus.DEPARTED ? "Departed - Click to edit" : "Mark as Departed"}
                        >
                          Depart
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block text-center whitespace-nowrap ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-600">
                      {r.staff ? `👤 ${r.staff}` : "—"}
                    </td>
                    <td className="py-4 px-5 text-slate-500 max-w-[150px] truncate" title={r.notes}>
                      {r.notes || "—"}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-2 justify-end">
                        <button
                          onClick={() => onEditGuest(r)}
                          className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100/70 text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteGuest(r.id)}
                          className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100/70 text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-[#8a9ab5]">
                    <span className="text-3xl block mb-2">🔍</span>
                    No reservations found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (optimizes rendering for 10,000+ guest records) */}
        <div className="p-6 bg-slate-50/50 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-3">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-navy focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
            >
              {[25, 50, 100, 250, 500].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-slate-300">|</span>
            <span>
              Showing {filteredGuests.length > 0 ? startIndex + 1 : 0} to{" "}
              {Math.min(startIndex + pageSize, filteredGuests.length)} of {filteredGuests.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-gray-200 rounded-lg text-navy tracking-tight font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-2 bg-white hover:bg-slate-50 border border-gray-200 rounded-lg text-navy tracking-tight font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Prev
            </button>
            <span className="px-3 py-2 font-bold text-navy whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-2 bg-white hover:bg-slate-50 border border-gray-200 rounded-lg text-navy tracking-tight font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-gray-200 rounded-lg text-navy tracking-tight font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Operations Sticky Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-navy text-white px-5 py-3.5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-4 md:gap-6 border border-slate-700/80 animate-slideUp max-w-[95vw] md:max-w-4xl truncate">
          <div className="flex items-center gap-2">
            <span className="bg-[#bf8f30] px-2.5 py-1 rounded-lg text-xs font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Selected
            </span>
          </div>
          
          <div className="hidden md:block h-6 w-[1px] bg-slate-700" />
          
          <div className="flex flex-wrap items-center gap-1.5 justify-center">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mr-1">
              Mark Status:
            </span>
            {[
              RsvpStatus.CONFIRMED,
              RsvpStatus.SEATED,
              RsvpStatus.ARRIVED,
              RsvpStatus.PENDING,
              RsvpStatus.NO_SHOW,
              RsvpStatus.CANCELLED,
              RsvpStatus.DEPARTED
            ].map((status) => (
              <button
                key={status}
                onClick={() => handleBulkStatusChange(status)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-slate-200"
              >
                {status}
              </button>
            ))}
          </div>

          <div className="hidden md:block h-5 w-[1px] bg-slate-700" />

          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-[10px] font-bold rounded-lg text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selectedIds.length}
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white font-semibold transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
