import { useEffect, useMemo, useState } from "react";
import {
  badgeClass,
  checkTableConflict,
  DEFAULT_STAFF,
  DEFAULT_TABLES,
  exportCSV,
  getTableState,
  getToday,
  STATE_CLASS,
  STATE_LABEL,
  STATUSES,
  statusIcon,
  TABLE_ICONS,
  to12h,
  to24h,
  type Reservation,
  type ResStatus,
  type ResType,
  type TableDef,
  type TableState,
} from "@/lib/guest-manager";
import { useRemoteCollection } from "@/hooks/use-remote-collection";
import {
  loadReservations,
  loadStaff,
  loadTables,
  saveReservations,
  saveStaff,
  saveTables,
} from "@/lib/guest-data";
import { supabase } from "@/integrations/supabase/client";

type Page = "dashboard" | "reservations" | "tablemap";

interface FormState {
  open: boolean;
  editId: number | null;
  type: ResType;
  name: string;
  phone: string;
  date: string;
  time: string;
  pax: number;
  table: string;
  status: ResStatus;
  notes: string;
  staff: string;
}

const emptyForm: FormState = {
  open: false,
  editId: null,
  type: "Reservation",
  name: "",
  phone: "",
  date: "",
  time: "19:00",
  pax: 2,
  table: "",
  status: "Confirmed",
  notes: "",
  staff: "",
};

function typeBadge(t: ResType) {
  return t === "Walk-In" ? (
    <span className="gm-badge gm-badge-walkin">🚶 Walk-In</span>
  ) : (
    <span className="gm-badge gm-badge-reservation">📋 Rsvp</span>
  );
}

