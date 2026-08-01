# ArcNS — Arc Brand Guideline and Mainnet-Readiness Brand/Legal Copy Audit

**Audit date:** 2026-08-01  
**Canonical public site reviewed:** `https://arcname.services`  
**Guideline source:** `https://www.arc.io/brand-guidelines-and-partner-toolkit`  
**Repository scope:** frontend copy, metadata/configuration, README, NOTICE, `docs/final`, `docs/grants`, `docs/integration`, frontend public assets, links, and footer/legal surfaces.  
**Status:** Pre-mainnet review; no files other than this report were changed by this audit.

## Executive summary

ArcNS / Arc Name Service is intentionally retained as the project and domain identity. The primary mitigation is not a rename: publish clear independent-project, trademark-attribution, namespace, lifecycle, and launch-status language wherever users or reviewers can reasonably infer Arc or Circle affiliation.

The current repository accurately documents that ArcNS is on Arc Testnet and that an external audit is pending in several technical-status documents. However, public-facing and grant-facing language still creates material brand, affiliation, and mainnet-readiness risk:

- the app lacks visible Terms, Privacy, trademark attribution, and an independent-project disclaimer;
- `.circle` is presented as a Circle-aligned namespace without a non-endorsement disclaimer;
- some materials call ArcNS “the identity layer” or “the naming system” for Arc, which can imply official or ecosystem-wide designation;
- “production frontend/app” describes a testnet service, while legal, audit, and operational gates remain incomplete;
- the registration UI says “Own forever,” although the product has registration periods, expiry, and renewal;
- the deployed site metadata still describes `.arc` as “Official Domain”; and
- the README labels the project “Decentralized naming on Arc Network,” while the reviewed deployment is explicitly Arc Testnet.

**Brand/mainnet copy decision: NO-GO for a public mainnet brand/legal launch until all Must-fix items are resolved and Arc/Circle legal/brand review is completed.** This is a branding/legal-copy decision only; it does not replace the separate technical mainnet blockers.

## Source guideline summary

The Arc brand-guideline / partner-toolkit page was used as the governing source for this review. Apply its current published terms before publication and preserve any approval requirements for supplied marks or partner statements. The operational interpretation used here is:

1. Do not state or imply that an unaffiliated product is official Arc/Circle infrastructure, a partner, endorsed, sponsored, or approved without a separate written agreement.
2. Do not use, alter, combine, imitate, or make an Arc mark more prominent than the independent product mark unless the guideline and a written permission path expressly allow it.
3. Use only approved Arc brand assets and required trademark notices when permission to use them exists.
4. Use accurate network and launch descriptions; “mainnet,” “production,” “secure,” “audited,” and similar claims require substantiation and must not outrun the documented status.
5. Distinguish an independently operated namespace from a Circle-owned, Circle-approved, or official namespace.

This report is an implementation and copy-risk assessment, not legal advice and not a substitute for Circle/Arc written approval or counsel review.

## Site findings

| Priority | Finding | Evidence | Risk / required disposition |
|---|---|---|---|
| Must fix before mainnet | The registration copy says “Own forever” while the product has expiry and renewal. | `frontend/src/app/register/page.tsx:936`, `frontend/src/app/register/page.tsx:1050`; renewal/expiry are documented in `docs/final/FINAL_STATUS.md:25` and `README.md:122`. | Replace with time-bounded NFT registration language. “Forever” is materially misleading if names expire without renewal. |
| Must fix before mainnet | `.circle` is a selectable public namespace with no visible Circle non-endorsement disclaimer. | `frontend/src/app/page.tsx:38-39`; `frontend/src/app/register/page.tsx:72-73`; `frontend/src/components/Footer.tsx:1-47`. | Add the namespace disclaimer adjacent to registration/TLD selection and in Terms. Do not describe it as Circle-aligned unless permission is documented. |
| Must fix before mainnet | No visible Terms, Privacy, trademark/brand notice, or independent-project disclaimer appears in the footer. | `frontend/src/components/Footer.tsx:1-47`. | Add working legal pages and footer links before public mainnet launch; no “coming soon” placeholders. |
| Must fix before mainnet | WalletConnect metadata still identifies `https://arcns.app`, not the stated canonical site. | `frontend/src/lib/wagmiConfig.ts:22-25`. | Correct the canonical URL and icon host. This also avoids an apparent “official domain” mismatch. |
| Should fix before public grant/mainnet review | App metadata says “Secure .arc and .circle naming …”. | `frontend/src/app/layout.tsx:20-27`. | “Secure” is an unqualified security claim while the external audit is pending. Use precise, qualified language or remove it. |
| Should fix before public grant/mainnet review | Page metadata calls the site “The official naming service for Arc Network.” | deployed `https://arcname.services` metadata / site review. | Remove “official” unless a written Arc/Circle authorization supports it. Use “an independent name service built on Arc Testnet.” |
| Should fix before public grant/mainnet review | Main page says “The official naming layer for Arc,” “The identity layer for Arc,” and “Native identity.” | `frontend/src/app/page.tsx:42`, `frontend/src/app/page.tsx:113`, `frontend/src/app/page.tsx:335`. | These claims can imply platform appointment or affiliation. Use “an independent naming service for Arc Testnet” and avoid “native” unless contractually authorized. |
| Should fix before public grant/mainnet review | Public-facing app footer labels the service “Built on Arc Testnet,” but lacks the accompanying independence/attribution notice. | `frontend/src/components/Footer.tsx:21-24`. | “Built on” is acceptable as a factual technical statement when paired with the required disclaimer and accurate testnet status. |
| Acceptable / no issue | The app’s `.arc` and `.circle` feature labels are concise and understandable. | `frontend/src/app/page.tsx:38-39`. | Retain, but add a short namespace disclosure nearby. |

