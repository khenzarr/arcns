# ArcNS Mainnet Indexer / Subgraph Readiness Plan (Aşama 5D)

> **Readiness plan only.** This document records the inputs, event coverage, deployment sequence, and acceptance evidence required for a future mainnet indexer/subgraph deployment. It does not deploy contracts, deploy a subgraph, create an endpoint, or approve mainnet launch.

The dependent frontend gates and rollback requirements are tracked in [`FRONTEND_CUTOVER_PLAN.md`](./FRONTEND_CUTOVER_PLAN.md).

## A. Executive summary

The mainnet indexer/subgraph remains a **launch blocker** until a mainnet deployment has been configured with final addresses and start blocks, deployed, synchronized, queried successfully, and compared with direct chain reads. No mainnet subgraph endpoint is approved at this time.

Mainnet contract addresses and deployment start blocks remain `TBD` until the final deployment. Existing ArcNS v3 testnet manifests and `deployments/arc_testnet-v3.json` are historical references only; their addresses and blocks must not be copied into a mainnet manifest. Frontend mainnet cutover must wait for the readiness gates in this document and must be a separate reviewed change.

Known network facts are chain ID `5042`, USDC address `0x3600000000000000000000000000000000000000`, symbol `USDC`, and decimals `6`. Deploy-grade RPC and the Blockscout verification path are not approved.

## B. Required mainnet indexer inputs

| Input | Required value | Source | Status | Notes |
|---|---|---|---|---|
| Chain ID | `5042` | Approved mainnet network facts | Known | Must be asserted by the provider before deployment. |
| Deploy-grade RPC | `TBD` | Approved infrastructure evidence | Blocked | The read-only/testing fallback is not deployment-grade. |
| Indexer RPC | `TBD` | Selected provider or self-hosted node | Blocked | Must provide stable historical reads and operational ownership. |
| Registry address | `TBD` | Final deployment record | Blocked | Do not use a testnet address. |
| `.arc` registrar address | `TBD` | Final deployment record | Blocked |  |
| `.circle` registrar address | `TBD` | Final deployment record | Blocked |  |
| `.arc` controller address | `TBD` | Final deployment record | Blocked |  |
| `.circle` controller address | `TBD` | Final deployment record | Blocked |  |
| Resolver address | `TBD` | Final deployment record | Blocked |  |
| Reverse registrar address | `TBD` | Final deployment record | Blocked |  |
| Price oracle address, if indexed | `TBD` | Final deployment record | TBD | Index only if the final schema and product queries require it. |
| Discount registry address | `TBD` | Final deployment record | Blocked | Shared registry address must be recorded once final. |
| Deployment block for registry | `TBD` | Deployment receipt/block reference | Blocked | Record block hash when available. |
| Deployment block for `.arc` registrar | `TBD` | Deployment receipt/block reference | Blocked |  |
| Deployment block for `.circle` registrar | `TBD` | Deployment receipt/block reference | Blocked |  |
| Deployment block for `.arc` controller | `TBD` | Deployment receipt/block reference | Blocked |  |
| Deployment block for `.circle` controller | `TBD` | Deployment receipt/block reference | Blocked |  |
| Deployment block for resolver | `TBD` | Deployment receipt/block reference | Blocked |  |
| Deployment block for reverse registrar | `TBD` | Deployment receipt/block reference | Blocked |  |
| Deployment block for discount registry | `TBD` | Deployment receipt/block reference | Blocked |  |
| Verified ABI/artifact source | `TBD` | Final verified source and deployment artifacts | Blocked | ABI must match deployed bytecode/source. |
| Subgraph deployment target | `TBD` | Reviewed provider/self-hosted decision | Blocked | No target has been selected or approved. |
| Subgraph endpoint | `TBD` | Provider deployment output | Blocked | Do not invent or reuse a testnet endpoint. |
| Frontend GraphQL endpoint | `TBD` | Separate frontend cutover review | Blocked | Must not point mainnet at testnet data. |
| Sync health endpoint or monitoring method | `TBD` | Provider/self-hosted operations | Blocked | Must expose indexed block, lag, and handler/query health. |

## C. Data sources and event coverage

The current `indexer/` package is a testnet-oriented Graph Protocol project. Its manifest and mappings provide the required shape, not mainnet readiness proof. The final mainnet manifest must use final addresses and exact deployment blocks.

### Required sources and currently observed coverage