export default function GuestManagerApp() {
  const [reservations, setReservations] = useRemoteCollection<Reservation[]>(
    loadReservations,
    saveReservations,
    [],
    true,
  );
  const [tableList, setTableList] = useRemoteCollection<TableDef[]>(
    loadTables,
    saveTables,
    DEFAULT_TABLES,
    true,
  );
  const [staffList, setStaffList] = useRemoteCollection<string[]>(
    loadStaff,
    saveStaff,
    DEFAULT_STAFF,
    true,
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [fDate, setFDate] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");

  const today = getToday(reservations);
  const [mapDate, setMapDate] = useState("");
  const effectiveMapDate = mapDate || today;

  // modals
  const [form, setForm] = useState<FormState>(emptyForm);
  const [staffOpen, setStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState("");
  const [tmDraft, setTmDraft] = useState<TableDef[] | null>(null);
  const [tsTable, setTsTable] = useState<number | null>(null);
  const [tsKey, setTsKey] = useState<TableState | "">("");
  const [tsRsvp, setTsRsvp] = useState("");

  function showToast(msg: string) {
    setToast({ msg, key: Date.now() });
    window.setTimeout(() => setToast(null), 2500);
  }

  function goPage(p: Page) {
    setPage(p);
    setSidebarOpen(false);
  }

  const nextId = useMemo(
    () => Math.max(0, ...reservations.map((r) => r.id)) + 1,
    [reservations],
  );

  const [todayBadge, setTodayBadge] = useState("");
  useEffect(() => {
    setTodayBadge(
      new Date().toLocaleDateString("en-PH", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  }, []);

  // ---------- modal helpers ----------
  function openCreate(type: ResType) {
    setForm({
      ...emptyForm,
      open: true,
      type,
      date: today,
      status: type === "Walk-In" ? "Seated" : "Confirmed",
    });
    setSidebarOpen(false);
  }

  function openEdit(id: number) {
    const r = reservations.find((x) => x.id === id);
    if (!r) return;
    setForm({
      open: true,
      editId: r.id,
      type: r.type,
      name: r.name,
      phone: r.phone,
      date: r.date,
      time: to24h(r.time),
      pax: r.pax,
      table: r.table,
      status: r.status,
      notes: r.notes,
      staff: r.staff,
    });
  }

  function setType(t: ResType) {
    setForm((f) => ({
      ...f,
      type: t,
      status: t === "Walk-In" ? "Seated" : "Confirmed",
    }));
  }

  function saveEntry() {
    if (!form.date || !form.time) {
      showToast("Date and time required");
      return;
    }
    const conflict = checkTableConflict(
      reservations,
      form.table,
      form.date,
      form.editId,
    );
    if (
      conflict &&
      !window.confirm(
        `⚠️ Table is already assigned to ${conflict.name} (${conflict.time}). Override anyway?`,
      )
    ) {
      return;
    }
    const name =
      form.name.trim() || (form.type === "Walk-In" ? "Walk-in Guest" : "");
    const entry: Reservation = {
      id: form.editId ?? nextId,
      name,
      phone: form.phone.trim(),
      type: form.type,
      date: form.date,
      time: to12h(form.time),
      pax: Number(form.pax) || 1,
      table: form.table,
      status: form.status,
      notes: form.notes,
      staff: form.staff,
      arrival: "",
    };
    setReservations((prev) =>
      form.editId
        ? prev.map((r) => (r.id === form.editId ? entry : r))
        : [...prev, entry],
    );
    setForm(emptyForm);
    showToast("Saved");
  }

  function deleteEntry(id: number) {
    if (!window.confirm("Delete entry?")) return;
    setReservations((prev) => prev.filter((r) => r.id !== id));
    showToast("Deleted");
  }

  // ---------- staff ----------
  function addStaff() {
    const name = newStaff.trim();
    if (!name) return showToast("Enter name");
    if (staffList.includes(name)) return showToast("Already exists");
    setStaffList((prev) => [...prev, name]);
    setNewStaff("");
    showToast(`Added ${name}`);
  }

  function removeStaff(i: number) {
    if (!window.confirm(`Remove ${staffList[i]}?`)) return;
    setStaffList((prev) => prev.filter((_, idx) => idx !== i));
    showToast("Removed");
  }

  // ---------- table manager ----------
  function openTableManager() {
    setTmDraft(tableList.map((t) => ({ ...t })));
  }
  function updateDraft(i: number, patch: Partial<TableDef>) {
    setTmDraft((d) => d!.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function saveTableManager() {
    if (tmDraft) setTableList(tmDraft);
    setTmDraft(null);
    showToast("Table config saved");
  }

  // ---------- table status ----------
  function openTableStatus(idx: number) {
    setTsTable(idx);
    const t = tableList[idx];
    setTsKey(getTableState(t, reservations, effectiveMapDate));
    const linked = reservations.find(
      (r) => r.table === t.name && r.date === effectiveMapDate,
    );
    setTsRsvp(linked ? String(linked.id) : "");
  }

  function applyTableStatus() {
    if (tsTable === null) return;
    const idx = tsTable;
    const t = tableList[idx];
    if (tsKey) {
      const override = tsKey === "available" ? "" : tsKey;
      setTableList((prev) =>
        prev.map((x, i) => (i === idx ? { ...x, override } : x)),
      );
    }
    const rsvpId = parseInt(tsRsvp, 10);
    if (!Number.isNaN(rsvpId)) {
      setReservations((prev) =>
        prev.map((r) => {
          if (r.id !== rsvpId) return r;
          const updated: Reservation = { ...r, table: t.name };
          if (tsKey === "seated") updated.status = "Seated";
          if (tsKey === "reserved") updated.status = "Confirmed";
          return updated;
        }),
      );
    }
    setTsTable(null);
    showToast(`Table ${t.name} updated`);
  }

  // ---------- derived data ----------
  const todayRows = reservations.filter((r) => r.date === today);
  const kpis = [
    { value: todayRows.length, label: "Today" },
    { value: todayRows.reduce((s, r) => s + (Number(r.pax) || 0), 0), label: "Pax" },
    { value: todayRows.filter((r) => r.status === "Confirmed").length, label: "Confirmed" },
    { value: todayRows.filter((r) => r.status === "Seated").length, label: "Seated" },
    { value: todayRows.filter((r) => r.type === "Walk-In").length, label: "Walk-ins" },
    { value: reservations.length, label: "Total" },
  ];

  const statusBars = STATUSES.map((s) => ({
    label: s,
    count: reservations.filter((r) => r.status === s).length,
  }));
  const maxStatus = Math.max(1, ...statusBars.map((b) => b.count));
  const statusColors = ["#10b981", "#6366f1", "#f59e0b", "#f97316", "#ef4444"];

  const slots = ["12:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"];
  const timeBars = slots.map((s) => ({
    label: s,
    count: reservations.filter((r) => r.time && r.time.includes(s.slice(0, 5))).length,
  }));
  const maxTime = Math.max(1, ...timeBars.map((b) => b.count));

  const filtered = reservations.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!fDate || r.date === fDate) &&
      (!fType || r.type === fType) &&
      (!fStatus || r.status === fStatus) &&
      (!q ||
        [r.name, r.phone, r.notes, r.table, r.staff]
          .join(" ")
          .toLowerCase()
          .includes(q))
    );
  });
  const filteredPax = filtered.reduce((s, r) => s + (Number(r.pax) || 0), 0);

  const mapCounts: Record<TableState, number> = {
    available: 0,
    reserved: 0,
    seated: 0,
    unavailable: 0,
  };
  tableList.forEach((t) => {
    mapCounts[getTableState(t, reservations, effectiveMapDate)]++;
  });

  // repeat guest + conflict (modal)
  const repeatGuest = useMemo(() => {
    const phone = form.phone.trim();
    if (!phone) return null;
    const matches = reservations
      .filter((r) => r.phone && r.phone.trim() === phone && r.id !== form.editId)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return matches[0] ?? null;
  }, [form.phone, form.editId, reservations]);

  const conflict = checkTableConflict(
    reservations,
    form.table,
    form.date,
    form.editId,
  );

  function loadGuestData(g: Reservation) {
    setForm((f) => ({
      ...f,
      name: f.name.trim() || g.name,
      notes: f.notes.trim() || g.notes,
    }));
    showToast(`Loaded ${g.name}`);
  }

  const navItems: { id: Page; icon: string; label: string }[] = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "reservations", icon: "📋", label: "All Reservations" },
    { id: "tablemap", icon: "🗺️", label: "Table Map" },
  ];
  const pageTitle =
    page === "dashboard"
      ? "Dashboard"
      : page === "reservations"
        ? "All Reservations"
        : "Table Map";

  return (
    <div className="gm">
      <div className="gm-app">
        {sidebarOpen && (
          <div className="gm-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`gm-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="gm-sidebar-logo">
            <h1>Reservation Management</h1>
            <p>Staff + Table Map</p>
          </div>
          <nav className="gm-sidebar-nav">
            <div className="gm-nav-label">Main</div>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`gm-nav-btn${page === item.id ? " active" : ""}`}
                onClick={() => goPage(item.id)}
              >
                <span className="icon">{item.icon}</span> {item.label}
              </button>
            ))}
            <div className="gm-nav-label">Actions</div>
            <button className="gm-nav-btn" onClick={() => openCreate("Reservation")}>
              <span className="icon">➕</span> Add Reservation
            </button>
            <button className="gm-nav-btn" onClick={() => openCreate("Walk-In")}>
              <span className="icon">🚶</span> Log Walk-In
            </button>
            <div className="gm-nav-label">Tools</div>
            <button
              className="gm-nav-btn"
              onClick={() => {
                setStaffOpen(true);
                setSidebarOpen(false);
              }}
            >
              <span className="icon">👥</span> Manage Staff
            </button>
            <button
              className="gm-nav-btn"
              onClick={() => {
                exportCSV(reservations);
                showToast("CSV exported");
              }}
            >
              <span className="icon">📥</span> Export CSV
            </button>
            <button className="gm-nav-btn" onClick={() => window.print()}>
              <span className="icon">🖨️</span> Print View
            </button>
            <div className="gm-nav-label">Account</div>
            <button className="gm-nav-btn" onClick={handleSignOut}>
              <span className="icon">🚪</span> Sign Out
            </button>
          </nav>
          <div className="gm-sidebar-footer">Smart reservations · Cloud-synced</div>
        </aside>

        <div className="gm-main">
          <div className="gm-topbar">
            <div className="gm-topbar-left">
              <button
                className="gm-menu-btn"
                onClick={() => setSidebarOpen((s) => !s)}
                aria-label="Toggle menu"
              >
                ☰
              </button>
              <h2>{pageTitle}</h2>
              <span className="gm-date-badge">{todayBadge}</span>
            </div>
            <div className="gm-topbar-right">
              <button className="gm-btn gm-btn-gold" onClick={() => openCreate("Walk-In")}>
                🚶 Walk-In
              </button>
              <button className="gm-btn gm-btn-primary" onClick={() => openCreate("Reservation")}>
                ➕ Reservation
              </button>
            </div>
          </div>

          {/* ---------- DASHBOARD ---------- */}
          {page === "dashboard" && (
            <div className="gm-page">
              <p className="display gm-heading">Good evening 👋</p>
              <p style={{ color: "var(--text-soft)", marginBottom: 24 }}>
                Today's snapshot
              </p>
              <div className="gm-kpi-grid">
                {kpis.map((k) => (
                  <div className="gm-kpi-card" key={k.label}>
                    <div className="value">{k.value}</div>
                    <div className="label">{k.label}</div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 20,
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  marginBottom: 28,
                }}
              >
                <div className="gm-card" style={{ padding: 20 }}>
                  <h4>📊 Reservations by Status</h4>
                  <div style={{ marginTop: 16 }}>
                    {statusBars.map((b, i) => (
                      <div className="gm-bar-row" key={b.label}>
                        <div className="gm-bar-label">{b.label}</div>
                        <div className="gm-bar-track">
                          <div
                            className="gm-bar-fill"
                            style={{
                              width: `${Math.round((b.count / maxStatus) * 100)}%`,
                              background: statusColors[i],
                            }}
                          />
                        </div>
                        <div className="gm-bar-count">{b.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="gm-card" style={{ padding: 20 }}>
                  <h4>🕐 Popular time slots</h4>
                  <div style={{ marginTop: 16 }}>
                    {timeBars.map((b) => (
                      <div className="gm-bar-row" key={b.label}>
                        <div className="gm-bar-label">{b.label}</div>
                        <div className="gm-bar-track">
                          <div
                            className="gm-bar-fill"
                            style={{
                              width: `${Math.round((b.count / maxTime) * 100)}%`,
                              background: "#c9972c",
                            }}
                          />
                        </div>
                        <div className="gm-bar-count">{b.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="gm-card">
                <div className="gm-card-header">
                  <h3>Today's Guests</h3>
                  <span className="gm-badge gm-badge-seated">
                    {todayRows.length} entries
                  </span>
                </div>
                <div className="gm-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>Type</th>
                        <th>Time</th>
                        <th>Pax</th>
                        <th>Table</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                            No entries today
                          </td>
                        </tr>
                      ) : (
                        todayRows.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <b>{r.name}</b>
                            </td>
                            <td>{typeBadge(r.type)}</td>
                            <td>{r.time}</td>
                            <td>
                              <b>{r.pax}</b>
                            </td>
                            <td>{r.table || "—"}</td>
                            <td>
                              <span className={badgeClass(r.status)}>
                                {statusIcon(r.status)} {r.status}
                              </span>
                            </td>
                            <td style={{ maxWidth: 180 }}>{r.notes || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------- RESERVATIONS ---------- */}
          {page === "reservations" && (
            <div className="gm-page">
              <p className="display gm-heading" style={{ marginBottom: 20 }}>
                All Reservations
              </p>
              <div className="gm-card">
                <div className="gm-filter-bar">
                  <div className="gm-search-wrap">
                    <span className="icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search guest, phone, notes"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <input
                    type="date"
                    className="gm-filter-date"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                  />
                  <select
                    className="gm-filter-sel"
                    value={fType}
                    onChange={(e) => setFType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option>Reservation</option>
                    <option>Walk-In</option>
                  </select>
                  <select
                    className="gm-filter-sel"
                    value={fStatus}
                    onChange={(e) => setFStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    className="gm-btn gm-btn-ghost"
                    onClick={() => {
                      setSearch("");
                      setFDate("");
                      setFType("");
                      setFStatus("");
                    }}
                  >
                    ✕ Clear
                  </button>
                </div>
                <div className="gm-summary-bar">
                  Showing <b>{filtered.length}</b> of {reservations.length} · Total pax{" "}
                  <b>{filteredPax}</b>
                </div>
                <div className="gm-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Pax</th>
                        <th>Table</th>
                        <th>Status</th>
                        <th>Staff</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={12} style={{ textAlign: "center", padding: 32 }}>
                            No matching records
                          </td>
                        </tr>
                      ) : (
                        filtered.map((r, i) => (
                          <tr key={r.id}>
                            <td>{i + 1}</td>
                            <td>
                              <b>{r.name}</b>
                            </td>
                            <td>{r.phone || "—"}</td>
                            <td>{typeBadge(r.type)}</td>
                            <td>{r.date}</td>
                            <td>{r.time}</td>
                            <td>{r.pax}</td>
                            <td>{r.table || "—"}</td>
                            <td>
                              <span className={badgeClass(r.status)}>
                                {statusIcon(r.status)} {r.status}
                              </span>
                            </td>
                            <td>{r.staff || "—"}</td>
                            <td style={{ maxWidth: 140 }}>{r.notes || "—"}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <button
                                className="gm-icon-btn gm-icon-btn-edit"
                                onClick={() => openEdit(r.id)}
                              >
                                ✏️
                              </button>
                              <button
                                className="gm-icon-btn gm-icon-btn-del"
                                onClick={() => deleteEntry(r.id)}
                              >
                                🗑
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------- TABLE MAP ---------- */}
          {page === "tablemap" && (
            <div className="gm-page">
              <p className="display gm-heading" style={{ marginBottom: 20 }}>
                Table Map
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <div className="gm-pill">
                  📅{" "}
                  <input
                    type="date"
                    value={effectiveMapDate}
                    onChange={(e) => setMapDate(e.target.value)}
                    style={{ border: "none", fontWeight: 600, background: "transparent" }}
                  />
                </div>
                <button className="gm-btn gm-btn-primary" onClick={openTableManager}>
                  ⚙ Manage Tables
                </button>
                <button
                  className="gm-btn gm-btn-gold"
                  onClick={() => openCreate("Reservation")}
                >
                  ➕ New Reservation
                </button>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                {(Object.keys(mapCounts) as TableState[]).map((s) => (
                  <div className="gm-pill" key={s}>
                    {STATE_LABEL[s]} <b>{mapCounts[s]}</b>
                  </div>
                ))}
              </div>
              <div className="gm-card">
                <div className="gm-map-grid">
                  {tableList.map((t, i) => {
                    const s = getTableState(t, reservations, effectiveMapDate);
                    const linked = reservations.find(
                      (r) =>
                        r.table === t.name &&
                        r.date === effectiveMapDate &&
                        ["Confirmed", "Seated", "Pending"].includes(r.status),
                    );
                    return (
                      <div
                        key={t.name + i}
                        className={`gm-table-slot ${STATE_CLASS[s]}`}
                        onClick={() => openTableStatus(i)}
                      >
                        <div className="t-icon">{t.icon}</div>
                        <div className="t-name">{t.name}</div>
                        <div>{STATE_LABEL[s]}</div>
                        <div>👥 {t.cap}</div>
                        {linked && (
                          <div style={{ fontSize: 10 }}>🔗 {linked.name}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="gm-legend">
                  <div className="gm-legend-item">
                    <span style={{ width: 12, height: 12, background: "#10b981", borderRadius: "50%", display: "inline-block" }} />{" "}
                    Available
                  </div>
                  <div className="gm-legend-item">
                    <span style={{ width: 12, height: 12, background: "#6366f1", borderRadius: "50%", display: "inline-block" }} />{" "}
                    Reserved
                  </div>
                  <div className="gm-legend-item">
                    <span style={{ width: 12, height: 12, background: "#f59e0b", borderRadius: "50%", display: "inline-block" }} />{" "}
                    Occupied
                  </div>
                  <div className="gm-legend-item">
                    <span style={{ width: 12, height: 12, background: "#ef4444", borderRadius: "50%", display: "inline-block" }} />{" "}
                    Unavailable
                  </div>
                  <div className="gm-legend-item" style={{ marginLeft: "auto" }}>
                    💡 Tap table to edit
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- ENTRY MODAL ---------- */}
      {form.open && (
        <div className="gm-overlay" onClick={() => setForm(emptyForm)}>
          <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gm-modal-head">
              <h3>
                {form.editId
                  ? "✏️ Edit Entry"
                  : form.type === "Walk-In"
                    ? "🚶 Log Walk-In Guest"
                    : "➕ New Reservation"}
              </h3>
              <button className="gm-modal-close" onClick={() => setForm(emptyForm)}>
                ✕
              </button>
            </div>
            <div className="gm-modal-body">
              <div className="gm-type-toggle">
                <button
                  className={`gm-type-opt${form.type === "Reservation" ? " active-res" : ""}`}
                  onClick={() => setType("Reservation")}
                >
                  📋 Reservation
                </button>
                <button
                  className={`gm-type-opt${form.type === "Walk-In" ? " active-wi" : ""}`}
                  onClick={() => setType("Walk-In")}
                >
                  🚶 Walk-In
                </button>
              </div>

              {repeatGuest && (
                <div className="gm-repeat-alert">
                  <span>
                    🔄 Repeat guest: <strong>{repeatGuest.name}</strong> (last visit{" "}
                    {repeatGuest.date})
                  </span>
                  <button onClick={() => loadGuestData(repeatGuest)}>Load details</button>
                </div>
              )}

              {conflict && (
                <div className="gm-conflict-warning">
                  ⚠️ Table already assigned to {conflict.name} ({conflict.time}). Override on
                  save?
                </div>
              )}

              <div className="gm-form-row">
                <div className="gm-form-group">
                  <label>Guest Name</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="gm-form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    placeholder="Contact number"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="gm-form-row">
                <div className="gm-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="gm-form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="gm-form-row">
                <div className="gm-form-group">
                  <label>Pax</label>
                  <input
                    type="number"
                    min={1}
                    value={form.pax}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pax: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="gm-form-group">
                  <label>Table</label>
                  <select
                    value={form.table}
                    onChange={(e) => setForm((f) => ({ ...f, table: e.target.value }))}
                  >
                    <option value="">-- Select --</option>
                    {tableList.map((t) => (
                      <option key={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="gm-form-row">
                <div className="gm-form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as ResStatus }))
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="gm-form-group">
                  <label>Staff</label>
                  <select
                    value={form.staff}
                    onChange={(e) => setForm((f) => ({ ...f, staff: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="gm-form-group">
                <label>Special notes</label>
                <textarea
                  rows={2}
                  placeholder="Allergies, celebrations, requests..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button
                  className="gm-btn gm-btn-outline"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => setStaffOpen(true)}
                >
                  👥 Edit Staff List
                </button>
              </div>
            </div>
            <div className="gm-modal-footer">
              <button className="gm-btn gm-btn-ghost" onClick={() => setForm(emptyForm)}>
                Cancel
              </button>
              <button className="gm-btn gm-btn-primary" onClick={saveEntry}>
                Save entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- STAFF MODAL ---------- */}
      {staffOpen && (
        <div className="gm-overlay" onClick={() => setStaffOpen(false)}>
          <div
            className="gm-modal"
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gm-modal-head">
              <h3>👥 Manage Staff</h3>
              <button className="gm-modal-close" onClick={() => setStaffOpen(false)}>
                ✕
              </button>
            </div>
            <div className="gm-modal-body">
              <div className="gm-add-row">
                <input
                  type="text"
                  placeholder="Staff name"
                  value={newStaff}
                  onChange={(e) => setNewStaff(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStaff()}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 40,
                    border: "1px solid var(--gm-border)",
                    fontFamily: "inherit",
                  }}
                />
                <button className="gm-btn gm-btn-primary" onClick={addStaff}>
                  ➕ Add
                </button>
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {staffList.length === 0 ? (
                  <p style={{ textAlign: "center", padding: 20 }}>
                    No staff members. Add one above.
                  </p>
                ) : (
                  staffList.map((s, i) => (
                    <div className="gm-staff-item" key={s}>
                      <span>👤 {s}</span>
                      <button onClick={() => removeStaff(i)}>🗑️</button>
                    </div>
                  ))
                )}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 12 }}>
                Removing a staff member won't delete past assignments.
              </p>
            </div>
            <div className="gm-modal-footer">
              <button className="gm-btn gm-btn-ghost" onClick={() => setStaffOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- TABLE MANAGER MODAL ---------- */}
      {tmDraft && (
        <div className="gm-overlay" onClick={() => setTmDraft(null)}>
          <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gm-modal-head">
              <h3>⚙ Manage Tables</h3>
              <button className="gm-modal-close" onClick={() => setTmDraft(null)}>
                ✕
              </button>
            </div>
            <div className="gm-modal-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <p>Edit table name, capacity, icon</p>
                <button
                  className="gm-btn gm-btn-gold"
                  onClick={() =>
                    setTmDraft((d) => [
                      ...d!,
                      { name: "New Table", cap: 4, icon: "🪑", override: "" },
                    ])
                  }
                >
                  ➕ Add Table
                </button>
              </div>
              <div className="gm-table-wrap">
                <table style={{ minWidth: 400 }}>
                  <thead>
                    <tr>
                      <th>Icon</th>
                      <th>Name</th>
                      <th>Cap</th>
                      <th>Override</th>
                      <th>Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tmDraft.map((t, i) => (
                      <tr key={i}>
                        <td>
                          <select
                            value={t.icon}
                            onChange={(e) => updateDraft(i, { icon: e.target.value })}
                          >
                            {TABLE_ICONS.map((ic) => (
                              <option key={ic}>{ic}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={t.name}
                            onChange={(e) => updateDraft(i, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={t.cap}
                            onChange={(e) =>
                              updateDraft(i, { cap: Number(e.target.value) })
                            }
                            style={{ width: 70 }}
                          />
                        </td>
                        <td>
                          <select
                            value={t.override || "auto"}
                            onChange={(e) =>
                              updateDraft(i, {
                                override: e.target.value === "auto" ? "" : e.target.value,
                              })
                            }
                          >
                            <option value="auto">Auto</option>
                            <option value="available">Always Avail</option>
                            <option value="unavailable">Unavail</option>
                          </select>
                        </td>
                        <td>
                          <button
                            className="gm-icon-btn gm-icon-btn-del"
                            onClick={() =>
                              window.confirm("Remove?") &&
                              setTmDraft((d) => d!.filter((_, idx) => idx !== i))
                            }
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="gm-modal-footer">
              <button className="gm-btn gm-btn-ghost" onClick={() => setTmDraft(null)}>
                Cancel
              </button>
              <button className="gm-btn gm-btn-primary" onClick={saveTableManager}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- TABLE STATUS MODAL ---------- */}
      {tsTable !== null && (
        <div className="gm-overlay" onClick={() => setTsTable(null)}>
          <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gm-modal-head">
              <h3>
                {tableList[tsTable].icon} {tableList[tsTable].name}
              </h3>
              <button className="gm-modal-close" onClick={() => setTsTable(null)}>
                ✕
              </button>
            </div>
            <div className="gm-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(
                  [
                    ["available", "✅ Available"],
                    ["reserved", "📋 Reserved"],
                    ["seated", "🪑 Occupied"],
                    ["unavailable", "🚫 Unavailable"],
                  ] as [TableState, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTsKey(key)}
                    style={{
                      padding: 12,
                      borderRadius: 20,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      border: `2px solid ${tsKey === key ? "var(--gold)" : "var(--gm-border)"}`,
                      background: tsKey === key ? "var(--gold-pale)" : "white",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  🔗 Link to reservation
                </label>
                <select
                  value={tsRsvp}
                  onChange={(e) => setTsRsvp(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 40, border: "1px solid var(--gm-border)" }}
                >
                  <option value="">— Link to reservation —</option>
                  {reservations
                    .filter(
                      (r) =>
                        r.date === effectiveMapDate &&
                        ["Confirmed", "Pending"].includes(r.status),
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {r.time}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="gm-modal-footer">
              <button className="gm-btn gm-btn-ghost" onClick={() => setTsTable(null)}>
                Cancel
              </button>
              <button className="gm-btn gm-btn-primary" onClick={applyTableStatus}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="gm-toast" key={toast.key}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
