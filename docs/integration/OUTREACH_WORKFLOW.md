# ArcNS Ecosystem Outreach Workflow

**Purpose:** A simple, repeatable process for moving a partner from identified target to live integration.

---

## Step 1 — Target Identification

Before contacting anyone, confirm the partner is worth prioritizing now.

Ask:
- Is this partner active on Arc Testnet or planning to be?
- Do we have a contact name or channel?
- Is the integration package for this partner type ready? (Explorer → arcscan package, Wallet → wallet package)
- Is there a warm intro available, or is this cold outreach?

Add to tracker with status `target`. Set a first contact date.

**Priority order (current):**
1. ArcScan — highest visibility, integration package complete
2. MetaMask — largest wallet user base, Snap path available
3. Rainbow / Trust Wallet — secondary wallet targets
4. Any dApp teams active on Arc Testnet

---

## Step 2 — First Contact

Choose the right channel:
- **Email** — preferred for formal partner requests and teams with a known contact
- **Twitter/X DM** — good for cold outreach to founders or devs with public presence
- **Telegram / Discord** — good for ecosystem contacts already in shared channels
- **GitHub issue** — good for open-source projects with a public issue tracker

Use the appropriate outreach template:
- ArcScan: `docs/integration/arcscan-integration-package.md` outreach materials
- Wallet: `docs/integration/wallet-integration-package.md` outreach materials

Keep the first message short. Goal is a reply, not a full technical handoff in message one.

Log in tracker: date, channel, message version used. Set status to `contacted`.

**Follow-up rule:** If no response in 5–7 days, send one follow-up. If no response after second attempt, mark `stalled` and revisit in 2–3 weeks.

---

## Step 3 — First Response

When a partner replies:

- Acknowledge quickly (same day if possible)
- Assess: are they interested, asking questions, or just being polite?
- If interested: offer to send the full technical package or schedule a call
- If asking questions: answer directly and attach the relevant integration doc

Update tracker status to `responded`. Log the response summary.

---

## Step 4 — Technical Package Handoff

Send the full integration package when the partner confirms interest or asks for details.

**What to send:**
- The relevant integration spec (arcscan or wallet package)
- Link to the public repo: https://github.com/khenzarr/arcns
- Live API URL: `https://arcns-app.vercel.app/api/v1/`
- API reference doc
- Offer: test names on request, direct support for questions

Use the handoff brief template for the covering message — not the short DM version.

Update tracker status to `package-sent`. Log date sent and what was included.

---

## Step 5 — Follow-up After Package

Partners often go quiet after receiving a package. This is normal.

- Wait 5–7 days after sending the package
- Follow up with a single short message: "Happy to answer any questions or jump on a quick call if that's easier."
- If they respond: move to `in-review` or `call-scheduled`
- If no response after two follow-ups: mark `stalled`

Do not send the package again. Do not send long follow-up messages. Keep follow-ups to 2–3 sentences.

---

## Step 6 — Call Scheduling

If a partner wants a call:

- Offer a 15-minute intro call
- Use the first call agenda from the relevant outreach package
- Send the agenda in advance so the partner can prepare
- Pre-call ask: skim the integration spec before the call

After the call:
- Log what was discussed and any commitments made
- Send a short follow-up message with next steps within 24 hours
- Update tracker status

---

## Step 7 — Integration Phase

Once a partner confirms they are building:

- Offer direct support: ABI questions, test name provisioning, implementation review
- Check in every 1–2 weeks — not to push, but to unblock
- Offer a pre-launch review before they go live
- When integration is live: update tracker to `closed`, note the outcome

---

## Stalled Partners

A partner is `stalled` when:
- No response after 2 follow-up attempts, or
- Conversation went cold after initial interest

For stalled partners:
- Revisit every 3–4 weeks
- Look for a new trigger (new Arc Testnet activity, new team member, ecosystem announcement)
- Try a different channel if the original one didn't work
- Do not spam — one re-engagement attempt per cycle

---

## Status Transition Summary

```
target → contacted → responded → package-sent → in-review → call-scheduled → integrating → closed
                                                                    ↓
                                                                 stalled → (re-engage) → contacted
```

---

## Key Assets

| Asset | Location |
|-------|----------|
| ArcScan integration spec | `docs/integration/arcscan-integration-package.md` |
| Wallet integration spec | `docs/integration/wallet-integration-package.md` |
| API reference | `docs/integration/public-adapter-api.md` |
| Deployment status | `docs/integration/TIER2_PUBLIC_ADAPTER_STATUS.md` |
| Live API | `https://arcns-app.vercel.app/api/v1/` |
| Public repo | https://github.com/khenzarr/arcns |
| Outreach tracker | `docs/integration/OUTREACH_TRACKER_TEMPLATE.md` |
| Weekly review checklist | `docs/integration/OUTREACH_REVIEW_CHECKLIST.md` |
