import { describe, expect, it } from "vitest";

import {
  getSlackConversationLabel,
  normalizeSlackMessage,
  shouldIgnoreSlackMessage,
} from "@/lib/integrations/slack/parser";

describe("slack parser", () => {
  it("labels channels and DMs", () => {
    expect(getSlackConversationLabel({ id: "C1", name: "sales" })).toBe(
      "#sales",
    );
    expect(getSlackConversationLabel({ id: "D1", is_im: true })).toBe("DM");
  });

  it("ignores bot and system-noise messages", () => {
    expect(
      shouldIgnoreSlackMessage({
        type: "message",
        channel: "C1",
        ts: "1780000000.000100",
        text: "hello",
        bot_id: "B1",
      }),
    ).toBe(true);
    expect(
      shouldIgnoreSlackMessage({
        type: "message",
        channel: "C1",
        ts: "1780000000.000100",
        text: "joined",
        subtype: "channel_join",
      }),
    ).toBe(true);
  });

  it("normalizes Slack messages with workspace and channel context", () => {
    expect(
      normalizeSlackMessage({
        userId: "user-1",
        connectedAccountId: "account-1",
        workspaceId: "T1",
        workspaceName: "Acme",
        event: {
          type: "message",
          channel: "C1",
          user: "U1",
          text: "Can we review the pilot contract today?",
          ts: "1780000000.000100",
        },
        conversation: { id: "C1", name: "sales" },
        sender: {
          id: "U1",
          profile: { display_name: "Maya", email: "maya@example.com" },
        },
      }),
    ).toMatchObject({
      provider: "slack",
      externalMessageId: "T1:C1:1780000000.000100",
      senderName: "Maya",
      sourceLabel: "Acme Slack - #sales",
      sourceContext: {
        slackWorkspaceName: "Acme",
        slackChannelName: "sales",
        slackConversationType: "channel",
      },
    });
  });
});
