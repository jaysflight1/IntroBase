"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { STORAGE_KEYS } from "@/lib/storageKeys";

export function DeleteDataButton() {
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteData() {
    const confirmed = window.confirm(
      "Delete your Introbase data from this browser and the connected server account? This removes imported messages, analysis, saved contacts, follow-ups, and integration tokens.",
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch("/api/account/delete-data", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Delete request failed");
      }

      for (const key of Object.values(STORAGE_KEYS)) {
        window.localStorage.removeItem(key);
      }

      toast.success("Introbase data deleted");
      window.location.href = "/app/import";
    } catch {
      toast.error("Could not delete Introbase data");
      setIsDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={() => void deleteData()}
      disabled={isDeleting}
    >
      <Trash2 className="size-4" />
      {isDeleting ? "Deleting..." : "Delete Introbase data"}
    </Button>
  );
}
