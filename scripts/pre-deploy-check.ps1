# ArcNS v3 - Pre-Deploy Validation Script
# Runs all local validation phases. Never prints secret values.
# Safe to run at any time - no external deploys triggered.

$PASS = "[PASS]"
$FAIL = "[FAIL]"
$WARN = "[WARN]"
$INFO = "[INFO]"
$errors = @()

Write-Host ""
Write-Host "============================================================"
Write-Host "  ArcNS v3 - Pre-Deploy Validation"
Write-Host "============================================================"

# ---- PHASE 1: ENV AND CONFIG VALIDATION -------------------------------------
Write-Host ""
Write-Host "PHASE 1 - ENV AND CONFIG VALIDATION"
Write-Host "------------------------------------------------------------"

if (Test-Path ".env") {
    Write-Host "$PASS .env exists"
    $envContent = Get-Content ".env" -Raw
    $deployKeys = @("PRIVATE_KEY","ARC_RPC_URL","ARCSCAN_API_KEY","USDC_ADDRESS","TREASURY_ADDRESS")
    foreach ($k in $deployKeys) {
        $m = [regex]::Match($envContent, "(?m)^$k=(.+)$")
        if ($m.Success -and $m.Groups[1].Value.Trim() -ne "") {
            Write-Host "$PASS   $k : PRESENT"
        } else {
            Write-Host "$FAIL   $k : MISSING"
            $errors += "MISSING .env key: $k"
        }
    }
    $stray = [regex]::Matches($envContent, "(?m)^(NEXT_PUBLIC_\w+)") | ForEach-Object { $_.Groups[1].Value }
    if ($stray.Count -gt 0) {
        Write-Host "$FAIL   Stray NEXT_PUBLIC_* in .env: $($stray -join ', ')"
        $errors += "Stray NEXT_PUBLIC_* keys in .env: $($stray -join ', ')"
    } else {
        Write-Host "$PASS   No stray NEXT_PUBLIC_* in .env"
    }
} else {
    Write-Host "$FAIL .env NOT FOUND"
    $errors += ".env file missing"
}

if (Test-Path "frontend/.env.local") {
    Write-Host "$PASS frontend/.env.local exists"
    $localContent = Get-Content "frontend/.env.local" -Raw
    $frontendKeys = @("NEXT_PUBLIC_CHAIN_ID","NEXT_PUBLIC_RPC_URL","NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID","NEXT_PUBLIC_SUBGRAPH_URL")
    foreach ($k in $frontendKeys) {
        $m = [regex]::Match($localContent, "(?m)^$k=(.+)$")
        if ($m.Success -and $m.Groups[1].Value.Trim() -ne "") {
            Write-Host "$PASS   $k : PRESENT"
        } else {
            Write-Host "$FAIL   $k : MISSING"
            $errors += "MISSING frontend/.env.local key: $k"
        }
    }
    if ($localContent -match "(?m)^PRIVATE_KEY=") {
        Write-Host "$FAIL   PRIVATE_KEY found in frontend/.env.local - must not be here"
        $errors += "PRIVATE_KEY must not be in frontend/.env.local"
    } else {
        Write-Host "$PASS   No deploy secrets in frontend/.env.local"
    }
} else {
    Write-Host "$FAIL frontend/.env.local NOT FOUND"
    $errors += "frontend/.env.local missing"
}

# ---- PHASE 2: DEPLOYMENT TRUTH PRECHECK -------------------------------------
Write-Host ""
Write-Host "PHASE 2 - DEPLOYMENT TRUTH PRECHECK"
Write-Host "------------------------------------------------------------"

if (Test-Path "scripts/v3/deployV3.js") {
    Write-Host "$PASS scripts/v3/deployV3.js exists"
} else {
    Write-Host "$FAIL scripts/v3/deployV3.js NOT FOUND"
    $errors += "scripts/v3/deployV3.js missing"
}

