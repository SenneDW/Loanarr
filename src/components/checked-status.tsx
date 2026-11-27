"use client";

import { useEffect, useState } from "react";

const DAY_MS = 86_400_000;

/**
 * Footer status line for data we check by hand: dot + "Gecontroleerd · 26 nov".
 * The dot turns amber when the check is stale. Freshness depends on today's
 * date, so it is worked out in the browser: the page itself stays prerendered.
 */
export function CheckedStatus({
  checkedOn,
  staleAfter,
  freshTitle,
  staleTitle,
}: {
  /** ISO date ("2026-11-26") of the last manual check. */
  checkedOn: string;
  /** "30d": stale after 30 days. "year": stale once a new year has started. */
  staleAfter: "30d" | "year";
  freshTitle: string;
  staleTitle: string;
}) {
  // Null until mounted: the server render assumes fresh and this year.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const checked = new Date(`${checkedOn}T12:00:00Z`);
  const fresh =
    !now ||
    (staleAfter === "30d"
      ? now.getTime() - checked.getTime() <= 30 * DAY_MS
      : now.getUTCFullYear() === checked.getUTCFullYear());
  const sameYear = !now || now.getUTCFullYear() === checked.getUTCFullYear();
  const when = checked.toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone: "Europe/Brussels",
  });

  return (
    <dd
      className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground"
      title={fresh ? freshTitle : staleTitle}
    >
      <span
        className={`size-2 shrink-0 rounded-full ${fresh ? "bg-primary" : "bg-chart-4"}`}
        aria-hidden="true"
      />
      Gecontroleerd · {when}
    </dd>
  );
}
