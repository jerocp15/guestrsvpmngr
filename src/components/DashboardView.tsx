/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Guest, RsvpStatus, EntryType, TableConfig } from "../types";
import { User, Users, CheckCircle, HelpCircle, Utensils, Clipboard, Clock, TrendingUp, Calendar } from "lucide-react";
import { getTodayStringInTimezone, getDetectedTimezone } from "../utils/timezone";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-xl text-slate-800 animate-fadeIn">
        <p className="font-serif font-extrabold text-[#0f1f38] text-sm mb-2">{label}</p>
        <div className="space-y-1.5 text-xs text-slate-600 font-medium">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-4 justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-extrabold text-navy">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface DashboardViewProps {
  guests: Guest[];
  onEditGuest: (guest: Guest) => void;
  onDeleteGuest: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: RsvpStatus) => void;
  timezone?: string;
  tables?: TableConfig[];
}

export default function DashboardView({ guests, onEditGuest, onDeleteGuest, onUpdateStatus, timezone, tables = [] }: DashboardViewProps) {
  const [chartMetric, setChartMetric] = useState<"breakdown" | "pax">("breakdown");

  const getUpcomingWeekData = () => {
    const currentTz = timezone && timezone !== "AUTO" ? timezone : getDetectedTimezone();
    const data = [];
    const baseDate = new Date();
    
    // We want the upcoming 7 days starting from today
    for (let i = 0; i < 7; i++) {
      const futureDate = new Date(baseDate.getTime());
      futureDate.setDate(baseDate.getDate() + i);
      
      let dateStr = "";
      let label = "";
      try {
        const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: currentTz }).format(futureDate);
        const month = new Intl.DateTimeFormat("en", { month: "2-digit", timeZone: currentTz }).format(futureDate);
        const day = new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: currentTz }).format(futureDate);
        dateStr = `${year}-${month}-${day}`;
        
        const weekdayOpt: "short" = "short";
        const dayName = new Intl.DateTimeFormat("en", { weekday: weekdayOpt, timeZone: currentTz }).format(futureDate);
        const dayNum = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: currentTz }).format(futureDate);
        label = i === 0 ? "Today" : `${dayName} ${dayNum}`;
      } catch (e) {
        const year = futureDate.getFullYear();
        const month = String(futureDate.getMonth() + 1).padStart(2, "0");
        const day = String(futureDate.getDate()).padStart(2, "0");
        dateStr = `${year}-${month}-${day}`;
        
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayName = weekdays[futureDate.getDay()];
        label = i === 0 ? "Today" : `${dayName} ${futureDate.getDate()}`;
      }
      
      // Exclude CANCELLED guests from forecast counts & expected covers
      const dayGuests = guests.filter(g => g.date === dateStr && g.status !== RsvpStatus.CANCELLED);
      
      const rsvps = dayGuests.filter(g => g.type === EntryType.RESERVATION && !g.isWaitlist).length;
      const walkins = dayGuests.filter(g => g.type === EntryType.WALK_IN && !g.isWaitlist).length;
      const waitlist = dayGuests.filter(g => g.isWaitlist).length;
      const paxCount = dayGuests.reduce((sum, g) => sum + (g.pax || 0), 0);
      
      data.push({
        label,
        Reservations: rsvps,
        "Walk-Ins": walkins,
        Waitlist: waitlist,
        Pax: paxCount
      });
    }
    return data;
  };

  const upcomingWeekData = getUpcomingWeekData();

  const getGreeting = () => {
    try {
      const currentTz = timezone && timezone !== "AUTO" ? timezone : getDetectedTimezone();
      const formatter = new Intl.DateTimeFormat("en", {
        hour: "numeric",
        hour12: false,
        timeZone: currentTz
      });
      const hour = parseInt(formatter.format(new Date()), 10);
      if (hour >= 5 && hour < 12) {
        return "Good morning 🌅";
      } else if (hour >= 12 && hour < 17) {
        return "Good afternoon ☀️";
      } else if (hour >= 17 && hour < 22) {
        return "Good evening 🌆";
      } else {
        return "Good night 🌙";
      }
    } catch (e) {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        return "Good morning 🌅";
      } else if (hour >= 12 && hour < 17) {
        return "Good afternoon ☀️";
      } else if (hour >= 17 && hour < 22) {
        return "Good evening 🌆";
      } else {
        return "Good night 🌙";
      }
    }
  };

  // Get today's date in YYYY-MM-DD
  const getTodayString = () => {
    return getTodayStringInTimezone(timezone || "UTC");
  };

  const getTableIcon = (tableName: string) => {
    const match = tables.find(t => t.name === tableName);
    if (match && match.icon) return match.icon;
    try {
      const cachedTables = localStorage.getItem("guest_rsvp_mngr_tables");
      if (cachedTables) {
        const parsed = JSON.parse(cachedTables);
        const m = parsed.find((t: any) => t.name === tableName);
        if (m && m.icon) return m.icon;
      }
    } catch (e) {}
    return "🪑";
  };

  const todayStr = getTodayString();
  const todayGuests = guests.filter(g => g.date === todayStr);

  // Exclude CANCELLED guests from active schedule sitting/totals
  const activeTodayGuests = todayGuests.filter(g => g.status !== RsvpStatus.DEPARTED && g.status !== RsvpStatus.CANCELLED);
  const activeTodayWaitlist = activeTodayGuests.filter(g => g.isWaitlist).length;
  const activeTodayReservations = activeTodayGuests.filter(g => g.type === EntryType.RESERVATION && !g.isWaitlist).length;
  const activeTodayWalkins = activeTodayGuests.filter(g => g.type === EntryType.WALK_IN && !g.isWaitlist).length;

  // KPIs calculations - Exclude CANCELLED guests
  const todayWaitlistCount = todayGuests.filter(g => g.isWaitlist && g.status !== RsvpStatus.CANCELLED).length;
  const todayReservations = todayGuests.filter(g => g.type === EntryType.RESERVATION && !g.isWaitlist && g.status !== RsvpStatus.CANCELLED).length;
  const todayWalkins = todayGuests.filter(g => g.type === EntryType.WALK_IN && !g.isWaitlist && g.status !== RsvpStatus.CANCELLED).length;
  const todayCount = todayGuests.filter(g => g.status !== RsvpStatus.CANCELLED).length;
  const todayPax = todayGuests.filter(g => g.status !== RsvpStatus.CANCELLED).reduce((acc, curr) => acc + (curr.pax || 0), 0);
  const todayConfirmed = todayGuests.filter(g => g.status === RsvpStatus.CONFIRMED).length;
  const todaySeated = todayGuests.filter(g => g.status === RsvpStatus.SEATED).length;
  const totalAllTime = guests.filter(g => g.status !== RsvpStatus.CANCELLED).length;



  // Popular time slots
  const slots = [
    { time: "12:00 PM", search: "12:00 PM" },
    { time: "06:00 PM", search: "06:00 PM" },
    { time: "07:00 PM", search: "07:00 PM" },
    { time: "08:00 PM", search: "08:00 PM" }
  ];

  const slotCounts = slots.map(slot => {
    const count = todayGuests.filter(g => g.time && g.time.includes(slot.search) && g.status !== RsvpStatus.CANCELLED).length;
    return { ...slot, count };
  });
  const maxSlotCount = Math.max(...slotCounts.map(s => s.count), 1);

  const getStatusBadgeClass = (status: RsvpStatus) => {
    switch (status) {
      case RsvpStatus.CONFIRMED:
        return "bg-emerald-50 text-emerald-800 border border-emerald-200";
      case RsvpStatus.SEATED:
        return "bg-blue-50 text-blue-800 border border-blue-200";
      case RsvpStatus.PENDING:
        return "bg-amber-50 text-amber-800 border border-amber-200";
      case RsvpStatus.NO_SHOW:
        return "bg-orange-50 text-orange-800 border border-orange-200";
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
    <div id="dashboard-view-main" className="space-y-8 animate-fadeIn">
      {/* Welcome header section */}
      <div>
        <h2 className="font-serif text-3xl font-bold text-navy tracking-tight">
          {getGreeting()}
        </h2>
        <p className="text-sm text-[#4b5c73] mt-1.5 font-medium">
          Here is a detailed snapshot of your service for today.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {/* Today Booked Reservations */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Reservations</span>
            <Clipboard className="w-4 h-4 text-navy-soft" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todayReservations}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Booked RSVPs</p>
          </div>
        </div>

        {/* Walk-Ins */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Walk-ins</span>
            <User className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todayWalkins}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Unscheduled arrivals</p>
          </div>
        </div>

        {/* Waitlist Category */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Waitlist</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-amber-600">
              {todayWaitlistCount}
            </div>
            <p className="text-xs text-amber-705 text-amber-700 font-medium mt-1 leading-none">Queue waiting</p>
          </div>
        </div>

        {/* Pax */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Pax</span>
            <Users className="w-4 h-4 text-gold" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todayPax}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Total guests</p>
          </div>
        </div>

        {/* Confirmed */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todayConfirmed}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Attending tables</p>
          </div>
        </div>

        {/* Seated */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Seated</span>
            <Utensils className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todaySeated}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Guests seated</p>
          </div>
        </div>

        {/* Total Reserves */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <HelpCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {totalAllTime}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">All-time entries</p>
          </div>
        </div>
      </div>

      {/* Upcoming Week Service Forecast */}
      <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-navy flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" /> Upcoming Week Booking Forecast
            </h3>
            <p className="text-xs text-[#8a9ab5] font-medium mt-0.5">
              Service projection and cover demand over the next 7 days
            </p>
          </div>
          
          <div className="flex items-center self-start sm:self-center bg-slate-100 rounded-xl p-1 border border-slate-200 gap-1">
            <button
              onClick={() => setChartMetric("breakdown")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMetric === "breakdown"
                  ? "bg-white text-navy shadow-xs border border-gray-150"
                  : "text-slate-500 hover:text-navy"
              }`}
            >
              📋 RSVP Breakdown
            </button>
            <button
              onClick={() => setChartMetric("pax")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMetric === "pax"
                  ? "bg-white text-navy shadow-xs border border-gray-150"
                  : "text-slate-500 hover:text-navy"
              }`}
            >
              👥 Guest Covers (Pax)
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === "breakdown" ? (
              <BarChart
                data={upcomingWeekData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#334155' }}
                />
                <Bar dataKey="Reservations" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} name="Reservations (RSVP)" />
                <Bar dataKey="Walk-Ins" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Walk-Ins" />
                <Bar dataKey="Waitlist" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Waitlist" />
              </BarChart>
            ) : (
              <AreaChart
                data={upcomingWeekData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPax" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#334155' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Pax" 
                  stroke="#8b5cf6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorPax)" 
                  name="Expected Covers (Pax)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analytics Bars and Hourly Slots */}
      <div className="w-full">
        {/* Popular Slots Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs">
          <h4 className="font-serif text-base font-bold text-navy mb-5 uppercase tracking-wide">
            🕐 Popular Time Slots Today
          </h4>
          <div className="space-y-4">
            {slotCounts.map(slot => {
              const pct = maxSlotCount > 0 ? (slot.count / maxSlotCount) * 100 : 0;
              return (
                <div key={slot.time} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-semibold text-navy-soft">
                    {slot.time}
                  </div>
                  <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gold rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-bold text-navy">
                    {slot.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Guests list Card */}
      <div className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-xs">
        <div className="px-6 py-5 border-b border-gray-150 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-navy">
              Today's Guests
            </h3>
            <p className="text-xs text-[#8a9ab5] font-medium mt-0.5">
              Service schedule for today's physical sittings
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full">
              📋 {activeTodayReservations} Reservations
            </span>
            <span className="px-3.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">
              🚶 {activeTodayWalkins} Walk-ins
            </span>
            {activeTodayWaitlist > 0 && (
              <span className="px-3.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-full animate-pulse">
                ⏳ {activeTodayWaitlist} Waitlist
              </span>
            )}
          </div>
        </div>
 
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-navy text-white font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-5">Guest Name</th>
                <th className="py-4 px-5">Type</th>
                <th className="py-4 px-5">Pax</th>
                <th className="py-4 px-5">Table Assignment</th>
                <th className="py-4 px-5">Arrive / Depart</th>
                <th className="py-4 px-5">Service Status</th>
                <th className="py-4 px-5">Special Notes</th>
                <th className="py-4 px-5 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {activeTodayGuests.length > 0 ? (
                activeTodayGuests.map(r => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-5 font-bold text-navy text-sm">
                      {r.name}
                    </td>
                    <td className="py-4 px-5">
                      {r.isWaitlist ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase bg-amber-50 border border-amber-200 text-amber-700">
                          ⏳ Waitlist
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${getTypeBadgeClass(r.type)}`}>
                          {r.type === EntryType.WALK_IN ? "🚶 Walk-In" : "📋 RSVP"}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-bold text-navy">
                      {r.pax}
                    </td>
                    <td className="py-4 px-5 font-medium text-[#4b5c73]">
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
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold inline-block text-center ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-500 max-w-[180px] truncate" title={r.notes}>
                      {r.notes || "—"}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => onEditGuest(r)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 border border-indigo-150 hover:bg-indigo-100/70 text-indigo-700 transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <span className="text-3xl block mb-2">🍽️</span>
                    <p className="text-sm text-[#8a9ab5] font-medium">No service reservations scheduled for today</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