$deployJson = "deployments/arc_testnet-v3.json"
if (Test-Path $deployJson) {
    Write-Host "$PASS $deployJson exists"
    $dep = Get-Content $deployJson -Raw | ConvertFrom-Json
    $requiredFields = @("network","chainId","version","deployedAt","deployer","contracts","namehashes","upgrades")
    foreach ($f in $requiredFields) {
        if ($null -ne $dep.$f) {
            Write-Host "$PASS   field '$f' present"
        } else {
            Write-Host "$FAIL   field '$f' MISSING"
            $errors += "deployments/arc_testnet-v3.json missing field: $f"
        }
    }
    if ($dep.version -eq "v3-dev") {
        Write-Host "$WARN   version='v3-dev' - placeholder/dev data, not a live deployment"
    } elseif ($dep.version -eq "v3") {
        Write-Host "$PASS   version='v3' - live deployment truth"
    } else {
        Write-Host "$WARN   version='$($dep.version)' - unexpected value"
    }
    if ($dep.chainId -eq 5042002) {
        Write-Host "$PASS   chainId=5042002 (Arc Testnet)"
    } else {
        Write-Host "$FAIL   chainId=$($dep.chainId) - expected 5042002"
        $errors += "deployments/arc_testnet-v3.json chainId mismatch"
    }
    $contractKeys = @("usdc","registry","resolver","priceOracle","arcRegistrar","circleRegistrar","reverseRegistrar","treasury","arcController","circleController")
    $zeroAddr = "0x0000000000000000000000000000000000000000"
    $placeholderAddr = "0x0000000000000000000000000000000000000001"
    foreach ($ck in $contractKeys) {
        $addr = $dep.contracts.$ck
        if (-not $addr) {
            Write-Host "$FAIL   contracts.$ck : MISSING"
            $errors += "contracts.$ck missing in deployment JSON"
        } elseif ($addr -eq $zeroAddr -or $addr -eq $placeholderAddr) {
            Write-Host "$WARN   contracts.$ck : PLACEHOLDER ($addr)"
        } else {
            Write-Host "$PASS   contracts.$ck : $($addr.Substring(0,10))..."
        }
    }
    foreach ($ck in @("arcControllerImpl","circleControllerImpl")) {
        $addr = $dep.contracts.$ck
        if ($addr -eq $placeholderAddr) {
            Write-Host "$WARN   contracts.$ck : PLACEHOLDER - update after real deploy"
        } elseif ($addr) {
            Write-Host "$PASS   contracts.$ck : $($addr.Substring(0,10))..."
        }
    }
} else {
    Write-Host "$WARN $deployJson NOT FOUND - will be created by deployV3.js"
}

# ---- PHASE 3: CONTRACT TESTS ------------------------------------------------
Write-Host ""
Write-Host "PHASE 3 - CONTRACT / TEST VALIDATION"
Write-Host "------------------------------------------------------------"
Write-Host "$INFO Running v3 contract tests (explicit file list)..."
$testFiles = @(
    "test/v3/BaseRegistrar.test.js",
    "test/v3/Controller.test.js",
    "test/v3/Integration.test.js",
    "test/v3/PriceOracle.test.js",
    "test/v3/Registry.test.js",
    "test/v3/Resolver.test.js",
    "test/v3/ReverseRegistrar.test.js"
)
$testResult = & npx hardhat test @testFiles 2>&1
$testOutput = $testResult -join "`n"
$passingMatch = [regex]::Match($testOutput, "(\d+) passing")
$failingMatch = [regex]::Match($testOutput, "(\d+) failing")
$passing = if ($passingMatch.Success) { $passingMatch.Groups[1].Value } else { "0" }
$failing = if ($failingMatch.Success) { $failingMatch.Groups[1].Value } else { "0" }
if ($failing -eq "0" -and [int]$passing -gt 0) {
    Write-Host "$PASS   $passing tests passing, 0 failing"
} elseif ($failing -ne "0") {
    Write-Host "$FAIL   $passing passing, $failing FAILING"
    $errors += "Contract tests failing: $failing failures"
    $failLines = $testOutput -split "`n" | Where-Object { $_ -match "^\s+\d+\)" }
    foreach ($l in ($failLines | Select-Object -First 10)) { Write-Host "        $($l.Trim())" }
} else {
    Write-Host "$WARN   No test results parsed - check test file paths"
    $testOutput -split "`n" | Select-Object -Last 8 | ForEach-Object { Write-Host "        $_" }
}

# ---- PHASE 4: FRONTEND CONFIG GENERATION ------------------------------------
Write-Host ""
Write-Host "PHASE 4 - FRONTEND CONFIG GENERATION READINESS"
Write-Host "------------------------------------------------------------"