## GitHub / README findings

| Priority | Finding | Evidence | Recommended disposition |
|---|---|---|---|
| Should fix before public grant/mainnet review | README title/subtitle says “Decentralized naming on Arc Network,” not Arc Testnet. | `README.md:1-5`. | State Arc Testnet consistently until mainnet is live. |
| Should fix before public grant/mainnet review | README says `.arc` and `.circle` names can be “registered, renewed, and resolved,” but no Circle namespace disclaimer appears in the overview. | `README.md:5-8`. | Add independent-project and `.circle` non-endorsement language in the first overview section. |
| Nice to have | README includes accurate expiry/renewal material and a direct pre-mainnet status section. | `README.md:122-135`, `README.md:465-494`. | Keep this material; surface a brief version closer to registration claims. |
| Must fix before mainnet | `NOTICE` is empty. | `NOTICE:1`. | Add third-party trademark attribution and project ownership/legal notice; coordinate exact wording with counsel/Arc/Circle. |
| Should fix before public grant/mainnet review | Documentation uses “Production frontend deployed” and “Production App” for a testnet service. | `docs/final/MAINNET_GAP_REPORT.md:123`; `docs/final/FINAL_STATUS.md:6,13`. | Use “public testnet frontend” / “live testnet app.” |
| Should fix before public grant/mainnet review | Grant deck repeatedly positions ArcNS as “The Identity Layer for Arc,” says `.arc` is “native to Arc,” and calls `.circle` “dedicated … for Circle-aligned identities.” | `docs/grants/INVESTOR_DECK_OUTLINE.md:9,51-58,156-162`. | Replace with non-exclusive, independent language and remove the Circle-aligned implication absent written permission. |
| Nice to have | Grant deck accurately says pre-mainnet and external audit not completed. | `docs/grants/INVESTOR_DECK_OUTLINE.md:99-112,120-133`. | Retain, and add legal/brand review as an explicit launch gate. |

## Asset / logo findings

1. Repository asset review found ArcNS-owned visual assets including `frontend/public/arcns/arcns-logo.svg`, `frontend/public/arcns/arcns-emblem.svg`, and `frontend/src/app/icon.svg`.
2. The reviewed paths did **not** reveal a separately named Arc or Circle logo file. No finding establishes that an official Arc logo is used, altered, or made more prominent than the ArcNS mark.
3. The ArcNS asset names and the rendered site should nevertheless be reviewed by an authorized Arc/Circle brand reviewer for visual similarity, combination-mark risk, color/shape collision, and relative prominence. This code audit cannot grant trademark clearance.
4. Before public mainnet, maintain an asset inventory with source, license/permission, modification status, and approved-use scope. Do not combine ArcNS and Arc marks into a single lockup without express written approval.

**Required check result:** no Arc logo use was identified by filename/content inspection in the scoped frontend public assets; no conclusion of clearance is implied. The ArcNS logo should be treated as unapproved for Arc/Circle co-branding until independently reviewed.

## Legal / footer findings

