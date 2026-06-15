/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum RsvpStatus {
  CONFIRMED = "Confirmed",
  SEATED = "Seated",
  PENDING = "Pending",
  NO_SHOW = "No-Show",
  CANCELLED = "Cancelled",
  ARRIVED = "Arrived",
  DEPARTED = "Departed"
}

export enum EntryType {
  RESERVATION = "Reservation",
  WALK_IN = "Walk-In"
}

export interface Guest {
  id: string;
  name: string;
  phone?: string;
  type: EntryType;
  date: string; // YYYY-MM-DD
  time: string; // "07:00 PM" or "19:00"
  pax: number;
  table: string; // Table name (such as "Table 5" or "Unassigned")
  status: RsvpStatus;
  staff?: string; // name of staff such as "Ana Cruz"
  notes?: string;
  arrival?: string;
  mealPreference?: string;
  dietaryRestrictions?: string[];
  isWaitlist?: boolean;
}

export interface TableConfig {
  name: string;
  capacity: number;
  icon: string; // Emoji, such as "🪑"
  override: string; // "" (auto), "available", "unavailable"
}

export interface EventDetails {
  title: string;
  date: string;
  venue: string;
  time: string;
}