if (Test-Path "scripts/generate-frontend-config.js") {
    Write-Host "$PASS scripts/generate-frontend-config.js exists"
    Write-Host "$INFO Running: node scripts/generate-frontend-config.js --network arc_testnet"
    $genResult = & node scripts/generate-frontend-config.js --network arc_testnet 2>&1
    $genOutput = $genResult -join "`n"
    Write-Host "       $genOutput"
    if (Test-Path "frontend/src/lib/generated-contracts.ts") {
        Write-Host "$PASS frontend/src/lib/generated-contracts.ts generated/updated"
        $gc = Get-Content "frontend/src/lib/generated-contracts.ts" -Raw
        if ($gc -match 'DEPLOYED_VERSION\s*=\s*"v3-dev"') {
            Write-Host "$WARN   DEPLOYED_VERSION='v3-dev' - placeholder data"
        } elseif ($gc -match 'DEPLOYED_VERSION\s*=\s*"v3"') {
            Write-Host "$PASS   DEPLOYED_VERSION='v3'"
        }
        if ($gc -match 'DEPLOYED_CHAIN_ID\s*=\s*5042002') {
            Write-Host "$PASS   DEPLOYED_CHAIN_ID=5042002"
        } else {
            Write-Host "$FAIL   DEPLOYED_CHAIN_ID mismatch"
            $errors += "generated-contracts.ts DEPLOYED_CHAIN_ID mismatch"
        }
        $addrMatches = [regex]::Matches($gc, 'ADDR_\w+\s*=\s*"(0x[0-9a-fA-F]+)"')
        Write-Host "$PASS   $($addrMatches.Count) address constants present"
    } else {
        Write-Host "$FAIL frontend/src/lib/generated-contracts.ts NOT FOUND after generation"
        $errors += "generated-contracts.ts not created"
    }
} else {
    Write-Host "$FAIL scripts/generate-frontend-config.js NOT FOUND"
    $errors += "generate-frontend-config.js missing"
}

# ---- PHASE 5: FRONTEND BUILD VALIDATION -------------------------------------
Write-Host ""
Write-Host "PHASE 5 - FRONTEND BUILD VALIDATION"
Write-Host "------------------------------------------------------------"

Write-Host "$INFO Running: npx tsc --noEmit (frontend/)..."
Push-Location frontend
$tscResult = & npx tsc --noEmit 2>&1
Pop-Location
$tscErrors = $tscResult | Where-Object { $_ -match "error TS" }
if ($tscErrors.Count -eq 0) {
    Write-Host "$PASS TypeScript: 0 errors"
} else {
    Write-Host "$FAIL TypeScript: $($tscErrors.Count) error(s)"
    $tscErrors | Select-Object -First 10 | ForEach-Object { Write-Host "        $_" }
    $errors += "TypeScript errors: $($tscErrors.Count)"
}

Write-Host "$INFO Running: npm run build (frontend/) - this may take 30-60s..."
Push-Location frontend
$buildResult = & npm run build 2>&1
$buildExit = $LASTEXITCODE
Pop-Location
if ($buildExit -eq 0) {
    Write-Host "$PASS Frontend build: SUCCESS"
} else {
    Write-Host "$FAIL Frontend build: FAILED"
    $buildResult | Where-Object { $_ -match "Error|error|failed" } | Select-Object -First 10 | ForEach-Object { Write-Host "        $_" }
    $errors += "Frontend build failed"
}

# ---- PHASE 6: SUBGRAPH READINESS --------------------------------------------
Write-Host ""
Write-Host "PHASE 6 - SUBGRAPH READINESS"
Write-Host "------------------------------------------------------------"

$subgraphFiles = @(
    "indexer/subgraph.yaml",
    "indexer/schema.graphql",
    "indexer/src/controller.ts",
    "indexer/src/registrar.ts",
    "indexer/src/registry.ts",
    "indexer/src/resolver.ts",
    "indexer/src/reverseRegistrar.ts",
    "indexer/package.json"
)
foreach ($f in $subgraphFiles) {
    if (Test-Path $f) { Write-Host "$PASS $f" }
    else { Write-Host "$FAIL $f NOT FOUND"; $errors += "$f missing" }
}

$pkgJson = Get-Content "indexer/package.json" -Raw | ConvertFrom-Json
if ($pkgJson.scripts.deploy -match "arcnslatest") {
    Write-Host "$PASS   deploy script targets 'arcnslatest'"
} else {
    Write-Host "$WARN   deploy script does not reference 'arcnslatest' - check indexer/package.json"
}

