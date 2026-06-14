import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_STAFF,
  DEFAULT_TABLES,
  type Reservation,
  type ResStatus,
  type ResType,
  type TableDef,
} from "@/lib/guest-manager";

// A uuid that no real row will ever use — lets us "delete all rows".
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/* ----------------------------- Reservations ----------------------------- */

export async function loadReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r, i) => ({
    id: i + 1,
    name: r.name,
    phone: r.phone,
    email: r.email,
    type: r.type as ResType,
    date: r.date,
    time: r.time,
    pax: r.pax,
    table: r.table_name,
    status: r.status as ResStatus,
    notes: r.notes,
    staff: r.staff,
    arrival: r.arrival,
    departure: r.departure,
  }));
}

export async function saveReservations(list: Reservation[]): Promise<void> {
  const { error: delErr } = await supabase
    .from("reservations")
    .delete()
    .neq("id", NIL_UUID);
  if (delErr) throw delErr;
  if (list.length === 0) return;
  const { error } = await supabase.from("reservations").insert(
    list.map((r) => ({
      name: r.name,
      phone: r.phone,
      email: r.email,
      type: r.type,
      date: r.date,
      time: r.time,
      pax: r.pax,
      table_name: r.table,
      status: r.status,
      notes: r.notes,
      staff: r.staff,
      arrival: r.arrival,
      departure: r.departure,
    })),
  );
  if (error) throw error;
}

/* -------------------------------- Tables -------------------------------- */

export async function loadTables(): Promise<TableDef[]> {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) {
    await saveTables(DEFAULT_TABLES);
    return DEFAULT_TABLES.map((t) => ({ ...t }));
  }
  return data.map((t) => ({
    name: t.name,
    cap: t.cap,
    icon: t.icon,
    override: t.override,
  }));
}

export async function saveTables(list: TableDef[]): Promise<void> {
  const { error: delErr } = await supabase
    .from("restaurant_tables")
    .delete()
    .neq("id", NIL_UUID);
  if (delErr) throw delErr;
  if (list.length === 0) return;
  const { error } = await supabase.from("restaurant_tables").insert(
    list.map((t, i) => ({
      name: t.name,
      cap: t.cap,
      icon: t.icon,
      override: t.override,
      sort_order: i,
    })),
  );
  if (error) throw error;
}

/* -------------------------------- Staff --------------------------------- */

export async function loadStaff(): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) {
    await saveStaff(DEFAULT_STAFF);
    return [...DEFAULT_STAFF];
  }
  return data.map((s) => s.name);
}

export async function saveStaff(list: string[]): Promise<void> {
  const { error: delErr } = await supabase
    .from("staff")
    .delete()
    .neq("id", NIL_UUID);
  if (delErr) throw delErr;
  if (list.length === 0) return;
  const { error } = await supabase
    .from("staff")
    .insert(list.map((name, i) => ({ name, sort_order: i })));
  if (error) throw error;
}
