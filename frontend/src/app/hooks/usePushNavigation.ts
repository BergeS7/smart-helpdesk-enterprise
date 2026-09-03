import { useEffect, useRef } from "react";

export function usePushNavigation(userId: number, openTicket: (id: number) => unknown, openRating?: (id: number) => unknown) {
  const opener = useRef(openTicket);
  opener.current = openTicket;
  const ratingOpener = useRef(openRating);
  ratingOpener.current = openRating;
  useEffect(() => {
    const url = new URL(window.location.href);
    const owner = Number(url.searchParams.get("pushUser"));
    const ticket = Number(url.searchParams.get("pushTicket"));
    const action = url.searchParams.get("pushAction");
    if (!url.searchParams.has("pushUser")) return;
    url.searchParams.delete("pushUser"); url.searchParams.delete("pushTicket");
    url.searchParams.delete("pushAction");
    history.replaceState(history.state, "", url);
    if (owner === Number(userId) && Number.isSafeInteger(ticket) && ticket > 0) {
      if (action === "avaliar" && ratingOpener.current) void ratingOpener.current(ticket);
      else void opener.current(ticket);
    }
  }, [userId]);
}
