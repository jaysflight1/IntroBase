"use client";

import { useEffect, useState } from "react";

import { FeedbackForm } from "@/components/FeedbackForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STORAGE_KEYS } from "@/lib/storageKeys";

export function FeedbackPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (
        window.localStorage.getItem(STORAGE_KEYS.currentAnalysis) &&
        !window.localStorage.getItem(STORAGE_KEYS.hasSeenFeedbackModal)
      ) {
        setOpen(true);
      }
    }, 20_000);

    const listener = () => {
      if (!window.localStorage.getItem(STORAGE_KEYS.hasSeenFeedbackModal)) {
        setOpen(true);
      }
    };

    window.addEventListener("introbase-feedback-ready", listener);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("introbase-feedback-ready", listener);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How useful were the rankings?</DialogTitle>
          <DialogDescription>
            Quick feedback helps decide what to build next.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm onSubmitted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
