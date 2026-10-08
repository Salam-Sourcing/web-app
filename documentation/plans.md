# Salam Sourcing B2B Marketplace subscription plans

Proposal recorded October 7, 2026. The user requested these options in the website and Flutter app as a **read-only preview**. This is a proposed commercial catalogue, not an active subscription offer or an entitlement change.

## Proposed catalogue

Prices are CAD, excluding applicable taxes. Plans apply per company and cover both buying and selling from the same workspace on web, iOS and Android. Saved-search allowances apply per user. Public mobile downloads remain Coming Soon until the stores are available.

| Feature                 | Starter       | Growth              | Business                              |
| ----------------------- | ------------- | ------------------- | ------------------------------------- |
| Monthly subscription    | Free          | CAD $29             | CAD $79                               |
| Annual subscription     | Free          | CAD $290            | CAD $790                              |
| Users including owner   | 1             | 3                   | 10                                    |
| Non-archived listings   | 3             | 25                  | 100                                   |
| New enquiries per month | 5             | 30                  | 100                                   |
| Saved searches per user | 5             | 15                  | 25                                    |
| Matching alerts         | Manual search | Daily in-app alerts | Daily or hourly in-app alerts         |
| Supplier insights       | 7-day view    | 30-day view         | 90-day view                           |
| Support                 | Standard      | Standard            | Priority during stated business hours |

Annual subscriptions cost ten monthly payments, equivalent to two months free. New enquiries include direct enquiries and public RFQs. Receiving or replying to enquiries, quoting, and continuing an existing conversation do not consume the proposed new-enquiry allowance. Normal safety and usage controls still apply.

## Features in every proposed plan

- Browsing, search and filters, company profiles and listing currency conversion.
- Saved suppliers and listings.
- Messaging, private attachments and responding to enquiries.
- Submitting, comparing and accepting quotes.
- Deal progress, private documents and PDF exports.
- Eligible transaction reviews and company responses.
- Company verification after the existing document-approval process.
- Account security and notification preferences, shared across web and mobile.

All plans have **zero transaction commissions**. Businesses agree and manage their own payment, contract and delivery arrangements. This does not introduce payment processing, escrow, financing or guaranteed leads.

Business verification and transaction reviews are earned. Payment cannot purchase a verification badge, favourable review or moderation approval.

## Trial and downgrade proposal

Offer 30 days of Growth without a card. Return to Starter unless the company explicitly upgrades. This trial is not implemented or active yet.

On downgrade, retain business records and conversations, restricting new activity above the lower plan allowance. Final entitlement and downgrade behaviour still require implementation and testing.

Priority support requires a staffed queue and published business hours. Do not promise a dedicated account manager, response-time SLA or 24/7 support without the ability to deliver it.

## Basis and competitive positioning

The original Design Document describes monthly subscription access, premium tiers, no transaction commissions, an optional trial and five free enquiries. It does not set paid prices or feature assignments. The earlier Silver/Gold values in Flutter were demo fixtures, not approved offers.

The proposal uses implemented marketplace capabilities documented in marketplace_product_workflows.md and procurement_product_workflows.md. Price points are launch hypotheses to validate through upgrades, renewals, buyer activity and support costs; they are not an industry standard or a proven optimum.

Official competitor references checked October 7, 2026:

- [Thomas](https://business.thomasnet.com/) offers free company profiles, supporting a useful free entry tier.
- [Alibaba seller pricing](https://seller.alibaba.com/pricing) advertises memberships with 0% commission; zero commission alone is not unique.
- [TradeWheel Gold](https://www.tradewheel.com/premium-services/gold/) advertises a US$1,499/year special price. Its [official brochure](https://img2.tradewheel.com/brochure/new-gb-row.pdf?v=8) identifies the currency and includes services such as an international sales manager. Its service package is broader than ours.
- [Faire North American brand fees](https://www.faire.com/support/articles/360015893392?section=1) lists a standard 15% marketplace commission plus a first-customer fee, with 0% commission for eligible Faire Direct orders. It offers a different service package.

## Read-only implementation boundary

Both repositories carry the same presentation catalogue in `parity/plans.json`. These IDs are display keys, not database plan IDs. The website shows it on `/plans` and `/account/billing`; Flutter opens it from Account using Explore plans.

- Show all three proposed options and complete feature details without selecting or activating a subscription.
- Do not seed live subscription plan rows, send a billing request, take payment, start a trial or change any current entitlement.
- Keep actual membership, pending request and invoice data distinct from the proposal. Legacy subscription/invoice records remain authoritative.
- Existing cancellation and invoice-management infrastructure is outside this preview update.
- Tier-specific saved-search limits, matching frequency access, insight windows, trial handling and priority support are proposed benefits, not newly enforced restrictions.

Before activation, confirm approved prices and plan rows, implement authoritative entitlement checks and trial/downgrade handling, verify billing/accounting and support operations, and test both clients. Until then, label the catalogue as a read-only preview and keep current access unchanged.
