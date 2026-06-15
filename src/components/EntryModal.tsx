/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Guest, RsvpStatus, EntryType, TableConfig } from "../types";
import { X, Save, AlertTriangle, Sparkles } from "lucide-react";
import { returningGuestsList } from "../data/returningGuests";
import { getTodayStringInTimezone, getSystemTime24InTimezone } from "../utils/timezone";

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guest: Guest) => void;
  guestToEdit: Guest | null;
  tables: TableConfig[];
  staffList: string[];
  initialType?: "Reservation" | "Walk-In";
  timezone?: string;
  guestsKey?: string;
}

export default function EntryModal({
  isOpen,
  onClose,
  onSave,
  guestToEdit,
  tables,
  staffList,
  initialType = "Reservation",
  timezone,
  guestsKey
}: EntryModalProps) {
  const storageKey = "restaurant_reservations";

  // Local Form States
  const [type, setType] = useState<EntryType>(EntryType.RESERVATION);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(""); // Stores 24h format for input: "19:00"
  const [pax, setPax] = useState(2);
  const [table, setTable] = useState("");
  const [status, setStatus] = useState<RsvpStatus>(RsvpStatus.CONFIRMED);
  const [staff, setStaff] = useState("");
  const [notes, setNotes] = useState("");
  const [isWaitlist, setIsWaitlist] = useState(false);

  // Repeat guest detection state
  const [repeatGuest, setRepeatGuest] = useState<Guest | null>(null);
  const [repeatGuestByPhone, setRepeatGuestByPhone] = useState<Guest | null>(null);
  const [hasPulledDetails, setHasPulledDetails] = useState(false);

  // Seat conflict warning state
  const [hasSeatingConflict, setHasSeatingConflict] = useState<string | null>(null);

  // Pre-fill helper
  const getTodayString = () => {
    return getTodayStringInTimezone(timezone || "UTC");
  };

  const getSystemTime24 = () => {
    return getSystemTime24InTimezone(timezone || "UTC");
  };

  // Convert 12h formatting ("07:00 PM") to 24h input string ("19:00")
  const convertTimeTo24 = (time12: string): string => {
    if (!time12) return "19:00";
    const match = time12.match(/(\d{2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return time12; // fallback

    let h = parseInt(match[1]);
    const m = match[2];
    const ap = match[3].toUpperCase();

    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;

    return `${String(h).padStart(2, "0")}:${m}`;
  };

  // Convert 24h input ("19:30") to human friendly 12h AM/PM string ("07:30 PM")
  const convertTimeTo12 = (time24: string): string => {
    if (!time24) return "07:00 PM";
    const [hh, mm] = time24.split(":").map(Number);
    if (isNaN(hh)) return "07:00 PM";

    const ap = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;

    return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
  };

  useEffect(() => {
    if (isOpen) {
      setHasPulledDetails(!!guestToEdit);
      setRepeatGuestByPhone(null);
      if (guestToEdit) {
        setType(guestToEdit.type);
        setName(guestToEdit.name);
        setPhone(guestToEdit.phone ? String(guestToEdit.phone) : "");
        setDate(guestToEdit.date);
        setTime(convertTimeTo24(guestToEdit.time));
        setPax(guestToEdit.pax);
        setTable(guestToEdit.table);
        setStatus(guestToEdit.status);
        setStaff(guestToEdit.staff || "");
        setNotes(guestToEdit.notes || "");
        setIsWaitlist(!!guestToEdit.isWaitlist);
      } else {
        // New Reservation / New Walk-In
        setType(initialType === "Walk-In" ? EntryType.WALK_IN : EntryType.RESERVATION);
        setName("");
        setPhone("");
        setDate(getTodayString());
        setTime(getSystemTime24());
        setPax(2);
        setTable("");
        setStatus(initialType === "Walk-In" ? RsvpStatus.SEATED : RsvpStatus.CONFIRMED);
        setStaff("");
        setNotes("");
        setIsWaitlist(false);
      }
    }
  }, [isOpen, guestToEdit, initialType]);

  // Listen to Name input changes for REPEAT GUEST DETECTION
  // We compare globally against other guests (excluding current guest if editing)
  useEffect(() => {
    if (!name.trim() || !isOpen) {
      setRepeatGuest(null);
      return;
    }

    // Call simulated search or search local storage array
    const searchName = name.trim().toLowerCase();
    const cachedGuestsStr = localStorage.getItem(storageKey);
    if (cachedGuestsStr) {
      try {
        const guestList: Guest[] = JSON.parse(cachedGuestsStr);
        const match = guestList.find(
          g => g.name.toLowerCase() === searchName && (!guestToEdit || g.id !== guestToEdit.id)
        );
        if (match) {
          setRepeatGuest(match);
        } else {
          setRepeatGuest(null);
        }
      } catch (e) {
        setRepeatGuest(null);
      }
    }
  }, [name, isOpen, guestToEdit]);

  // Listen to Phone input changes for REPEAT GUEST/PHONE DETECTION
  // If the phone number exists, we automatically pull the record to edit, and save as new.
  useEffect(() => {
    const rawPhone = typeof phone === "string" ? phone : String(phone || "");
    if (!rawPhone.trim() || !isOpen) {
      setRepeatGuestByPhone(null);
      setHasPulledDetails(false);
      return;
    }

    const cleanPhone = rawPhone.trim();
    const normalizedClean = cleanPhone.replace(/[\s\-\(\)\+\.]/g, "");
    if (normalizedClean.length < 4) {
      setRepeatGuestByPhone(null);
      setHasPulledDetails(false);
      return;
    }

    const cachedGuestsStr = localStorage.getItem(storageKey);
    let guestList: Guest[] = [];
    if (cachedGuestsStr) {
      try {
        guestList = JSON.parse(cachedGuestsStr);
      } catch (e) {}
    }

    // Combine current guestList with returningGuestsList to search returning guests
    const allGuestsToMatch: Guest[] = [...guestList];
    returningGuestsList.forEach((rg, idx) => {
      const alreadyHasInLocal = guestList.some(g => {
        if (!g.phone) return false;
        const normG = String(g.phone).replace(/[\s\-\(\)\+\.]/g, "");
        const normRG = String(rg.phone || "").replace(/[\s\-\(\)\+\.]/g, "");
        return normG === normRG;
      });
      if (!alreadyHasInLocal) {
        allGuestsToMatch.push({
          id: `seed_rg_${idx}_${rg.phone}`,
          name: rg.name,
          phone: String(rg.phone || ""),
          type: rg.type,
          date: getTodayString(),
          time: getSystemTime24(),
          pax: 2,
          table: "Unassigned",
          status: RsvpStatus.CONFIRMED,
          notes: "Returning Guest",
          staff: "Unassigned"
        });
      }
    });

    const match = allGuestsToMatch.find(g => {
      if (!g.phone) return false;
      const normG = String(g.phone).replace(/[\s\-\(\)\+\.]/g, "");
      return normG === normalizedClean && (!guestToEdit || g.id !== guestToEdit.id);
    });

    if (match) {
      setRepeatGuestByPhone(match);
      if (!hasPulledDetails) {
        setName(match.name);
        if (match.table && match.table !== "Unassigned") {
          setTable(match.table);
        }
        if (match.notes) {
          setNotes(match.notes);
        }
        if (match.staff && match.staff !== "Unassigned") {
          setStaff(match.staff);
        }
        setPax(match.pax || 2);
        setType(match.type);
        setIsWaitlist(!!match.isWaitlist);
        setHasPulledDetails(true);
      }
    } else {
      setRepeatGuestByPhone(null);
      const anyPhonePrefixMatch = allGuestsToMatch.some(g => {
        if (!g.phone) return false;
        const normG = String(g.phone).replace(/[\s\-\(\)\+\.]/g, "");
        return normG.startsWith(normalizedClean) && (!guestToEdit || g.id !== guestToEdit.id);
      });
      if (!anyPhonePrefixMatch) {
         setHasPulledDetails(false);
      }
    }
  }, [phone, isOpen, guestToEdit, hasPulledDetails]);

  // Listen to table / date / time changes for DOUBLE GUEST SEATING CONFLICT
  useEffect(() => {
    if (!isOpen || !table || table === "Unassigned" || !date) {
      setHasSeatingConflict(null);
      return;
    }

    const cachedGuestsStr = localStorage.getItem(storageKey);
    if (cachedGuestsStr) {
      try {
        const guestList: Guest[] = JSON.parse(cachedGuestsStr);
        // Find if someone else is assigned to this exact table on this date
        const conflict = guestList.find(
          g =>
            g.table === table &&
            g.date === date &&
            (!guestToEdit || g.id !== guestToEdit.id) &&
            [RsvpStatus.CONFIRMED, RsvpStatus.SEATED, RsvpStatus.PENDING].includes(g.status)
        );

        if (conflict) {
          setHasSeatingConflict(conflict.name);
        } else {
          setHasSeatingConflict(null);
        }
      } catch (e) {
        setHasSeatingConflict(null);
      }
    }
  }, [table, date, isOpen, guestToEdit]);

  // Compute tables occupied by guests currently Seated or Arrived on this date
  const occupiedTables = React.useMemo(() => {
    const set = new Set<string>();
    if (!isOpen || !date) return set;
    try {
      const cached = localStorage.getItem(storageKey);
      if (!cached) return set;
      const guestList: Guest[] = JSON.parse(cached);
      guestList.forEach(g => {
        if (
          g.date === date &&
          g.table &&
          g.table !== "Unassigned" &&
          g.table !== table &&
          (!guestToEdit || g.id !== guestToEdit.id) &&
          (g.status === RsvpStatus.SEATED || g.status === RsvpStatus.ARRIVED)
        ) {
          set.add(g.table);
        }
      });
    } catch {}
    return set;
  }, [isOpen, date, table, guestToEdit, guestsKey]);

  if (!isOpen) return null;

  const handleTypeSelect = (selectedType: EntryType) => {
    setType(selectedType);
    if (selectedType === EntryType.WALK_IN) {
      setStatus(RsvpStatus.SEATED);
    } else {
      setStatus(RsvpStatus.CONFIRMED);
    }
  };

  const handleApplySavedRepeatDetails = () => {
    if (!repeatGuest) return;
    setPhone(String(repeatGuest.phone || ""));
    if (repeatGuest.table && repeatGuest.table !== "Unassigned") {
      setTable(repeatGuest.table);
    }
    if (repeatGuest.notes) {
      setNotes(`Repeat request: ${repeatGuest.notes}`);
    }
    setIsWaitlist(!!repeatGuest.isWaitlist);
    setRepeatGuest(null); // clears alert once applied
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || (type === EntryType.WALK_IN ? "Walk-In Guest" : "Anonymous Guest");

    let isOldPhone = false;
    const cleanPhone = String(phone || "").trim();
    if (cleanPhone) {
      const cachedGuestsStr = localStorage.getItem(storageKey);
      let localMatches = false;
      if (cachedGuestsStr) {
        try {
          const guestList: Guest[] = JSON.parse(cachedGuestsStr);
          localMatches = guestList.some(
            g => g.phone && String(g.phone).trim() === cleanPhone && (!guestToEdit || g.id !== guestToEdit.id)
          );
        } catch (err) {}
      }
      const isSeedMatch = returningGuestsList.some(
        rg => rg.phone && String(rg.phone).trim() === cleanPhone
      );
      isOldPhone = localMatches || isSeedMatch;
    }

    // If guestToEdit is provided, keep the same ID so we update the same row. Otherwise, generate a brand new ID.
    const targetId = guestToEdit ? guestToEdit.id : `reservation_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const savedGuest: Guest = {
      id: targetId,
      name: finalName,
      phone: String(phone || "").trim(),
      type,
      date,
      time: convertTimeTo12(time),
      pax: Number(pax) || 1,
      table: table || "Unassigned",
      status,
      staff: staff || "Unassigned",
      notes: notes.trim(),
      isWaitlist
    };

    onSave(savedGuest);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fadeIn flex flex-col">
        
        {/* Header */}
        <div className="bg-navy px-6 py-5 flex items-center justify-between text-white shrink-0">
          <h3 className="font-serif text-lg font-bold">
            {guestToEdit ? "✏️ Edit Reservation Row" : "📋 Record New Booking"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body Scrollable */}
        <form onSubmit={handleFormSubmit} className="hidden-scrollbar overflow-y-auto p-6 flex-1 space-y-5 text-xs text-navy">
          
          {/* Reservation / Walk-In switch options */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wide">
              Service Entry Type Selection
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeSelect(EntryType.RESERVATION)}
                className={`py-3.5 px-4 rounded-full border-1.5 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === EntryType.RESERVATION
                    ? "border-indigo-600 bg-indigo-55 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 hover:bg-slate-55 text-slate-500"
                }`}
              >
                📋 Standard Reservation
              </button>

              <button
                type="button"
                onClick={() => handleTypeSelect(EntryType.WALK_IN)}
                className={`py-3.5 px-4 rounded-full border-1.5 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === EntryType.WALK_IN
                    ? "border-emerald-600 bg-emerald-55 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 hover:bg-slate-55 text-slate-500"
                }`}
              >
                🚶 Log Walk-In Client
              </button>
            </div>
          </div>

          {/* Waitlist Toggle Switch */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs">
            <div>
              <h4 className="font-bold text-navy text-xs flex items-center gap-1.5">
                ⏳ Add to Waiting List (Waitlist)
              </h4>
              <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                Mark this customer as waiting for an available table slot.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="waitlist-toggle-checkbox"
                type="checkbox"
                checked={isWaitlist}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsWaitlist(checked);
                  if (checked) {
                    setTable("Unassigned");
                    setStatus(RsvpStatus.PENDING);
                  } else {
                    setStatus(type === EntryType.WALK_IN ? RsvpStatus.SEATED : RsvpStatus.CONFIRMED);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Phone-Matched Repeat Visitor Alert */}
          {repeatGuestByPhone && (
            <div className="bg-[#eff6ff] border-l-4 border-indigo-600 rounded-xl p-3.5 flex items-center gap-2.5 animate-fadeIn shadow-2xs">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <h4 className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider">
                  ⚡ Repeat Guest Phone Matched!
                </h4>
                <p className="text-[11px] text-indigo-750 mt-0.5 font-medium">
                  Past details for <b>{repeatGuestByPhone.name}</b> are automatically populated. Editing and saving this form will register a brand <b>new reservation row</b>.
                </p>
              </div>
            </div>
          )}

          {/* Repeat Visitor Alert advisory block */}
          {repeatGuest && (
            <div className="bg-gold-pale border-l-4 border-gold rounded-xl p-3.5 flex justify-between items-center flex-wrap gap-2 animate-fadeIn shadow-2xs">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#1a2b4a] text-[11px] uppercase tracking-wider">
                    ✨ Repeat Dining Guest Detected!
                  </h4>
                  <p className="text-[11px] text-[#4b5c73] mt-0.5 font-medium">
                    This patron matches an existing profile. Past info: <b>{repeatGuest.phone || "No Phone"}</b> · Assigned seat: <b>{repeatGuest.table || "Unassigned"}</b>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplySavedRepeatDetails}
                className="px-2.5 py-1 bg-gold text-white font-bold rounded-lg text-[10px] hover:bg-[#b28525] transition cursor-pointer"
              >
                Use Past Details
              </button>
            </div>
          )}

          {/* Table Overbooking Conflict Warning Block */}
          {hasSeatingConflict && (
            <div className="bg-rose-50 border-l-4 border-rose-500 rounded-xl p-3.5 flex items-center gap-3 animate-fadeIn text-[11px] text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <p className="font-semibold">
                🚨 Sitting Warning: <b>{table}</b> is already reserved by <b>{hasSeatingConflict}</b> for this active date!
              </p>
            </div>
          )}

          {/* Name & Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
                Full Guest Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maria Santos"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
              />
            </div>

            <div className="space-y-1.5 font-sans">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
                  Phone Contact Number
                </label>
                {repeatGuestByPhone && (
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-fadeIn">
                    <span>✨</span> Guest Profile Auto-loaded
                  </span>
                )}
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 912 345 6789"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
              />
            </div>
          </div>

          {/* Date & Hour Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
                Booking Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
                Arrival Time
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold cursor-pointer"
              />
            </div>
          </div>

          {/* Pax quantity & Table Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
                Service Pax count
              </label>
              <input
                type="number"
                min={1}
                required
                value={pax}
                onChange={(e) => setPax(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
              />
            </div>

            <div className="space-y-1.5 font-sans">
              <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
                Table Assignment
              </label>
              <select
                value={table}
                onChange={(e) => setTable(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold cursor-pointer"
              >
                <option value="Unassigned">-- Select Table (Auto/Unassigned) --</option>
                {tables
                  .filter(t => (t.override !== "unavailable" || t.name === table) && !occupiedTables.has(t.name))
                  .map((t, index) => (
                    <option key={index} value={t.name}>
                      {t.icon} {t.name} (Cap: {t.capacity})
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Status & Crew Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
                Status Badge
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RsvpStatus)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold cursor-pointer"
              >
                <option value={RsvpStatus.CONFIRMED}>Confirmed/Reserved</option>
                <option value={RsvpStatus.ARRIVED}>Arrived</option>
                <option value={RsvpStatus.DEPARTED}>Departed</option>
                <option value={RsvpStatus.SEATED}>Seated/Occupied</option>
                <option value={RsvpStatus.PENDING}>Pending advisory</option>
                <option value={RsvpStatus.NO_SHOW}>No-Show/Arrived late</option>
                <option value={RsvpStatus.CANCELLED}>Cancelled reservation</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
                Booked By (Staff)
              </label>
              <select
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold cursor-pointer"
              >
                <option value="Unassigned">-- Choose Staff (Unassigned) --</option>
                {staffList.map((st, index) => (
                  <option key={index} value={st}>
                    👤 {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Special Requests Notes */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
              Special Catering Request Notes / Allergies
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vegetarian diet, anniversary setup, wheelchair access needed..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-150 flex justify-end gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-slate-250 bg-white text-slate-600 font-bold rounded-lg hover:bg-slate-55 transition cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            onClick={handleFormSubmit}
            className="px-5 py-2 bg-navy hover:bg-navy-mid text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Save Details
          </button>
        </div>

      </div>
    </div>
  );
}
