"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAnonymousUserId, getSessionId } from "@/lib/anonymousUser";
import { STORAGE_KEYS } from "@/lib/storageKeys";

const usefulnessOptions = ["Very useful", "Somewhat useful", "Not useful"];
const useAgainOptions = ["Yes", "Maybe", "No"];
const payOptions = [
  "I would not pay",
  "Maybe",
  "$5/month",
  "$10/month",
  "$20/month",
  "$50/month",
  "$100+/month if it worked well",
];

export function FeedbackForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [usefulness, setUsefulness] = useState("Very useful");
  const [wouldUseAgain, setWouldUseAgain] = useState("Yes");
  const [pay, setPay] = useState("Maybe");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatFailed, setWhatFailed] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_user_id: getAnonymousUserId(),
          session_id: getSessionId(),
          usefulness_rating: usefulness,
          would_use_again: wouldUseAgain,
          willingness_to_pay: pay,
          expanded_version_interest:
            "If an expanded version connected to real inboxes and DMs, prioritized messages automatically, drafted replies, and reminded me to follow up.",
          what_worked: whatWorked,
          what_failed: whatFailed,
          email,
        }),
      });

      if (!response.ok) throw new Error("Feedback failed");

      window.localStorage.setItem(STORAGE_KEYS.hasSeenFeedbackModal, "true");
      toast.success("Feedback submitted");
      onSubmitted?.();
    } catch {
      toast.error("Could not submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <ChoiceGroup
        label="How useful were the rankings?"
        value={usefulness}
        options={usefulnessOptions}
        onChange={setUsefulness}
      />
      <ChoiceGroup
        label="Would you use Introbase again?"
        value={wouldUseAgain}
        options={useAgainOptions}
        onChange={setWouldUseAgain}
      />
      <ChoiceGroup
        label="What would you pay for an expanded version?"
        value={pay}
        options={payOptions}
        onChange={setPay}
      />
      <div className="space-y-2">
        <label className="text-sm font-medium">What did Introbase get right?</label>
        <Textarea value={whatWorked} onChange={(event) => setWhatWorked(event.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">What did it get wrong or miss?</label>
        <Textarea value={whatFailed} onChange={(event) => setWhatFailed(event.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Want beta access or updates?</label>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button onClick={submit} disabled={isSubmitting}>
        Submit feedback
      </Button>
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={value === option ? "default" : "outline"}
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
