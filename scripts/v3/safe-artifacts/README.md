# Safe v1.3.0 Artifacts

This directory contains the canonical GnosisSafe v1.3.0 contract artifacts
used by `deployMultisig.js` to deploy a 2-of-3 Safe multisig on Arc Testnet.

## Contents

- `GnosisSafe.json` — GnosisSafe singleton implementation (v1.3.0)
- `GnosisSafeProxyFactory.json` — GnosisSafeProxyFactory (v1.3.0)
- `CompatibilityFallbackHandler.json` — CompatibilityFallbackHandler (v1.3.0)

## Fetching Artifacts

If these files are missing, run:

```bash
node scripts/v3/fetchSafeArtifacts.js
```

This downloads the artifacts from the official safe-global/safe-smart-account
GitHub repository (tag v1.3.0) and saves them here.

## Source

- Repository: https://github.com/safe-global/safe-smart-account/tree/v1.3.0
- Release: https://github.com/safe-global/safe-smart-account/releases/tag/v1.3.0
- npm: @gnosis.pm/safe-contracts@1.3.0
