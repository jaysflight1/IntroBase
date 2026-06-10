import { describe, expect, it } from "vitest";

import type { SyncJobType } from "@/lib/integrations/syncJobs";

describe("sync job types", () => {
  it("keeps provider job names explicit", () => {
    const jobs: SyncJobType[] = [
      "gmail_full_sync",
      "gmail_incremental_sync",
      "slack_full_sync",
      "slack_event",
    ];

    expect(jobs).toHaveLength(4);
  });
});
