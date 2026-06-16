/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cloud persistence layer. All user data (reservations, table map setup and
 * staff list) is stored in the database scoped to the signed-in account, so it
 * survives app updates, reloads and is available on any device.
 */

import { supabase } from "@/integrations/supabase/client";
import { Guest, TableConfig, EntryType, RsvpStatus } from "@/types";

// Cast to a loosely typed client so we can reach all account tables even before
// generated types catch up.
const sb = supabase as any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

// ---------- Reservations <-> Guest ----------

function rowToGuest(r: any): Guest {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone || "",
    type: r.type === "Walk-In" ? EntryType.WALK_IN : EntryType.RESERVATION,
    date: typeof r.date === "string" ? r.date.split("T")[0] : r.date,
    time: r.time || "",
    pax: r.pax ?? 1,
    table: r.table_name || "Unassigned",
    status: (r.status as RsvpStatus) || RsvpStatus.PENDING,
    staff: r.staff || "",
    notes: r.notes || "",
    arrival: r.arrival || "",
    isWaitlist: !!r.is_waitlist,
  };
}

function guestToRow(g: Guest, email: string) {
  return {
    name: g.name,
    phone: g.phone || "",
    type: g.type,
    date: g.date,
    time: g.time || "",
    pax: Number(g.pax) || 1,
    table_name: g.table || "Unassigned",
    status: g.status,
    staff: g.staff || "",
    notes: g.notes || "",
    arrival: g.arrival || "",
    is_waitlist: !!g.isWaitlist,
    email: email || "",
  };
}

export async function loadReservations(): Promise<Guest[]> {
  const { data, error } = await sb
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToGuest);
}

export async function insertReservation(g: Guest, email: string): Promise<Guest> {
  const { data, error } = await sb
    .from("reservations")
    .insert(guestToRow(g, email))
    .select()
    .single();
  if (error) throw error;
  return rowToGuest(data);
}

export async function updateReservation(g: Guest, email: string): Promise<Guest> {
  if (!isUuid(g.id)) return insertReservation(g, email);
  const { data, error } = await sb
    .from("reservations")
    .update(guestToRow(g, email))
    .eq("id", g.id)
    .select()
    .single();
  if (error) throw error;
  return rowToGuest(data);
}

export async function deleteReservation(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const { error } = await sb.from("reservations").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkUpdateStatus(ids: string[], status: RsvpStatus): Promise<void> {
  const valid = ids.filter(isUuid);
  if (!valid.length) return;
  const { error } = await sb.from("reservations").update({ status }).in("id", valid);
  if (error) throw error;
}

export async function bulkDeleteReservations(ids: string[]): Promise<void> {
  const valid = ids.filter(isUuid);
  if (!valid.length) return;
  const { error } = await sb.from("reservations").delete().in("id", valid);
  if (error) throw error;
}

export async function clearAllReservations(): Promise<void> {
  const { error } = await sb.from("reservations").delete().not("id", "is", null);
  if (error) throw error;
}

export async function importReservations(guests: Guest[], email: string): Promise<Guest[]> {
  await clearAllReservations();
  if (!guests.length) return [];
  const rows = guests.map((g) => guestToRow(g, email));
  const { data, error } = await sb.from("reservations").insert(rows).select();
  if (error) throw error;
  return (data || []).map(rowToGuest).sort((a: Guest, b: Guest) => (a.id < b.id ? 1 : -1));
}

// ---------- Tables ----------

function rowToTable(r: any): TableConfig {
  return {
    name: r.name,
    capacity: r.cap ?? 2,
    icon: r.icon || "🪑",
    override: r.override || "",
  };
}

export async function loadTables(): Promise<TableConfig[]> {
  const { data, error } = await sb
    .from("restaurant_tables")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToTable);
}

export async function replaceTables(tables: TableConfig[]): Promise<void> {
  await sb.from("restaurant_tables").delete().not("id", "is", null);
  if (!tables.length) return;
  const rows = tables.map((t, i) => ({
    name: t.name,
    cap: Number(t.capacity) || 2,
    icon: t.icon || "🪑",
    override: t.override || "",
    sort_order: i,
  }));
  const { error } = await sb.from("restaurant_tables").insert(rows);
  if (error) throw error;
}

// ---------- Staff ----------

export async function loadStaff(): Promise<string[]> {
  const { data, error } = await sb
    .from("staff")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => r.name as string);
}

export async function replaceStaff(staff: string[]): Promise<void> {
  await sb.from("staff").delete().not("id", "is", null);
  if (!staff.length) return;
  const rows = staff.map((name, i) => ({ name, sort_order: i }));
  const { error } = await sb.from("staff").insert(rows);
  if (error) throw error;
}