Write-Host "$INFO Running: graph codegen (indexer/)..."
Push-Location indexer
$codegenResult = & npx graph codegen 2>&1
$codegenExit = $LASTEXITCODE
Pop-Location
if ($codegenExit -eq 0) {
    Write-Host "$PASS graph codegen: SUCCESS"
} else {
    Write-Host "$FAIL graph codegen: FAILED"
    $codegenResult | Select-Object -Last 15 | ForEach-Object { Write-Host "        $_" }
    $errors += "graph codegen failed"
}

Write-Host "$INFO Running: graph build (indexer/)..."
Push-Location indexer
$buildSgResult = & npx graph build 2>&1
$buildSgExit = $LASTEXITCODE
Pop-Location
if ($buildSgExit -eq 0) {
    Write-Host "$PASS graph build: SUCCESS"
} else {
    Write-Host "$FAIL graph build: FAILED"
    $buildSgResult | Select-Object -Last 15 | ForEach-Object { Write-Host "        $_" }
    $errors += "graph build failed"
}

Write-Host "$INFO graph auth and graph deploy require manual credentials - NOT auto-run"

# ---- PHASE 7: BRANDING CHECK ------------------------------------------------
Write-Host ""
Write-Host "PHASE 7 - BRANDING / ACTIVE PATH CHECK"
Write-Host "------------------------------------------------------------"

$activePaths = @(
    "frontend/src/app",
    "frontend/src/components",
    "frontend/src/lib/graphql.ts",
    "frontend/src/lib/normalization.ts",
    "frontend/src/lib/errors.ts",
    "frontend/src/hooks/useRegistration.ts",
    "frontend/src/hooks/useRenew.ts",
    "frontend/src/hooks/usePrimaryName.ts",
    "frontend/src/hooks/useAvailability.ts",
    "frontend/src/hooks/useMyDomains.ts"
)

$brandingHits = @()
foreach ($p in $activePaths) {
    if (Test-Path $p) {
        $hits = Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue |
            Select-String -Pattern '\.eth[^e]|"ENS\b|\bENS\b|on ENS|Ethereum Name' -ErrorAction SilentlyContinue |
            Where-Object { $_.Line -notmatch "not\.toContain|not contain|no ENS|No ENS|noENS|ENS wording|ENS-branded|ENS leakage|ENS-compatible|ENS-style|no ENS" }
        if ($hits) { $brandingHits += $hits }
    }
}

if ($brandingHits.Count -eq 0) {
    Write-Host "$PASS Branding: CLEAN - zero ENS leakage in active product files"
} else {
    Write-Host "$FAIL Branding: $($brandingHits.Count) ENS leakage hit(s) found"
    foreach ($h in $brandingHits) {
        Write-Host "        $($h.Filename):$($h.LineNumber) - $($h.Line.Trim())"
    }
    $errors += "ENS branding leakage in active files: $($brandingHits.Count) hit(s)"
}

# ---- PHASE 8: FINAL GO / NO-GO ----------------------------------------------
Write-Host ""
Write-Host "============================================================"
Write-Host "  PHASE 8 - FINAL GO / NO-GO REPORT"
Write-Host "============================================================"

if ($errors.Count -eq 0) {
    Write-Host ""
    Write-Host "  STATUS: GO - All local validations passed."
    Write-Host ""
    Write-Host "  NEXT COMMANDS (in order):"
    Write-Host "  1. npx hardhat run scripts/v3/deployV3.js --network arc_testnet"
    Write-Host "  2. node scripts/generate-frontend-config.js --network arc_testnet"
    Write-Host "  3. cd indexer && graph codegen && graph build"
    Write-Host "  4. graph auth --studio <KEY>   # interactive - key never committed"
    Write-Host "  5. graph deploy arcnslatest"
    Write-Host "  6. Update NEXT_PUBLIC_SUBGRAPH_URL in frontend/.env.local"
    Write-Host "  7. cd frontend && npx tsc --noEmit && npm run build"
} else {
    Write-Host ""
    Write-Host "  STATUS: NO-GO - $($errors.Count) blocker(s) found."
    Write-Host ""
    Write-Host "  BLOCKERS:"
    foreach ($e in $errors) { Write-Host "    - $e" }
    Write-Host ""
    Write-Host "  Resolve all blockers before proceeding to live deploy."
}
Write-Host ""
Write-Host "============================================================"
