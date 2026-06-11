import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPriorityLabelPatch,
  ensureGmailPriorityLabels,
  hasGmailModifyScope,
  INTROBASE_PRIORITY_LABELS,
} from "@/lib/integrations/gmail/labels";

const api = vi.hoisted(() => ({
  createGmailLabel: vi.fn(),
  listGmailLabels: vi.fn(),
  modifyGmailMessageLabels: vi.fn(),
  patchGmailLabel: vi.fn(),
}));

vi.mock("@/lib/integrations/gmail/api", () => api);

describe("gmail priority labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recognizes Gmail modification scopes", () => {
    expect(
      hasGmailModifyScope(["https://www.googleapis.com/auth/gmail.modify"]),
    ).toBe(true);
    expect(hasGmailModifyScope(["https://mail.google.com/"])).toBe(true);
    expect(
      hasGmailModifyScope(["https://www.googleapis.com/auth/gmail.readonly"]),
    ).toBe(false);
  });

  it("adds one priority label and removes the stale IntroBase labels", () => {
    expect(
      buildPriorityLabelPatch("medium", {
        high: "Label_high",
        medium: "Label_medium",
        low: "Label_low",
      }),
    ).toEqual({
      addLabelIds: ["Label_medium"],
      removeLabelIds: ["Label_high", "Label_low"],
    });
  });

  it("creates missing priority labels", async () => {
    api.listGmailLabels.mockResolvedValue([]);
    api.createGmailLabel
      .mockResolvedValueOnce({ id: "Label_high", name: "IntroBase/High" })
      .mockResolvedValueOnce({ id: "Label_medium", name: "IntroBase/Medium" })
      .mockResolvedValueOnce({ id: "Label_low", name: "IntroBase/Low" });

    await expect(ensureGmailPriorityLabels("token")).resolves.toEqual({
      high: "Label_high",
      medium: "Label_medium",
      low: "Label_low",
    });

    expect(api.createGmailLabel).toHaveBeenCalledWith(
      "token",
      INTROBASE_PRIORITY_LABELS.high,
    );
    expect(api.patchGmailLabel).not.toHaveBeenCalled();
  });

  it("reuses and repairs existing priority labels", async () => {
    api.listGmailLabels.mockResolvedValue([
      {
        id: "Label_high",
        name: "IntroBase/High",
        messageListVisibility: "hide",
        labelListVisibility: "labelHide",
        color: { textColor: "#000000", backgroundColor: "#000000" },
      },
      {
        id: "Label_medium",
        name: "IntroBase/Medium",
        messageListVisibility: "show",
        labelListVisibility: "labelShow",
        color: { textColor: "#ffffff", backgroundColor: "#ffad47" },
      },
      {
        id: "Label_low",
        name: "IntroBase/Low",
        messageListVisibility: "show",
        labelListVisibility: "labelShow",
        color: { textColor: "#ffffff", backgroundColor: "#16a765" },
      },
    ]);

    await expect(ensureGmailPriorityLabels("token")).resolves.toEqual({
      high: "Label_high",
      medium: "Label_medium",
      low: "Label_low",
    });

    expect(api.createGmailLabel).not.toHaveBeenCalled();
    expect(api.patchGmailLabel).toHaveBeenCalledWith("token", "Label_high", {
      messageListVisibility: "show",
      labelListVisibility: "labelShow",
      color: INTROBASE_PRIORITY_LABELS.high.color,
    });
  });
});