| Requirement | Result | Priority |
|---|---|---|
| Independent-project disclaimer | Missing from footer and primary public surfaces. | Must fix before mainnet |
| Arc/Circle trademark attribution | Missing from `NOTICE`, footer, and primary legal surface. | Must fix before mainnet |
| Terms of Service | No working footer link identified. | Must fix before mainnet |
| Privacy Policy | No working footer link identified. | Must fix before mainnet |
| Trademark / Brand Notice | Missing. | Must fix before mainnet |
| `.circle` non-endorsement disclosure | Missing. | Must fix before mainnet |
| “Official Domain” confusion | Site metadata/public copy uses “Official Domain” terminology. | Should fix before public grant/mainnet review |

Do not publish placeholders such as “coming soon” as a substitute for these required notices on a public mainnet service.

## Mainnet-readiness copy findings

The repository’s technical status documents correctly identify external audit, real mainnet USDC configuration, treasury migration, timelock hardening, infrastructure, monitoring, and legal/branding review as incomplete:

- `docs/final/MAINNET_GAP_REPORT.md:15-26,30-43,105-108,131-135`
- `docs/final/FINAL_STATUS.md:11-15,43-57,78-83`

The following public-copy corrections are required:

1. Do not call the pre-mainnet service a “production app” or “production frontend.” Say “public testnet app,” “testnet deployment,” or “demo-ready on Arc Testnet.”
2. Do not say “secure” without scope and evidence. Audit-pending status means no blanket security assurance. If retained, qualify it with architecture-specific facts and link to the status/gap report.
3. Do not say a name is owned “forever.” Names are ERC-721 NFTs **for the selected registration period** and require renewal before expiry to remain registered.
4. Do not announce or imply mainnet readiness. Mainnet deployment remains gated on external audit, mainnet USDC configuration, operational hardening, and final legal/brand review.
5. Do not characterize an unaffiliated third party as a Circle partner, Arc partner, official service, or endorsed product without a separate written agreement.

## Risk matrix

| ID | Risk | Severity | Likelihood | Required action | Launch effect |
|---|---|---:|---:|---|---|
| B-01 | Implied Arc/Circle official status | High | High | Remove “official,” “identity layer,” “naming system,” and unapproved “native” claims; add independence notice. | Block public mainnet brand launch |
| B-02 | `.circle` implies Circle endorsement | High | High | Add disclosure at selector, registration, Terms, README, and grants; remove “Circle-aligned” copy. | Block public mainnet brand launch |
| L-01 | Missing Terms, Privacy, trademark notice, and attribution | High | High | Publish complete legal pages and footer links. | Block public mainnet brand launch |
| C-01 | “Own forever” conflicts with expiry/renewal | High | High | Replace every instance with registration-period/renewal language. | Block public mainnet brand launch |
| C-02 | Unqualified “secure” while audit pending | Medium | High | Remove or qualify and link to audit/status disclosure. | Block public grant/mainnet review |
| S-01 | “Production” label on testnet service | Medium | High | Replace with “public testnet app/deployment.” | Block public grant/mainnet review |
| A-01 | Mark/logo permission and similarity not documented | High | Medium | Obtain brand/legal visual review and retain approval record. | Block use of any official Arc/Circle asset; mainnet hold if such assets are used |
| U-01 | Canonical-site inconsistency (`arcns.app` vs `arcname.services`) | Medium | Medium | Standardize URL in metadata, WalletConnect, docs, and assets. | Block public review until corrected |

## Exact files / strings to change

