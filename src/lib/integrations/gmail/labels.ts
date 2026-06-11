import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createGmailLabel,
  listGmailLabels,
  modifyGmailMessageLabels,
  patchGmailLabel,
  type GmailLabel,
  type GmailLabelSpec,
} from "@/lib/integrations/gmail/api";
import type { Priority } from "@/types";

export const INTROBASE_PRIORITY_LABELS: Record<Priority, GmailLabelSpec> = {
  high: {
    name: "IntroBase/High",
    messageListVisibility: "show",
    labelListVisibility: "labelShow",
    color: {
      textColor: "#ffffff",
      backgroundColor: "#fb4c2f",
    },
  },
  medium: {
    name: "IntroBase/Medium",
    messageListVisibility: "show",
    labelListVisibility: "labelShow",
    color: {
      textColor: "#ffffff",
      backgroundColor: "#ffad47",
    },
  },
  low: {
    name: "IntroBase/Low",
    messageListVisibility: "show",
    labelListVisibility: "labelShow",
    color: {
      textColor: "#ffffff",
      backgroundColor: "#16a765",
    },
  },
};

export type PriorityLabelIds = Record<Priority, string>;

export function hasGmailModifyScope(scopes: string[] | null | undefined) {
  return (
    scopes?.includes("https://www.googleapis.com/auth/gmail.modify") ||
    scopes?.includes("https://mail.google.com/")
  );
}

function needsPatch(label: GmailLabel, spec: GmailLabelSpec) {
  return (
    label.messageListVisibility !== spec.messageListVisibility ||
    label.labelListVisibility !== spec.labelListVisibility ||
    label.color?.textColor !== spec.color.textColor ||
    label.color?.backgroundColor !== spec.color.backgroundColor
  );
}

function buildCachedIds(metadata: unknown): PriorityLabelIds | null {
  if (!metadata || typeof metadata !== "object") return null;

  const labelIds = (metadata as { introbasePriorityLabels?: unknown })
    .introbasePriorityLabels;

  if (!labelIds || typeof labelIds !== "object") return null;

  const candidate = labelIds as Partial<Record<Priority, unknown>>;

  if (
    typeof candidate.high === "string" &&
    typeof candidate.medium === "string" &&
    typeof candidate.low === "string"
  ) {
    return {
      high: candidate.high,
      medium: candidate.medium,
      low: candidate.low,
    };
  }

  return null;
}

export async function ensureGmailPriorityLabels(
  accessToken: string,
): Promise<PriorityLabelIds> {
  const labels = await listGmailLabels(accessToken);
  const labelsByName = new Map(labels.map((label) => [label.name, label]));
  const labelIds = {} as PriorityLabelIds;

  for (const priority of Object.keys(INTROBASE_PRIORITY_LABELS) as Priority[]) {
    const spec = INTROBASE_PRIORITY_LABELS[priority];
    const existing = labelsByName.get(spec.name);
    const label = existing ?? (await createGmailLabel(accessToken, spec));

    if (existing && needsPatch(existing, spec)) {
      await patchGmailLabel(accessToken, existing.id, {
        messageListVisibility: spec.messageListVisibility,
        labelListVisibility: spec.labelListVisibility,
        color: spec.color,
      });
    }

    labelIds[priority] = label.id;
  }

  return labelIds;
}

export async function getOrEnsureGmailPriorityLabels(input: {
  supabase: SupabaseClient;
  accountId: string;
  accessToken: string;
  metadata?: unknown;
}) {
  const cached = buildCachedIds(input.metadata);

  if (cached) {
    return cached;
  }

  const labelIds = await ensureGmailPriorityLabels(input.accessToken);

  await input.supabase
    .from("connected_accounts")
    .update({
      metadata: {
        ...(input.metadata && typeof input.metadata === "object"
          ? input.metadata
          : {}),
        introbasePriorityLabels: labelIds,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.accountId);

  return labelIds;
}

export function buildPriorityLabelPatch(
  priority: Priority,
  labelIds: PriorityLabelIds,
) {
  return {
    addLabelIds: [labelIds[priority]],
    removeLabelIds: (Object.keys(labelIds) as Priority[])
      .filter((candidate) => candidate !== priority)
      .map((candidate) => labelIds[candidate]),
  };
}

export async function applyGmailPriorityLabel(input: {
  accessToken: string;
  messageId: string;
  priority: Priority;
  labelIds: PriorityLabelIds;
}) {
  const patch = buildPriorityLabelPatch(input.priority, input.labelIds);

  await modifyGmailMessageLabels(input.accessToken, input.messageId, patch);
}
