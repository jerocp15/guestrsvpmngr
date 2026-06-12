export type ResStatus =
  | "Confirmed"
  | "Seated"
  | "Pending"
  | "No-Show"
  | "Cancelled";
export type ResType = "Reservation" | "Walk-In";

export interface Reservation {
  id: number;
  name: string;
  phone: string;
  type: ResType;
  date: string;
  time: string;
  pax: number;
  table: string;
  status: ResStatus;
  notes: string;
  staff: string;
  arrival: string;
}

export interface TableDef {
  name: string;
  cap: number;
  icon: string;
  /** "" = auto, otherwise forced status ("available" | "unavailable" | "reserved" | "seated") */
  override: string;
}

export type TableState = "available" | "reserved" | "seated" | "unavailable";

export const STATUSES: ResStatus[] = [
  "Confirmed",
  "Seated",
  "Pending",
  "No-Show",
  "Cancelled",
];

export const DEFAULT_RESERVATIONS: Reservation[] = [
  { id: 1, name: "Maria Santos", phone: "+63 912 345 6789", type: "Reservation", date: "2025-07-15", time: "07:00 PM", pax: 4, table: "Table 5", status: "Confirmed", notes: "Birthday cake", staff: "Ana Cruz", arrival: "" },
  { id: 2, name: "Juan dela Cruz", phone: "+63 917 654 3210", type: "Reservation", date: "2025-07-15", time: "07:30 PM", pax: 2, table: "Table 2", status: "Confirmed", notes: "Anniversary", staff: "Ben Reyes", arrival: "" },
  { id: 3, name: "Walk-in Guest", phone: "", type: "Walk-In", date: "2025-07-15", time: "06:45 PM", pax: 6, table: "Table 8", status: "Seated", notes: "High chair", staff: "Ana Cruz", arrival: "06:47 PM" },
  { id: 4, name: "Sarah Lee", phone: "+63 999 111 2233", type: "Reservation", date: "2025-07-16", time: "12:00 PM", pax: 3, table: "Private Room", status: "Confirmed", notes: "Nut allergy", staff: "Carlo Diaz", arrival: "" },
];

export const DEFAULT_TABLES: TableDef[] = [
  { name: "Table 1", cap: 2, icon: "🪑", override: "" },
  { name: "Table 2", cap: 2, icon: "🪑", override: "" },
  { name: "Table 3", cap: 4, icon: "🪑", override: "" },
  { name: "Table 4", cap: 4, icon: "🛋️", override: "" },
  { name: "Table 5", cap: 4, icon: "🛋️", override: "" },
  { name: "Table 6", cap: 6, icon: "🔥", override: "" },
  { name: "Private Room", cap: 12, icon: "💧", override: "" },
  { name: "Bar Area", cap: 8, icon: "🍹", override: "" },
  { name: "Event Hall", cap: 50, icon: "🔥", override: "" },
];

export const DEFAULT_STAFF: string[] = [
  "Ana Cruz",
  "Ben Reyes",
  "Carlo Diaz",
  "Donna Sy",
];

export const TABLE_ICONS = ["🔥", "💧", "🍹", "🪑", "🛋️"];

/** Today's date in YYYY-MM-DD, or the demo date if no reservation matches today. */
export function getToday(reservations: Reservation[]): string {
  const t = new Date().toISOString().slice(0, 10);
  return reservations.some((r) => r.date === t) ? t : "2025-07-15";
}

export function badgeClass(s: ResStatus): string {
  const m: Record<ResStatus, string> = {
    Confirmed: "confirmed",
    Seated: "seated",
    Pending: "pending",
    "No-Show": "noshow",
    Cancelled: "cancelled",
  };
  return `gm-badge gm-badge-${m[s]}`;
}

export function statusIcon(s: ResStatus): string {
  const icons: Record<ResStatus, string> = {
    Confirmed: "✅",
    Seated: "🪑",
    Pending: "⏳",
    "No-Show": "❌",
    Cancelled: "🚫",
  };
  return icons[s] || "";
}

/** Convert "07:00 PM" -> "19:00" for time inputs. */
export function to24h(time: string): string {
  const m = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return time;
  let hour = parseInt(m[1], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && hour !== 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${m[2]}`;
}

/** Convert "19:00" -> "07:00 PM". */
export function to12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = (h % 12 || 12).toString().padStart(2, "0");
  return `${h12}:${m.toString().padStart(2, "0")} ${ap}`;
}

export function checkTableConflict(
  reservations: Reservation[],
  table: string,
  date: string,
  excludeId: number | null,
): Reservation | null {
  if (!table) return null;
  return (
    reservations.find(
      (r) =>
        r.table === table &&
        r.date === date &&
        r.id !== excludeId &&
        !["Cancelled", "No-Show"].includes(r.status),
    ) || null
  );
}

export function getTableState(
  table: TableDef,
  reservations: Reservation[],
  day: string,
): TableState {
  if (table.override) return table.override as TableState;
  const match = reservations.find(
    (r) =>
      r.table === table.name &&
      r.date === day &&
      ["Confirmed", "Seated", "Pending"].includes(r.status),
  );
  if (!match) return "available";
  return match.status === "Seated" ? "seated" : "reserved";
}

export const STATE_LABEL: Record<TableState, string> = {
  available: "Available",
  reserved: "Reserved",
  seated: "Occupied",
  unavailable: "Unavailable",
};

export const STATE_CLASS: Record<TableState, string> = {
  available: "gm-ts-available",
  reserved: "gm-ts-reserved",
  seated: "gm-ts-seated",
  unavailable: "gm-ts-unavailable",
};

export function exportCSV(reservations: Reservation[]) {
  const headers = ["ID", "Name", "Phone", "Type", "Date", "Time", "Pax", "Table", "Status", "Staff", "Notes"];
  const rows = reservations.map((r) =>
    [r.id, r.name, r.phone, r.type, r.date, r.time, r.pax, r.table, r.status, r.staff, r.notes]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `reservations_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