| Priority | File | Current string / surface | Replacement direction |
|---|---|---|---|
| Must | `frontend/src/app/register/page.tsx` | `Own forever` (including `:936`, `:1050`) | “Receive an ERC-721 name NFT for your selected registration period. Renew before expiry to keep it registered.” |
| Must | `frontend/src/components/Footer.tsx` | Footer has no legal/disclaimer links | Add active Terms, Privacy, Trademark/Brand Notice, and independent-project disclosure. |
| Must | `NOTICE` | Empty file | Add approved Arc/Circle attribution and independent-project notice. |
| Must | `frontend/src/app/page.tsx` and `frontend/src/app/register/page.tsx` | `.circle` selector/marketing with no disclosure | Add concise `.circle` testnet namespace / no-endorsement notice adjacent to selection. |
| Should | `frontend/src/app/layout.tsx` | `Secure .arc and .circle naming …` | “Human-readable `.arc` and `.circle` names on Arc Testnet” plus status link; omit “secure.” |
| Should | site metadata at `https://arcname.services` | `Official Domain` / official naming-service language | Remove “official”; use independent-project attribution. |
| Should | `frontend/src/app/page.tsx` | `The official naming layer for Arc`; `The identity layer for Arc`; `Native identity` | Use “An independent name service built on Arc Testnet”; “Human-readable names for Arc Testnet addresses.” |
| Should | `frontend/src/lib/wagmiConfig.ts` | `url: "https://arcns.app"`; `icons: ["https://arcns.app/favicon.ico"]` | Replace with the confirmed canonical `https://arcname.services` URLs. |
| Should | `README.md` | `Decentralized naming on Arc Network` | “Independent decentralized naming service built on Arc Testnet.” |
| Should | `docs/final/FINAL_STATUS.md` | `Production App`, `production frontend` | “Public testnet app” / “live testnet frontend.” |
| Should | `docs/final/MAINNET_GAP_REPORT.md` | `Production frontend deployed` | “Public testnet frontend deployed.” |
| Should | `docs/grants/INVESTOR_DECK_OUTLINE.md` | `The Identity Layer for Arc`; `.arc TLD is native to Arc`; `.circle … Circle-aligned identities` | Use independent/non-exclusive wording; add required disclaimers. |
| Nice | `docs/integration/wallet-integration-package.md` | `ArcNS is the naming system for Arc Testnet` | “ArcNS is an independent naming service deployed on Arc Testnet.” |

## Recommended replacement copy

Use the following text verbatim unless counsel/Arc/Circle provides approved alternatives:

### Independent-project and trademark notice

> ArcNS is an independent name service built on Arc Testnet. ArcNS is not affiliated with, endorsed by, or sponsored by Circle unless separately agreed in writing. Arc is a trademark of Circle Internet Group, Inc. and/or its affiliates.

### `.circle` namespace notice

> `.circle` is an ArcNS testnet namespace and does not imply Circle endorsement, sponsorship, affiliation, or ownership.

### Registration lifecycle notice

> Names are ERC-721 NFTs with registration periods and renewal requirements. Registration expires unless renewed before the applicable expiry date.

### Accurate testnet / mainnet status

> ArcNS is live on Arc Testnet for testing and demonstration. Mainnet deployment is gated on external audit, mainnet USDC configuration, operational hardening, and final legal/brand review.

### Safer homepage/metadata description

> ArcNS is an independent name service built on Arc Testnet. Register and resolve human-readable `.arc` and `.circle` testnet names.

### Safer “Built on” line

> Built on Arc Testnet. Independent project; not affiliated with, endorsed by, or sponsored by Circle unless separately agreed in writing.

### Safer grant description

> ArcNS is an independent naming-service project for Arc Testnet addresses. It is not an official Arc or Circle service, and proposed integrations remain subject to third-party and legal/brand review.

## Non-goals / kept intentionally

- **ArcNS / Arc Name Service naming remains intentionally unchanged.** It is tied to the project identity and domain. This report recommends disclaimer, attribution, and claim-control mitigations rather than a primary rename recommendation.
- `https://arcname.services` is the canonical site reviewed. `https://arcname.service` was not used as canonical because it may be inactive or a typo.
- This audit does not alter or evaluate tokenomics, DAO governance, ARCNS token work, private keys, secrets, contract deployment authority, or local-only tokenomics/governance branches.
- This report does not grant legal permission to use Arc/Circle marks or make affiliation claims.

## Branch recommendation

Remain on the current non-tokenomics/non-governance working branch for brand/legal remediation. Create a narrowly scoped follow-up branch from the reviewed baseline (for example, `chore/arc-brand-legal-copy`) containing only the report, copy, legal-page, metadata, footer, asset-inventory, and approved-brand-asset changes. Do not merge brand work with tokenomics, DAO governance, or local-only ARCNS token changes. Obtain written Arc/Circle brand/legal review before publishing any official-asset or partner claim.

## Final go / no-go for mainnet brand readiness

**NO-GO.** The product should not make a public mainnet brand/legal launch until B-01, B-02, L-01, C-01, and any applicable A-01 approval are closed, and until the independently documented technical gates are also met. Testnet operation and an honestly labeled demo/grant review may continue after the Should-fix copy corrections and prominent disclosures are completed.
