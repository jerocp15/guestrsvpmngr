/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface StaffManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: string[];
  onAddStaff: (name: string) => void;
  onRemoveStaff: (index: number) => void;
}

export default function StaffManagerModal({
  isOpen,
  onClose,
  staffList,
  onAddStaff,
  onRemoveStaff
}: StaffManagerModalProps) {
  const [newStaffName, setNewStaffName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    onAddStaff(newStaffName.trim());
    setNewStaffName("");
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-fadeIn flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-navy px-6 py-5 flex items-center justify-between text-white shrink-0">
          <div>
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <span>👥</span>
              <span>Manage Service Crew</span>
            </h3>
            <p className="text-white/70 text-xs mt-0.5">
              Add or remove waitstaff for service assignments.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/95 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
          
          {/* Quick Input Form row */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Ana Cruz"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-gold hover:bg-gold-light text-white font-bold text-xs rounded-full transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-4.5 h-4.5" />
              Add Staff
            </button>
          </form>

          {/* List items scrollable container */}
          <div className="flex-grow overflow-y-auto border border-slate-100 rounded-2xl div-divide divide-slate-100 bg-slate-50/50">
            {staffList.length > 0 ? (
              staffList.map((st, i) => (
                <div
                  key={i}
                  className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition border-b border-slate-100 last:border-b-0"
                >
                  <span className="text-xs font-semibold text-navy flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    👤 {st}
                  </span>
                  <button
                    onClick={() => onRemoveStaff(i)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
                    title={`Remove ${st}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 font-medium italic text-xs">
                No staff members listed. Insert above.
              </div>
            )}
          </div>
          
          <p className="text-[10px] text-slate-400 font-medium leading-normal italic text-center shrink-0">
            ⚠️ Note: Removing a crew member does not affect their historic logs.
          </p>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end text-xs shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-navy hover:bg-navy-mid text-white font-bold rounded-lg transition cursor-pointer"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
}
