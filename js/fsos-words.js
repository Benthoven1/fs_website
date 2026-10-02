// fsos-words.js — the FSOS word sphere's vocabulary and type.
// The twelve agents, what each looks after, and eight pieces of everyday work
// each one handles, plus the Chief of Staff's own words that coordinate them.
// Shared by js/fsos.js and tools/pack-fsos-cloud.html: after changing a word
// or a style, re-run the packer to regenerate js/fsos-cloud.js.

export const WORKFORCE = [
  { agent: "Research", focus: "Evidence", work: ["interviews", "literature review", "citations", "sources", "memo", "field notes", "data sets", "peer review"] },
  { agent: "Grants", focus: "Funders", work: ["grant report", "letter of inquiry", "proposal", "deadlines", "renewals", "grant agreement", "grant calendar", "budget narrative"] },
  { agent: "Communications", focus: "Press", work: ["press release", "newsletter", "annual report", "media list", "op-ed", "translations", "talking points", "story bank"] },
  { agent: "Governance", focus: "Board", work: ["board minutes", "bylaws", "policies", "conflict of interest", "agenda", "resolution", "annual meeting", "committees"] },
  { agent: "Development", focus: "Donors", work: ["gift receipt", "donor letter", "appeal", "pledges", "stewardship", "thank-you notes", "case for support", "major gifts"] },
  { agent: "Finance", focus: "Budgets", work: ["budget variance", "cash flow", "payroll", "invoices", "reconciliation", "fiscal year", "restricted funds", "forecast"] },
  { agent: "Compliance", focus: "Filings", work: ["form 990", "audit trail", "insurance", "permits", "risk register", "state filings", "data privacy", "gift agreement"] },
  { agent: "Programs", focus: "Services", work: ["theory of change", "milestones", "partners", "site visits", "accessibility", "curriculum", "participants", "enrollment"] },
  { agent: "Volunteers", focus: "Recruiting", work: ["volunteer roster", "onboarding", "training", "shift schedule", "background checks", "volunteer hours", "recognition", "sign-up forms"] },
  { agent: "Marketing", focus: "Outreach", work: ["audiences", "social posts", "website", "tickets", "campaign", "sponsors", "email list", "brand"] },
  { agent: "Operations", focus: "Logistics", work: ["schedule", "venues", "contracts", "timeline", "vendor quotes", "event plan", "run of show", "hiring"] },
  { agent: "Evaluation", focus: "Impact", work: ["logic model", "survey", "outcomes", "metrics", "impact report", "baseline", "feedback", "lessons learned"] },
];

export const CHIEF_OF_STAFF = {
  agent: "Chief of Staff",
  focus: "Coordinates the twelve",
  work: ["blueprint", "mission", "decisions", "memory", "drafts", "approvals", "handoffs", "sign-off"],
};

// Each style: the font words are drawn in, and a word's height in radians
// on the sphere at full size
export const STYLES = {
  agent: { font: '500 72px "Cormorant SC"', px: 72, h: 0.24 },
  focus: { font: '500 64px "Cormorant Garamond"', px: 64, h: 0.17 },
  work:  { font: '400 48px "DM Mono"', px: 48, h: 0.115 },
};

// Every word, with its kind and the agent it belongs to, in a fixed order
export function vocabulary() {
  return [
    ...WORKFORCE.map((a) => ({ text: a.agent, kind: "agent", owner: a.agent })),
    ...WORKFORCE.map((a) => ({ text: a.focus, kind: "focus", owner: a.agent })),
    ...WORKFORCE.flatMap((a) => a.work.map((text) => ({ text, kind: "work", owner: a.agent }))),
    ...CHIEF_OF_STAFF.work.map((text) => ({ text, kind: "work", owner: CHIEF_OF_STAFF.agent })),
  ];
}

// The slot a word is drawn in: its width plus a little air, by 1.25 em
export function slotSize(ctx, text, style) {
  ctx.font = style.font;
  return { w: Math.ceil(ctx.measureText(text).width + style.px * 0.2), h: Math.ceil(style.px * 1.25) };
}

// Draws a word centred on (cx, cy). Given a slot width, the word is scaled to
// fill it exactly, so it keeps its proportions on the sphere even if the font
// has changed since the slot was measured.
export function drawWord(ctx, text, style, cx, cy, slotW) {
  ctx.font = style.font;
  const fit = slotW ? slotW / (ctx.measureText(text).width + style.px * 0.2) : 1;
  ctx.save();
  ctx.translate(cx, cy + style.px * 0.04);
  ctx.scale(fit, 1);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
