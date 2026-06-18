---
name: Support tier policy
description: Strict policy preventing Standard/Professional support from becoming a sink for Enterprise-only topics (clearinghouse, 837P/835, eMAR, RCM, state aggregator). Self-serve first, then upsell.
type: constraint
---
- Clearinghouse troubleshooting, 837P/835 EDI help, eMAR setup, Revenue Cycle Management, state-aggregator (HHAeXchange) push, and 270/271/276/277 transactions are Enterprise-only support topics.
- Standard and Professional tiers must be routed to documentation, in-product AI, or an upgrade CTA for those topics — never to a hands-on ticket queue.
- Support SLA copy (kept consistent across Pricing matrix + Support module banner):
  - Standard: docs + community + 48h email after self-serve.
  - Professional: 24h email + chat.
  - Enterprise: 4h priority + clearinghouse / 837P / eMAR troubleshooting.
- Implementation anchors: `src/components/modules/Support.tsx` (SLA banner + enterprise-topic detection by category & keywords), `src/components/ModuleGate.tsx` (Enterprise-only module upsell card), Pricing matrix "Integrations & Support" group.
- **Why:** Prevent margin erosion on $99 Standard tier and protect the Enterprise upgrade path.