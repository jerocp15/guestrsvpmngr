import { createFileRoute } from "@tanstack/react-router";
import GuestManagerApp from "@/components/guest-manager/GuestManagerApp";
import AuthGate from "@/components/auth/AuthGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reservation Management · Smart Restaurant Reservations" },
      {
        name: "description",
        content:
          "Reservation Management — a smart reservation system with repeat-guest detection, a live table map, staff management, and CSV export for restaurants.",
      },
      { property: "og:title", content: "Reservation Management · Smart Restaurant Reservations" },
      {
        property: "og:description",
        content:
          "Manage reservations and walk-ins, track a live table map, and detect repeat guests — all in one elegant dashboard.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AuthGate>
      <GuestManagerApp />
    </AuthGate>
  );
}
