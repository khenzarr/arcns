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
| ArcNSReverseRegistrar | `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57` | ReverseClaimed |

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

After deploying to graph-node, add this protocol entry to the BENS server config:

```json
"arcns": {
  "tld_list": ["arc"],
  "network_id": 5042002,
  "subgraph_name": "arcns-bens",
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
},
"arcns-circle": {
  "tld_list": ["circle"],
  "network_id": 5042002,
  "subgraph_name": "arcns-bens",
  "address_resolve_technique": "reverse_registry",
  "specific": {
    "type": "ens_like",
    "native_token_contract": "0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a",
    "registry_contract": "0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A"
  },
  "meta": {
    "short_name": "ArcNS",
    "title": "Arc Name Service (.circle)",
    "description": "ArcNS maps .arc and .circle names to EVM addresses on Arc Testnet.",
    "docs_url": "https://docs.arcns.xyz"
  }
}
```

Note: Both protocol entries point to the same `subgraph_name` because both TLDs
are indexed in a single subgraph. The `native_token_contract` differs per TLD
(ArcBaseRegistrar for `.arc`, CircleBaseRegistrar for `.circle`).

## Remaining work for full explorer integration

1. **Deploy to graph-node** — a self-hosted graph-node instance connected to Arc Testnet RPC
2. **Configure BENS server** — add the protocol entries above to `bens-server` config
3. **ArcScan operator** — set `MICROSERVICE_BENS_ENABLED=true` and `MICROSERVICE_BENS_URL`
4. **Optional upstream PR** — submit subgraph + config to `blockscout/blockscout-rs` for hosted BENS

See `docs/integration/arcscan-integration-package.md` for the full integration spec.