| Contract/source | Events to cover | Current reference coverage | Mainnet action/status |
|---|---|---|---|
| Registry | `Transfer`, `NewResolver` | `indexer/src/registry.ts` handles both | Rebind to final registry address and start block. |
| `.arc` / `.circle` controllers | `NameRegistered`, `NameRenewed` | `indexer/src/controller.ts` handles both namespaces | Rebind both controller sources and validate ABI/event signatures. |
| `.arc` / `.circle` registrars/NFTs | ERC-721 `Transfer` | `indexer/src/registrar.ts` handles ownership transfers and skips mints | Rebind both registrar sources; confirm token ID/labelhash behavior. |
| Resolver | `AddrChanged`, `NameChanged` | `indexer/src/resolver.ts` handles address and name updates | Include if frontend resolution/reverse data depends on indexed state. |
| Reverse registrar | `ReverseClaimed` | `indexer/src/reverseRegistrar.ts` handles reverse claims | Include if frontend reverse records depend on indexed state. |
| DiscountRegistry | `DiscountRootUpdated`, `DiscountRootFrozen`, `DiscountActiveUpdated`, `DiscountControllerAuthorizationUpdated`, `DiscountUsed`, inherited `OwnershipTransferred` | ABI, schema entities, typed handlers, and dormant template are implemented | Add a reviewed concrete data source only after the final address and exact start block are available; preparation alone is not deployment readiness. |
| Ownership/admin sources | Contract-specific ownership and role events, if present | Not currently a dedicated source | Add only where useful for operational monitoring and only after confirming exact ABI event names. |

The final event inventory must be generated from the verified mainnet ABIs. If a needed event does not exist on the deployed contract, record it as a gap and define a direct-read or alternate monitoring path rather than inventing an event or handler.

The current schema supports domains, accounts, registrations, renewals, domain events, resolver records, reverse records, labelhash lookup, DiscountRegistry current state, per-controller authorization state, and immutable DiscountRegistry event history. Before deployment, verify that the schema supports all required production counts and lifecycle queries against a concretely wired and synced data source.

### Aşama 6A preparation status

The reusable DiscountRegistry preparation is implemented in `indexer/`:

- `abis/ArcNSEarlyAdopterDiscountRegistry.json` is derived from the compiled contract artifact;
- `schema.graphql` contains current state, current controller authorization, and immutable history entities;
- `src/discountRegistry.ts` handles all five DiscountRegistry lifecycle events plus inherited `OwnershipTransferred`, using transaction-hash/log-index IDs; and
- `subgraph.yaml` contains a dormant template so codegen/build validate the ABI and handlers without inventing an address.

The dormant template is not instantiated by any mapping and therefore indexes nothing. Concrete testnet/mainnet address and start-block wiring remains `TBD`.

## D. Mainnet subgraph deployment sequence (dry run)

1. Wait for final mainnet contract deployment.
2. Record every deployed address and its deployment block number; preserve the block hash where available.
3. Generate or update the mainnet subgraph manifest with final addresses and start blocks.
4. Validate that every configured ABI matches the deployed bytecode and verified source.
5. Deploy the subgraph to the selected provider or self-hosted graph node. This is a future operation, not performed by this phase.
6. Monitor indexing until synchronized or within the explicitly approved lag budget.
7. Run query smoke tests against the final endpoint.
8. Compare indexed totals and sample records with direct read-only chain queries.
9. Confirm DiscountRegistry lifecycle and consumption events are indexed after the separately reviewed root lifecycle operations.
10. Only after all evidence passes, allow frontend mainnet endpoint configuration in a separate reviewed PR.

## E. Start block policy

- Use the exact deployment block for each contract whenever possible.
- Use a small safety buffer only when required by the selected indexer/provider; record the size and the provider-specific reason in the deployment evidence.
- Do not start from genesis unless a specific, reviewed historical-data requirement justifies it.
- Never use testnet start blocks on mainnet.
- Record the deployment block hash when available so the source of each start block is independently auditable.
- If a proxy or upgradeable contract is used, record the relevant proxy and implementation deployment blocks and the event-source decision explicitly.

## F. Readiness gates

