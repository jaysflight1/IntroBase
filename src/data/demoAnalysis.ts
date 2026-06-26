import type { AnalysisResult } from "@/types";

export const demoAnalysis: AnalysisResult = {
  messages: [
    {
      id: "demo_msg_1",
      source: "LinkedIn",
      senderName: "Maya Chen",
      senderOrganization: "Northstar Accelerator",
      senderRole: "Program Director",
      originalText:
        "Hey, I saw what you're building and would love to talk about a possible pilot with our accelerator founders. Could you send availability by noon today?",
      summary:
        "Accelerator program director wants availability by noon today for a possible founder pilot.",
      category: "customer",
      priority: "high",
      urgency: "today",
      priorityScore: 96,
      deadline: "By Noon",
      suggestedAction: "Send availability by noon today.",
      suggestedReply:
        "Hi Maya, thanks for reaching out. I would be glad to discuss a pilot with Northstar founders. I am available today at 1:30pm or 3:00pm, and tomorrow morning if either works better.",
      whyItMatters:
        "A pilot with an accelerator could put Introbase in front of many founder users at once.",
      followUpDate: "",
      contactTags: ["accelerator", "pilot", "customer"],
      status: "new",
    },
    {
      id: "demo_msg_2",
      source: "Gmail",
      senderName: "Talya",
      senderOrganization: "",
      senderRole: "",
      originalText:
        "I followed up earlier about my application but did not hear back. Do you know when we will know whether we were accepted? I need to decide by end of day today.",
      summary:
        "Talya needs an application decision update by end of day today.",
      category: "application",
      priority: "high",
      urgency: "today",
      priorityScore: 92,
      deadline: "By EOD Today",
      suggestedAction: "Reply with the application timing or send a status update today.",
      suggestedReply:
        "Hi Talya, thanks for following up. I understand the timing pressure and will check on the decision status today. I will send you an update by end of day.",
      whyItMatters:
        "The sender has a decision deadline today and is waiting on your response.",
      followUpDate: "",
      contactTags: ["application", "deadline"],
      status: "new",
    },
    {
      id: "demo_msg_3",
      source: "Email",
      senderName: "Design Partner Program",
      senderOrganization: "Design Partner Program",
      senderRole: "",
      originalText:
        "Reminder: the design partner intake form is due today if you want to be included in the next pilot cohort.",
      summary:
        "Design partner intake form is due today for inclusion in the next pilot cohort.",
      category: "customer",
      priority: "high",
      urgency: "today",
      priorityScore: 89,
      deadline: "Due Today",
      suggestedAction: "Complete and submit the intake form today.",
      suggestedReply:
        "Thanks for the reminder. I am completing the intake form today and will submit it before the deadline.",
      whyItMatters:
        "Missing the form would remove you from a near-term design partner cohort.",
      followUpDate: "",
      contactTags: ["design partner", "pilot"],
      status: "new",
    },
    {
      id: "demo_msg_4",
      source: "Email",
      senderName: "Daniel Brooks",
      senderOrganization: "SeedFund",
      senderRole: "Investor",
      originalText:
        "Your concept is interesting. Could you send a short deck by tomorrow and maybe meet after we review it?",
      summary:
        "SeedFund investor asks for a short deck by tomorrow before scheduling a meeting.",
      category: "investor",
      priority: "high",
      urgency: "this_week",
      priorityScore: 88,
      deadline: "By Tomorrow",
      suggestedAction: "Send the short investor deck by tomorrow.",
      suggestedReply:
        "Hi Daniel, thanks for taking a look. I will send a concise deck by tomorrow and would be happy to meet once you have reviewed it.",
      whyItMatters:
        "An investor is asking for concrete follow-up material on a near-term timeline.",
      followUpDate: "",
      contactTags: ["investor", "deck"],
      status: "new",
    },
    {
      id: "demo_msg_5",
      source: "Gmail",
      senderName: "Priya Nair",
      senderOrganization: "Campus Labs",
      senderRole: "Operations Lead",
      originalText:
        "We have 80 student founders who miss important sponsor and mentor messages. If your tool can help them prioritize inbound, I would like to test it within 48 hours.",
      summary:
        "Campus Labs wants to test Introbase with 80 student founders within 48 hours.",
      category: "customer",
      priority: "high",
      urgency: "this_week",
      priorityScore: 86,
      deadline: "Within 48 Hours",
      suggestedAction: "Reply with a testing plan and availability within 48 hours.",
      suggestedReply:
        "Hi Priya, that sounds like a strong fit. I can set up a lightweight test for your student founders within 48 hours and would love to learn more about the sponsor and mentor message flow.",
      whyItMatters:
        "This is a clear multi-user pilot opportunity with a short timeline.",
      followUpDate: "",
      contactTags: ["campus", "pilot", "customer"],
      status: "new",
    },
    {
      id: "demo_msg_6",
      source: "Email",
      senderName: "Lena Ortiz",
      senderOrganization: "",
      senderRole: "",
      originalText:
        "I reviewed your landing page. The privacy note is strong, but the main CTA needs to get users into the demo faster. Can you send me a revised version within 5 days?",
      summary:
        "Lena reviewed the landing page and asks for a CTA revision within 5 days.",
      category: "collaborator",
      priority: "medium",
      urgency: "this_week",
      priorityScore: 70,
      deadline: "Within 5 Days",
      suggestedAction: "Send Lena the revised landing page CTA within 5 days.",
      suggestedReply:
        "Hi Lena, thank you for the sharp feedback. I agree the CTA should get people into the demo faster. I will send you a revised version within 5 days.",
      whyItMatters:
        "This is actionable product feedback tied to the demo conversion path.",
      followUpDate: "",
      contactTags: ["feedback", "landing page"],
      status: "new",
    },
    {
      id: "demo_msg_7",
      source: "Slack",
      senderName: "Jordan",
      senderOrganization: "BetaWorks",
      senderRole: "",
      originalText:
        "Following up on the customer discovery interview. Our team still wants to try the product with real founder inbox snippets next week.",
      summary:
        "BetaWorks wants to try the product with real founder inbox snippets next week.",
      category: "customer",
      priority: "medium",
      urgency: "this_month",
      priorityScore: 66,
      deadline: "Next Week",
      suggestedAction: "Schedule the BetaWorks product trial for next week.",
      suggestedReply:
        "Hi Jordan, glad to hear the team is still interested. Next week works well for a trial with founder inbox snippets. I can send a few time options and a simple setup outline.",
      whyItMatters:
        "The opportunity is valuable, but the deadline is next week rather than immediate.",
      followUpDate: "",
      contactTags: ["customer discovery", "trial"],
      status: "new",
    },
    {
      id: "demo_msg_8",
      source: "Discord",
      senderName: "Aria",
      senderOrganization: "",
      senderRole: "",
      originalText:
        "Can you send the onboarding checklist and founder instructions within 14 days? We want to line up our next cohort.",
      summary:
        "Aria needs onboarding checklist and founder instructions within 14 days.",
      category: "collaborator",
      priority: "medium",
      urgency: "this_month",
      priorityScore: 58,
      deadline: "Within 14 Days",
      suggestedAction:
        "Prepare and send onboarding checklist and founder instructions within 14 days.",
      suggestedReply:
        "Hi Aria, yes. I can send the onboarding checklist and founder instructions within 14 days so you can line up the next cohort.",
      whyItMatters:
        "This supports a future cohort rollout but does not need action today.",
      followUpDate: "",
      contactTags: ["onboarding", "cohort"],
      status: "new",
    },
    {
      id: "demo_msg_9",
      source: "Email",
      senderName: "Campus Venture Fellowship",
      senderOrganization: "Campus Venture Fellowship",
      senderRole: "",
      originalText:
        "Your fellowship application is still active. Please upload the optional company update this month if you want it included in committee review.",
      summary:
        "Optional company update for fellowship review is due sometime this month.",
      category: "application",
      priority: "medium",
      urgency: "this_month",
      priorityScore: 52,
      deadline: "This Month",
      suggestedAction: "Upload the optional company update this month.",
      suggestedReply:
        "Thanks for the reminder. I will upload the optional company update this month so it can be included in committee review.",
      whyItMatters:
        "This may improve an active application, but it is optional and less urgent.",
      followUpDate: "",
      contactTags: ["fellowship", "application"],
      status: "new",
    },
    {
      id: "demo_msg_10",
      source: "LinkedIn",
      senderName: "Calvin Reed",
      senderOrganization: "",
      senderRole: "Outbound sales",
      originalText:
        "I help startups get 10x more leads with automated outbound. Want me to send pricing next month?",
      summary:
        "Sales outreach offering automated outbound pricing next month.",
      category: "sales",
      priority: "low",
      urgency: "later",
      priorityScore: 18,
      deadline: "Next Month",
      suggestedAction: "Ignore or archive unless outbound sales help becomes relevant.",
      suggestedReply:
        "Thanks Calvin, but this is not a priority for us right now. I will reach out if that changes.",
      whyItMatters:
        "This is low-priority sales outreach and does not require near-term action.",
      followUpDate: "",
      contactTags: ["sales"],
      status: "new",
    },
    {
      id: "demo_msg_11",
      source: "Email",
      senderName: "Newsletter",
      senderOrganization: "",
      senderRole: "",
      originalText:
        "This week in AI: 47 tools you cannot miss, plus a roundup of prompt engineering tips.",
      summary: "Generic AI newsletter with no direct action needed.",
      category: "spam",
      priority: "low",
      urgency: "ignore",
      priorityScore: 8,
      deadline: "Ignore",
      suggestedAction: "Archive or ignore.",
      suggestedReply: "No reply needed.",
      whyItMatters:
        "This is informational content without a requested action or relationship context.",
      followUpDate: "",
      contactTags: ["newsletter"],
      status: "ignored",
    },
    {
      id: "demo_msg_12",
      source: "Discord",
      senderName: "Theo",
      senderOrganization: "",
      senderRole: "",
      originalText:
        "Low stakes, but I wrote up a small bug note in my newsletter after testing an old import. No rush; handle it whenever you have time.",
      summary:
        "Theo shared a low-stakes bug note with no deadline.",
      category: "other",
      priority: "low",
      urgency: "later",
      priorityScore: 22,
      deadline: "No Rush",
      suggestedAction: "Review the bug note after higher-priority items.",
      suggestedReply:
        "Thanks Theo, I appreciate you writing that up. I will take a look after I handle the higher-priority launch items.",
      whyItMatters:
        "Useful feedback, but the sender explicitly says there is no rush.",
      followUpDate: "",
      contactTags: ["feedback", "bug"],
      status: "new",
    },
  ],
  contacts: [
    {
      id: "demo_contact_1",
      name: "Maya Chen",
      organization: "Northstar Accelerator",
      role: "Program Director",
      source: "LinkedIn",
      tags: ["accelerator", "pilot", "customer"],
      lastInteractionSummary:
        "Asked for availability by noon today to discuss an accelerator founder pilot.",
      priority: "high",
      nextStep: "Send availability by noon today.",
      lastInteractionAt: "",
    },
    {
      id: "demo_contact_2",
      name: "Daniel Brooks",
      organization: "SeedFund",
      role: "Investor",
      source: "Email",
      tags: ["investor", "deck"],
      lastInteractionSummary:
        "Requested a short deck by tomorrow before meeting.",
      priority: "high",
      nextStep: "Send the short deck by tomorrow.",
      lastInteractionAt: "",
    },
    {
      id: "demo_contact_3",
      name: "Priya Nair",
      organization: "Campus Labs",
      role: "Operations Lead",
      source: "Gmail",
      tags: ["campus", "pilot", "customer"],
      lastInteractionSummary:
        "Wants to test Introbase with 80 student founders within 48 hours.",
      priority: "high",
      nextStep: "Send a test plan and schedule setup.",
      lastInteractionAt: "",
    },
    {
      id: "demo_contact_4",
      name: "Lena Ortiz",
      organization: "",
      role: "",
      source: "Email",
      tags: ["feedback", "landing page"],
      lastInteractionSummary:
        "Reviewed the landing page and asked for a revised CTA within 5 days.",
      priority: "medium",
      nextStep: "Send the revised CTA within 5 days.",
      lastInteractionAt: "",
    },
  ],
  sourceTypes: ["LinkedIn", "Gmail", "Email", "Slack", "Discord"],
  categoryCounts: {
    customer: 4,
    application: 2,
    investor: 1,
    collaborator: 2,
    sales: 1,
    spam: 1,
    other: 1,
  },
  messageCount: 12,
  analysisDiagnostics: {
    engine: "openai",
    model: "demo-simulation",
    openaiAttempted: true,
  },
};
