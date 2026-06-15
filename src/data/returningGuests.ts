/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EntryType } from "../types";

export interface ReturningGuest {
  name: string;
  phone: string;
  type: EntryType;
  pax?: number;
  notes?: string;
}

export const returningGuestsList: ReturningGuest[] = [
  { name: "John Doe", phone: "555-0101", type: EntryType.RESERVATION, pax: 2, notes: "Prefers window table" },
  { name: "Jane Smith", phone: "555-0102", type: EntryType.RESERVATION, pax: 4, notes: "Allergic to nuts" },
  { name: "Robert Johnson", phone: "555-0103", type: EntryType.WALK_IN, pax: 3 },
  { name: "Emily Davis", phone: "555-0104", type: EntryType.RESERVATION, pax: 2, notes: "Celebrating anniversary" },
  { name: "Michael Brown", phone: "555-0105", type: EntryType.WALK_IN, pax: 5, notes: "Requires high chair" }
];
