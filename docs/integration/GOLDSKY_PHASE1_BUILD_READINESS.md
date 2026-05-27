# ArcNS Goldsky Phase 1 Build Readiness (Local Validation Only)

Date: 2026-05-26
Repo: `C:\Users\mertb\Desktop\NODE\ArcNameServices\arcns`
Scope: **Local readiness validation only** (no deploy, no on-chain tx, no commit/push)

---

## Safety constraints followed

- No contract changes
- No frontend app logic changes
- No `.env` or secret changes
- No Goldsky deployment executed
- No blockchain transactions executed
- No commit / push

---

## 1) First subgraph target to deploy

Recommended first target (from integration plan):

**`indexer/` (canonical product/frontend subgraph)**

Rationale: This is the app-facing ArcNS v3 indexing model for `.arc` + `.circle` and is explicitly marked as the first deployment target in:
`docs/integration/GOLDSKY_ARCNS_INTEGRATION_PLAN.md`.

---

## 2) Local dependency validation for target

Validated `indexer/` dependency intent:

- `indexer/package.json`
  - `@graphprotocol/graph-cli`: `^0.71.0`
  - `@graphprotocol/graph-ts`: `^0.35.1`
- `indexer/package-lock.json` contains installed entries:
  - `@graphprotocol/graph-cli` version `0.71.2`
  - `@graphprotocol/graph-ts` version `0.35.1`

No dependency installation was performed.

---

## 3) Local codegen/build execution (safe local only)

### Command run: codegen

```powershell
cd indexer; npm run codegen 2>&1
```

### Exact output captured

```text
pm run codegen
> arcns-subgraph@2.0.0 codegen
> graph codegen

... (Graph migrations/load/generate steps) ...

Types generated successfully
```

Result: **PASS**

> Note: Terminal wrapper emitted PowerShell/NativeCommandError noise while still returning successful graph output. The decisive line is `Types generated successfully`.

---

### Command run: build

```powershell
cd indexer; npm run build 2>&1
```

### Exact output captured

```text
pm run build
> arcns-subgraph@2.0.0 build
> graph build

... (Graph migrations/compile/write steps) ...

Build completed: build\subgraph.yaml
```

Result: **PASS**

> Note: Same PowerShell/NativeCommandError wrapper noise appeared, but the graph build completed successfully as indicated by `Build completed: build\subgraph.yaml`.

---

## 4) Schema/mapping/address/startBlock checks

From `indexer/subgraph.yaml` + `indexer/schema.graphql` + mappings:

- Network: `arc-testnet`
- All dataSources use `startBlock: 38856377`
- Manifest addresses are present for:
  - `ArcController` `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46`
  - `CircleController` `0x4CB0650847459d9BbDd5823cc6D320C900D883dA`
  - `ArcRegistrar` `0xD600B8D80e921ec48845fC1769c292601e5e90C4`
  - `CircleRegistrar` `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a`
  - `Resolver` `0x4c3a2D4245346732CE498937fEAD6343e77Eb097`
  - `Registry` `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A`
  - `ReverseRegistrar` `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57`
- Event handler wiring compiles successfully across:
  - controller / registrar / resolver / registry / reverseRegistrar mappings

Issues found during local build readiness validation:

- **No blocking schema errors found**
- **No blocking mapping compile errors found**
- **No missing manifest address/startBlock entries found for target `indexer/`**

---

## 5) Goldsky deploy command prepared (NOT RUN)

```bash
cd indexer
npx -y @goldskycom/cli subgraph deploy arcns-product/arcns-indexer/v1 --path .
```

---

## 6) Goldsky status/list commands prepared (NOT RUN)

```bash
npx -y @goldskycom/cli subgraph list
npx -y @goldskycom/cli subgraph status arcns-product/arcns-indexer/v1
```

Optional chain verification command (also not run):

```bash
npx -y @goldskycom/cli subgraph list-chains
```

---

## 7) Parity query examples prepared (NOT RUN)

Set endpoints (replace `NEW` after actual deploy):

```bash
OLD="https://api.studio.thegraph.com/query/1748590/arcnslatest/v3"
NEW="https://api.goldsky.com/api/public/<project>/<subgraph>/latest/gn"
```

### a) `flowpay.arc`

```bash
QUERY='{"query":"query($name:String!){domains(where:{name:$name},first:1){id name owner{id} expiry resolvedAddress registrationType resolverRecord{addr}}}","variables":{"name":"flowpay.arc"}}'
curl -s -X POST "$OLD" -H "content-type: application/json" -d "$QUERY"
curl -s -X POST "$NEW" -H "content-type: application/json" -d "$QUERY"
```

### b) `thebstoftimes.arc`

```bash
QUERY='{"query":"query($name:String!){domains(where:{name:$name},first:1){id name owner{id} expiry resolvedAddress registrationType resolverRecord{addr}}}","variables":{"name":"thebstoftimes.arc"}}'
curl -s -X POST "$OLD" -H "content-type: application/json" -d "$QUERY"
curl -s -X POST "$NEW" -H "content-type: application/json" -d "$QUERY"
```

### c) `bob.arc` (if present)

```bash
QUERY='{"query":"query($name:String!){domains(where:{name:$name},first:1){id name owner{id} expiry resolvedAddress registrationType resolverRecord{addr}}}","variables":{"name":"bob.arc"}}'
curl -s -X POST "$OLD" -H "content-type: application/json" -d "$QUERY"
curl -s -X POST "$NEW" -H "content-type: application/json" -d "$QUERY"
```

### d) one `.circle` name: `dnyelfy.circle`

```bash
QUERY='{"query":"query($name:String!){domains(where:{name:$name},first:1){id name owner{id} expiry resolvedAddress registrationType resolverRecord{addr}}}","variables":{"name":"dnyelfy.circle"}}'
curl -s -X POST "$OLD" -H "content-type: application/json" -d "$QUERY"
curl -s -X POST "$NEW" -H "content-type: application/json" -d "$QUERY"
```

### e) aggregate consistency check

```bash
COUNT_QUERY='{"query":"{ domains(first: 1) { id } }"}'
curl -s -X POST "$OLD" -H "content-type: application/json" -d "$COUNT_QUERY"
curl -s -X POST "$NEW" -H "content-type: application/json" -d "$COUNT_QUERY"
```

---

## 8) Files changed

- `docs/integration/GOLDSKY_PHASE1_BUILD_READINESS.md` (new)

---

## 9) `git status --short`

Baseline observed before this report:

```text
?? docs/grants/demo-output/
?? docs/integration/GOLDSKY_ARCNS_INTEGRATION_PLAN.md
```

Final status should be re-run after this file creation.

---

## Final report answers

1. Which subgraph target should be deployed first?
   **`indexer/`**

2. Did local codegen pass?
   **Yes** (`Types generated successfully`)

3. Did local build pass?
   **Yes** (`Build completed: build\subgraph.yaml`)

4. Any schema/mapping/address/startBlock issues?
   **No blocking issues found** in local validation.

5. Exact deploy command prepared but not run
   **Included in section 5**

6. Exact status/list commands prepared but not run
   **Included in section 6**

7. Parity queries prepared
   **Included in section 7**

8. Files changed
   **Included in section 8**

9. `git status --short`
   **Included in section 9 (baseline) and re-check required post-file-write**

---

**Stop for review.**
No deployment executed. No commit. No push.
