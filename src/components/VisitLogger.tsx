"use client";

import { useEffect } from "react";

import {
  getAnonymousUserId,
  hasExistingAnonymousUserId,
} from "@/lib/anonymousUser";
import { logEvent } from "@/lib/logEvent";

interface VisitLoggerProps {
  eventName: "visited_landing" | "visited_app";
}

export function VisitLogger({ eventName }: VisitLoggerProps) {
  useEffect(() => {
    const hadExistingId = hasExistingAnonymousUserId();
    getAnonymousUserId();
    void logEvent(eventName);

    if (hadExistingId) {
      void logEvent("returned_visit", { source_event: eventName });
    }
  }, [eventName]);

  return null;
}
