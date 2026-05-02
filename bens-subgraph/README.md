# ArcNS BENS-Compatible Subgraph

## What this is

A Graph Protocol subgraph that indexes ArcNS v3 on-chain events using the
**ENS-like schema required by Blockscout/BENS** (`blockscout-rs` `blockscout-ens` service).

This subgraph enables ArcNS `.arc` and `.circle` names to appear in:
- Blockscout/ArcScan search bar (name → address resolution)
- Address pages (primary name badge via reverse resolution)
- Name Services lookup page

## How it differs from `indexer/`

The `indexer/` subgraph uses an ArcNS-specific schema optimized for the ArcNS
frontend. This subgraph uses the BENS-required ENS-like schema so that the
`bens-server` Rust microservice can read it directly from graph-node's PostgreSQL.

Both subgraphs index the same contracts. They are independent and can run in parallel.

## Covered contracts (Arc Testnet, Chain ID 5042002)

| Contract | Address | Events indexed |
|---|---|---|
| ArcController | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` | NameRegistered, NameRenewed |
| CircleController | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` | NameRegistered, NameRenewed |
| ArcBaseRegistrar | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` | Transfer (ERC-721) |
| CircleBaseRegistrar | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` | Transfer (ERC-721) |
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` | Transfer, NewResolver |
| ArcNSResolver | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` | AddrChanged, NameChanged |
| ArcNSReverseRegistrar | `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304` | ReverseClaimed |

Start block: `38856377`

## Build

```bash
cd bens-subgraph
npm install
npm run codegen
npm run build
```

## Deploy to graph-node

```bash
# Self-hosted graph-node
npm run deploy:node

# The Graph Studio (for testing)
npm run deploy:studio
```

## BENS server config

Both `.arc` and `.circle` TLDs are indexed in a **single subgraph** and must be
served by a **single BENS protocol** (`arcns`). Do **not** configure two separate
active protocols pointing at the same subgraph — BENS does not filter results by
TLD per protocol, so a second protocol would cause `.arc` names to appear under
`arcns-circle` and `.circle` names to appear under `arcns`.

Add this single protocol entry to the BENS server config for network `5042002`:

```json
"arcns": {
  "tld_list": ["arc", "circle"],
  "network_id": 5042002,
  "subgraph_name": "arcns-subgraph",
  "address_resolve_technique": "reverse_registry",
  "specific": {
    "type": "ens_like",
    "native_token_contract": "0xD600B8D80e921ec48845fC1769c292601e5e90C4",
    "registry_contract": "0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A"
  },
  "meta": {
    "short_name": "ArcNS",
    "title": "Arc Name Service",
    "description": "ArcNS maps .arc and .circle names to EVM addresses on Arc Testnet.",
    "docs_url": "https://docs.arcns.xyz"
  }
}
```

And set the network's `use_protocols` to `["arcns"]` only:

```json
"5042002": {
  "use_protocols": ["arcns"]
}
```

## Reverse resolution — important note

The `handleNameChanged` handler in `src/resolver.ts` intentionally does **not**
overwrite `Domain.name` on the reverse node. The reverse domain's `name` field
must remain `<address>.addr.reverse` (set by `handleReverseClaimed`).

BENS resolves primary names by joining `name_changed.resolver` → reverse
`domain.resolver`, then joining `name_changed.name` against the forward domain
table. If `Domain.name` on the reverse node is overwritten with the primary name,
BENS produces duplicate `reversed_domain_id` rows and fails the unique index
creation for `addr_reverse_names`.

### Local validation — materialized view refresh

After subgraph catch-up or a local redeploy, the `addr_reverse_names` materialized
view may need a manual refresh before the primary reverse endpoint returns results:

```sql
REFRESH MATERIALIZED VIEW sgdX.addr_reverse_names;
```

Replace `sgdX` with the actual schema name for your subgraph deployment (visible
in the graph-node PostgreSQL database). Then retest:

```
GET /api/v1/5042002/addresses/0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d?protocol_id=arcns
```

Expected: `"primary_domain": "flowpay.arc"`

## Expected BENS API behaviour

### Protocols

```
GET /api/v1/5042002/protocols
```

Expected: only `arcns` with `tld_list: ["arc", "circle"]`

### Forward resolution

```
GET /api/v1/5042002/domains/flowpay.arc?protocol_id=arcns
```
Expected resolved address: `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`

```
GET /api/v1/5042002/domains/dnyelfy.circle?protocol_id=arcns
```
Expected resolved address: `0x15DC3C8131a351F307Ca5eB04d227EA0Fe01ac71`

### Address lookup

```
GET /api/v1/5042002/addresses:lookup?address=0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d&resolved_to=true&owned_by=true&only_active=true&protocols=arcns
```

Expected: `.arc` and `.circle` records all under protocol `arcns`. No `arcns-circle` protocol in returned items.

### Primary reverse

```
GET /api/v1/5042002/addresses/0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d?protocol_id=arcns
```

Expected primary domain: `flowpay.arc`

If this returns `domain: null`, inspect the raw tables:

```sql
SELECT * FROM sgdX.addr_reverse_names WHERE address = '0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d';
SELECT * FROM sgdX.name_changed WHERE resolver IN (SELECT id FROM sgdX.resolver WHERE domain IN (SELECT id FROM sgdX.domain WHERE name LIKE '%addr.reverse'));
```

If the raw join is correct but `addr_reverse_names` is empty, run:

```sql
REFRESH MATERIALIZED VIEW sgdX.addr_reverse_names;
```

## Remaining work for full explorer integration

1. **Deploy to graph-node** — a self-hosted graph-node instance connected to Arc Testnet RPC (`https://rpc.testnet.arc.network`)
2. **Configure BENS server** — add the single `arcns` protocol entry above to `bens-server` config
3. **ArcScan operator** — set `MICROSERVICE_BENS_ENABLED=true` and `MICROSERVICE_BENS_URL` on the Blockscout backend
4. **Optional upstream PR** — submit subgraph + config to `blockscout/blockscout-rs` for hosted BENS

See `docs/integration/arcscan-integration-package.md` for the full integration spec.