| Gate | Required evidence | Status | Blocks frontend cutover? |
|---|---|---|---|
| Subgraph manifest uses final mainnet addresses | Reviewed manifest diff and deployment record | `TBD` | Yes |
| Start blocks are final | Per-contract receipt/block references, preferably hashes | `TBD` | Yes |
| ABIs match deployed bytecode/source | Verified artifacts and ABI comparison | `TBD` | Yes |
| Subgraph deployed successfully | Provider/self-hosted deployment result | `TBD` | Yes |
| Subgraph synced to latest or acceptable lag | Indexed block and approved lag evidence | `TBD` | Yes |
| Query smoke tests pass | Saved query results and timestamps | `TBD` | Yes |
| Registered-name counts are plausible | Comparison with direct chain samples/independent totals | `TBD` | Yes |
| Holder counts are plausible | Owner-count comparison and sample checks | `TBD` | Yes |
| Renewals are indexed | Known renewal samples match chain logs | `TBD` | Yes |
| DiscountRegistry lifecycle events are indexed | Root, freeze, active-state, and authorization event samples | `TBD` | Yes if discount UX is planned |
| Discount consumption events are indexed | `DiscountUsed` samples match chain logs | `TBD` | Yes if discount UX is planned |
| Frontend can query names by owner | Query result against known read-only sample | `TBD` | Yes |
| Frontend can query name availability/status if applicable | Final schema query and direct-read comparison | `TBD` | Yes |
| Fallback direct-read path is defined if subgraph lags | Read-only RPC fallback behavior and UX decision | `TBD` | Yes |
| Monitoring/alerting is defined | Owner, thresholds, alerts, and incident procedure | `TBD` | Yes |

## G. Smoke query checklist

Run these against the final endpoint only after the schema and endpoint are approved. The endpoint is intentionally a placeholder here:

```text
GRAPHQL_ENDPOINT = TBD
```

Use the provider’s indexing-status mechanism (for example, its indexed block and latest chain block) to check:

- latest indexed block / indexing status;
- names by owner, using the final `Domain`/account relationship;
- a name by label, namehash, or token ID, depending on the final schema;
- registration events (`Registration` or the final event entity);
- renewal events (`Renewal` or the final event entity);
- TLD breakdown for `arc` and `circle` names;
- DiscountRegistry root state events: `DiscountRootUpdated`, `DiscountRootFrozen`, and active-state changes;
- consumed discount events (`DiscountUsed`);
- holder count or owner concentration summary, if supported by the final schema.

Example placeholder shape (field names must be confirmed against the final schema):

```graphql
query NamesByOwner($owner: Bytes!) {
  domains(where: { owner: $owner }, first: 25, orderBy: createdAt, orderDirection: desc) {
    id
    name
    expiry
    owner { id }
  }
}
```

Do not publish this placeholder as a production query contract until generated types, schema fields, and provider behavior have been validated.

## H. Frontend dependency

- The frontend mainnet switch must be a separate, reviewed PR.
- Mainnet frontend configuration must never use the testnet subgraph endpoint.
- Discount claim UX must remain hidden until proof delivery and the DiscountRegistry root lifecycle are independently ready and verified.
- The frontend must handle indexer lag, unavailable queries, partial results, and provider failure gracefully.
- Any direct RPC fallback must be read-only and must not expose secrets, private keys, wallet credentials, or API keys.
- A frontend cutover must record the final chain configuration, contract addresses, GraphQL endpoint, fallback behavior, and rollback owner.

## I. Monitoring and rollback

The selected indexer operation must define:

- sync lag monitoring against the latest mainnet block;
- failed-handler and indexing-error monitoring;
- GraphQL query error and latency monitoring;
- provider outage detection and a read-only provider fallback;
- an incident owner and escalation path;
- rollback to maintenance or testnet messaging if the mainnet endpoint fails before public launch;
- a rule that discount activation does not proceed while indexer readiness is incomplete.

Rollback of the frontend endpoint is a configuration/release action, not an on-chain rollback. Indexed data must be re-synced or repaired through the selected provider’s reviewed operational procedure; no write operation belongs in this readiness plan.

## J. Remaining blockers

- Mainnet contract addresses: `TBD`.
- Per-contract deployment blocks and block hashes: `TBD`.
- Indexer provider/deployment target: `TBD`.
- Mainnet subgraph endpoint: `TBD`.
- Frontend GraphQL endpoint: `TBD`.
- Sync health endpoint or monitoring method: `TBD`.
- Deploy-grade RPC approval is unresolved.
- Blockscout verification path is unresolved.
- Frontend mainnet cutover is unresolved and must be separate.
- Proof delivery integration remains unresolved if discount UX is in scope.
- Concrete DiscountRegistry data-source address/start-block wiring remains `TBD`; reusable event/schema/handler coverage is implemented.
- Final launch review is required after the evidence above is complete.

## K. Non-goals

- This document does not deploy contracts.
- This document does not deploy or publish a subgraph.
- This document does not create a mainnet endpoint.
- This document does not switch the frontend to mainnet.
- This document does not activate a discount.
- This document does not approve mainnet launch.
- This document does not submit transactions, sign anything, call write functions, modify prices or roots, or create/operate launch administration infrastructure.
