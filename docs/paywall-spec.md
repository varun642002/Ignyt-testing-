# Paywall / upgrade wall — build spec

`renderUpgradeWall(feature)` already exists in `www/app.js` and is what every gate returns. This
is the spec for what it should render. Eleven gates already call it, so improving this one
function improves every gated screen at once.

## The rule that governs everything here

**Every price string comes from `IgnytEntitlements.plans()`**, which reads Play. Not from
constants, not from this document. `entitlements.js` already says so: *"priced by Play rather
than by this app."*

If Play returns nothing — offline, products not yet active, billing unavailable — the paywall
shows the feature explanation and a retry, **never a hardcoded number**. A user who sees ₹299 and
is charged ₹349 is a refund and a one-star review.

## Layout, top to bottom

```
┌─────────────────────────────────────┐
│  ← back                             │   never a dead end: the user got here
│                                     │   from a tap and must be able to leave
│  [icon]                             │
│  Diet Plans                         │   ← IgnytEntitlements.label(feature)
│  Build a week of meals and track    │   ← one line, feature-specific
│  them against your targets.         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ANNUAL          BEST VALUE    │  │   ← badge only if an offer exists
│  │ ₹2,700  ₹1,499                │  │   ← base price struck, offer price
│  │ ₹125/month · billed yearly    │  │   ← derived from the offer price
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ MONTHLY                       │  │
│  │ ₹299                          │  │
│  │ billed monthly                │  │
│  └───────────────────────────────┘  │
│                                     │
│  [   Start 7-day free trial    ]    │   ← label depends on trial eligibility
│                                     │
│  Free for 7 days, then ₹1,499/year. │   ← the exact charge, in words
│  Cancel anytime in Play Store.      │
│                                     │
│  Restore purchase                   │   ← REQUIRED, see below
└─────────────────────────────────────┘
```

## Where each value comes from

| Shown | Source |
|---|---|
| Feature name | `IgnytEntitlements.label(feature)` — already implemented |
| Price strings | `plans()` → Play's localised `formattedPrice`. Never computed |
| Struck-through price | The **base plan** price. Only render it when an offer actually exists and is cheaper |
| "₹125/month" | Offer price ÷ 12, formatted. Label it "billed yearly" so it is not mistaken for a monthly plan |
| Trial length | The offer's free phase from Play, not a constant |
| Purchase | `IgnytEntitlements.purchase(basePlanId, offerToken)` — exists |

## Rules that are not negotiable

**The strikethrough must be a real price.** ₹2,700 must be the actual annual base plan in Play
Console. A reference price that was never charged is a misleading discount — India's CCPA dark
pattern guidelines cover this specifically.

**Never show a trial to someone ineligible.** Play decides eligibility; if the offer token is
absent, the button says "Subscribe", not "Start free trial". Promising a trial that does not
apply is the most common paywall complaint.

**"Restore purchase" is required**, not optional. A user who reinstalls, or signs in on a second
device, must be able to recover what they bought without paying again. It calls `refresh()`.

**State the exact charge in words** near the button: what is free, for how long, what happens
after, and how to cancel. Both stores require it and it reduces chargebacks.

## States to build

| State | What renders |
|---|---|
| Loading | Skeleton cards. Never a price placeholder that could be mistaken for a price |
| Loaded, offer available | Both cards, annual pre-selected, trial button |
| Loaded, no offer | Both cards, no strikethrough, button says "Subscribe" |
| **Play unavailable** | Feature explanation + "Try again". **No prices at all** |
| Purchase in progress | Button disabled and spinning. Rapid taps must not open two purchase sheets |
| Purchase cancelled | Return to the paywall silently. Cancelling is not an error |
| Already premium | Should never render. If it does, `has()` is being called wrong |

## Not in scope for launch

**Student pricing (₹999).** Play has no student tier. It needs an offer with developer-determined
eligibility, plus identity verification — document upload, storage, review, retention policy, a
data-safety declaration, and DPDP obligations for holding student IDs. Most solo apps buy this
(SheerID, UNiDAYS) rather than build it. Ship monthly and annual first.

## Test before shipping

- Airplane mode → no prices shown, retry offered, no crash
- Cancel the Play sheet → back on the paywall, nothing charged
- Buy → unlocks, and **the server agrees** (`is_entitled(user)` true)
- Reinstall → "Restore purchase" recovers it
- Let a licence-tester subscription lapse → drops back to free on **both** sides
