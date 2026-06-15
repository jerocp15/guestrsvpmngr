/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guest, TableConfig, RsvpStatus, EntryType } from "../types";

export const initialStaff: string[] = [
  "Ana Cruz",
  "John Smith",
  "Sarah Jenkins",
  "Lucas Meyer"
];

export const initialTables: TableConfig[] = [
  { name: "Table 1", capacity: 2, icon: "🪑", override: "" },
  { name: "Table 2", capacity: 4, icon: "🪑", override: "" },
  { name: "Table 3", capacity: 2, icon: "🪑", override: "" },
  { name: "Table 4", capacity: 4, icon: "🪑", override: "" },
  { name: "Table 5", capacity: 6, icon: "🪑", override: "" },
  { name: "Table 6", capacity: 8, icon: "🛋️", override: "" },
  { name: "Table 7", capacity: 4, icon: "🪑", override: "" },
  { name: "Table 8", capacity: 2, icon: "🪑", override: "" }
];

export const initialGuests: Guest[] = [
  {
    id: "guest_1",
    name: "Arthur Pendragon",
    phone: "555-0111",
    type: EntryType.RESERVATION,
    date: "2026-06-14",
    time: "07:00 PM",
    pax: 4,
    table: "Table 5",
    status: RsvpStatus.CONFIRMED,
    staff: "Ana Cruz",
    notes: "VIP Guest",
    dietaryRestrictions: ["Gluten-Free"]
  },
  {
    id: "guest_2",
    name: "Guinevere Moore",
    phone: "555-0122",
    type: EntryType.RESERVATION,
    date: "2026-06-14",
    time: "08:15 PM",
    pax: 2,
    table: "Table 1",
    status: RsvpStatus.SEATED,
    staff: "John Smith",
    notes: "Vegan preference"
  },
  {
    id: "guest_3",
    name: "Lancelot Du Lac",
    phone: "555-0133",
    type: EntryType.WALK_IN,
    date: "2026-06-14",
    time: "06:30 PM",
    pax: 3,
    table: "Table 3",
    status: RsvpStatus.ARRIVED,
    staff: "Sarah Jenkins"
  },
  {
    id: "guest_4",
    name: "Gawain Green",
    phone: "555-0144",
    type: EntryType.RESERVATION,
    date: "2026-06-15",
    time: "07:30 PM",
    pax: 5,
    table: "Table 6",
    status: RsvpStatus.PENDING,
    staff: "Sarah Jenkins",
    notes: "Needs window view"
  },
  {
    id: "guest_5",
    name: "Percival Bland",
    phone: "555-0155",
    type: EntryType.RESERVATION,
    date: "2026-06-14",
    time: "09:00 PM",
    pax: 2,
    table: "Unassigned",
    status: RsvpStatus.PENDING,
    staff: "Lucas Meyer",
    isWaitlist: true,
    notes: "Waitlisted for peak hour"
  },
  {
    id: "guest_6",
    name: "Tristan Iseult",
    phone: "555-0166",
    type: EntryType.RESERVATION,
    date: "2026-06-16",
    time: "06:00 PM",
    pax: 2,
    table: "Table 8",
    status: RsvpStatus.CONFIRMED,
    staff: "John Smith"
  }
];
