import { useEffect, useRef } from "react";

export function usePushNavigation(userId: number, openTicket: (id: number) => unknown) {
  const opener = useRef(openTicket);
  opener.current = openTicket;
  useEffect(() => {
    const url = new URL(window.location.href);
    const owner = Number(url.searchParams.get("pushUser"));
    const ticket = Number(url.searchParams.get("pushTicket"));
    if (!url.searchParams.has("pushUser")) return;
    url.searchParams.delete("pushUser"); url.searchParams.delete("pushTicket");
    history.replaceState(history.state, "", url);
    if (owner === Number(userId) && Number.isSafeInteger(ticket) && ticket > 0) void opener.current(ticket);
  }, [userId]);
}
