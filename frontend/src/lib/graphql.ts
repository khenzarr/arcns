/**
 * graphql.ts — ArcNS subgraph client.
 *
 * Target subgraph: arcnslatest (Arc testnet, v3 canonical)
 *
 * Failsafe: every function catches all errors and returns null/[] so the
 * frontend always falls back to RPC silently. Never throws to the caller.
 *
 * Write paths (useRegistration, useRenew, usePrimaryName, useAvailability)
 * are NOT touched here — this file is read-only indexed data only.
 */

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

const SUBGRAPH_ENABLED =
  Boolean(SUBGRAPH_URL) && !SUBGRAPH_URL.includes("YOUR_ID");

async function gqlQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  if (!SUBGRAPH_ENABLED) return null;
  try {
    const res = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors) return null;
    return json.data as T;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GQLDomain {
  id: string;
  name: string;
  labelName: string;
  owner: { id: string };
  resolver: string | null;
  createdAt: string;
  expiry: string;
  lastCost: string | null;
  resolvedAddress: string | null;
  registrationType: "ARC" | "CIRCLE";
  resolverRecord: {
    addr: string | null;
  } | null;
}

export interface GQLReverseRecord {
  id: string;
  name: string;
  node: string;
}

export interface GQLRegistration {
  id: string;
  domain: { name: string };
  registrant: string;
  cost: string;
  expiresAt: string;
  timestamp: string;
  transactionHash: string;
}

export interface GQLRenewal {
  id: string;
  domain: { name: string };
  cost: string;
  expiresAt: string;
  timestamp: string;
  transactionHash: string;
}

// ─── Field fragments ──────────────────────────────────────────────────────────

const DOMAIN_FIELDS = `
  id name labelName
  owner { id }
  resolver
  createdAt expiry registrationType
  lastCost resolvedAddress
  resolverRecord { addr }
`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Resolve a domain name → full domain data */
export async function getDomainByName(name: string): Promise<GQLDomain | null> {
  const data = await gqlQuery<{ domains: GQLDomain[] }>(
    `query($name: String!) {
      domains(where: { name: $name }, first: 1) { ${DOMAIN_FIELDS} }
    }`,
    { name }
  );
  return data?.domains?.[0] ?? null;
}

/** Get all domains owned by an address — for portfolio view */
export async function getDomainsByOwner(address: string): Promise<GQLDomain[]> {
  const data = await gqlQuery<{ domains: GQLDomain[] }>(
    `query($owner: String!) {
      domains(
        where: { owner: $owner }
        orderBy: expiry
        orderDirection: asc
        first: 200
      ) { ${DOMAIN_FIELDS} }
    }`,
    { owner: address.toLowerCase() }
  );
  return data?.domains ?? [];
}

/** Reverse lookup: address → primary name */
export async function getReverseRecord(address: string): Promise<GQLReverseRecord | null> {
  const data = await gqlQuery<{ reverseRecord: GQLReverseRecord | null }>(
    `query($id: ID!) { reverseRecord(id: $id) { id name node } }`,
    { id: address.toLowerCase() }
  );
  return data?.reverseRecord ?? null;
}

/** Get registration history for an address */
export async function getRegistrationHistory(address: string): Promise<GQLRegistration[]> {
  const data = await gqlQuery<{ registrations: GQLRegistration[] }>(
    `query($registrant: Bytes!) {
      registrations(
        where: { registrant: $registrant }
        orderBy: timestamp
        orderDirection: desc
        first: 50
      ) {
        id domain { name } registrant cost expiresAt timestamp transactionHash
      }
    }`,
    { registrant: address.toLowerCase() }
  );
  return data?.registrations ?? [];
}

/** Get renewal history for an address (via domains owned) */
export async function getRenewalHistory(address: string): Promise<GQLRenewal[]> {
  // Renewals are indexed per domain — fetch via domains owned by address
  const data = await gqlQuery<{ renewals: GQLRenewal[] }>(
    `query($owner: String!) {
      renewals(
        where: { domain_: { owner: $owner } }
        orderBy: timestamp
        orderDirection: desc
        first: 50
      ) {
        id domain { name } cost expiresAt timestamp transactionHash
      }
    }`,
    { owner: address.toLowerCase() }
  );
  return data?.renewals ?? [];
}

/** Get domains expiring within N days */
export async function getExpiringDomains(
  owner: string,
  withinDays = 30
): Promise<GQLDomain[]> {
  const cutoff = (Math.floor(Date.now() / 1000) + withinDays * 86400).toString();
  const data = await gqlQuery<{ domains: GQLDomain[] }>(
    `query($owner: String!, $cutoff: BigInt!) {
      domains(
        where: { owner: $owner, expiry_lte: $cutoff }
        orderBy: expiry
        orderDirection: asc
      ) { ${DOMAIN_FIELDS} }
    }`,
    { owner: owner.toLowerCase(), cutoff }
  );
  return data?.domains ?? [];
}

// ─── Resolution API helpers ───────────────────────────────────────────────────

/** Resolve name → address (subgraph first, RPC fallback) */
export async function resolveName(name: string): Promise<{
  address: string | null;
  owner: string | null;
  expiry: string | null;
  source: "subgraph" | "rpc" | null;
}> {
  const domain = await getDomainByName(name);
  if (domain) {
    const address = domain.resolvedAddress ?? domain.resolverRecord?.addr ?? null;
    if (address) {
      // Subgraph has a non-null address — return it directly (fast path)
      return { address, owner: domain.owner?.id ?? null, expiry: domain.expiry, source: "subgraph" };
    }
    // Subgraph has the domain entity but addr is null/stale — fall through to RPC
    // to verify the current on-chain state before returning not_found
  }
  // RPC fallback (reached when: domain absent from subgraph, OR domain present but addr null)
  try {
    const { publicClient } = await import("./publicClient");
    const { namehash } = await import("./namehash");
    const {
      ADDR_REGISTRY, ADDR_RESOLVER,
      REGISTRY_ABI, RESOLVER_ABI,
    } = await import("./contracts");
    const node = namehash(name) as `0x${string}`;
    const ZERO = "0x0000000000000000000000000000000000000000";
    const resolverAddr = await publicClient.readContract({
      address: ADDR_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "resolver",
      args: [node],
    }) as string;
    if (!resolverAddr || resolverAddr === ZERO) return { address: null, owner: null, expiry: null, source: null };
    const owner = await publicClient.readContract({
      address: ADDR_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "owner",
      args: [node],
    }) as string;
    const addr = await publicClient.readContract({
      address: ADDR_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "addr",
      args: [node],
    }) as string;
    return {
      address: addr && addr !== ZERO ? addr : null,
      owner: owner && owner !== ZERO ? owner : null,
      expiry: null,
      source: "rpc",
    };
  } catch { return { address: null, owner: null, expiry: null, source: null }; }
}

/** Resolve address → primary name (subgraph first, RPC fallback) */
export async function resolveAddress(address: string): Promise<{
  name: string | null;
  source: "subgraph" | "rpc" | null;
}> {
  const rev = await getReverseRecord(address);
  if (rev?.name) return { name: rev.name, source: "subgraph" };
  // RPC fallback
  try {
    const { publicClient } = await import("./publicClient");
    const { ADDR_REGISTRY, ADDR_RESOLVER, REGISTRY_ABI, RESOLVER_ABI } = await import("./contracts");
    const { namehash } = await import("./namehash");
    const hexAddr = address.toLowerCase().replace("0x", "");
    const reverseNode = namehash(`${hexAddr}.addr.reverse`) as `0x${string}`;
    const ZERO = "0x0000000000000000000000000000000000000000";
    const resolverAddr = await publicClient.readContract({
      address: ADDR_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "resolver",
      args: [reverseNode],
    }) as string;
    if (!resolverAddr || resolverAddr === ZERO) return { name: null, source: null };
    const name = await publicClient.readContract({
      address: ADDR_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "name",
      args: [reverseNode],
    }) as string;
    return { name: name && name.length > 0 ? name : null, source: "rpc" };
  } catch { return { name: null, source: null }; }
}

// ─── Adapter-grade resolution (with forward-confirmation) ────────────────────

/**
 * Resolve address → primary name WITH mandatory forward-confirmation.
 *
 * This is the correctness-grade version used by the public adapter API.
 * It is NOT used by the frontend UI (which uses resolveAddress() + usePrimaryName hook).
 *
 * Forward-confirmation rule:
 *   1. Get reverse record: Resolver.name(reverseNode) → candidateName
 *   2. If candidateName is empty → no primary name set
 *   3. Compute forwardNode = namehash(candidateName)
 *   4. Get forward resolution: Resolver.addr(forwardNode) → resolvedAddr
 *   5. verified = (resolvedAddr.toLowerCase() === address.toLowerCase())
 *   6. If verified: return { name: candidateName, verified: true }
 *      If not verified: return { name: null, verified: false } — stale record
 *
 * The subgraph is used as a speed layer for step 1 only.
 * Step 4 (forward-confirmation) is ALWAYS performed via RPC — never from the subgraph.
 *
 * Returns:
 *   name:     string | null  — verified primary name, or null
 *   verified: boolean        — true only if forward-confirmation passed
 *   source:   "subgraph" | "rpc" | null — source of the reverse record
 */
export async function resolveAddressWithVerification(address: string): Promise<{
  name:     string | null;
  verified: boolean;
  source:   "subgraph" | "rpc" | null;
}> {
  const ZERO = "0x0000000000000000000000000000000000000000";

  // ── Step 1: Get candidate reverse name (subgraph-first, RPC fallback) ────
  let candidateName: string | null = null;
  let source: "subgraph" | "rpc" | null = null;

  // Subgraph path
  const rev = await getReverseRecord(address);
  if (rev?.name) {
    candidateName = rev.name;
    source = "subgraph";
  }

  // RPC fallback if subgraph returned nothing
  if (!candidateName) {
    try {
      const { publicClient }                                    = await import("./publicClient");
      const { ADDR_RESOLVER, REGISTRY_ABI, RESOLVER_ABI, ADDR_REGISTRY } = await import("./contracts");
      const { reverseNodeFor }                                  = await import("./namehash");

      const reverseNode = reverseNodeFor(address as `0x${string}`);

      // Check resolver is set for the reverse node
      const resolverAddr = await publicClient.readContract({
        address: ADDR_REGISTRY,
        abi:     REGISTRY_ABI,
        functionName: "resolver",
        args:    [reverseNode],
      }) as string;

      if (!resolverAddr || resolverAddr === ZERO) {
        // No resolver set for this address's reverse node → no primary name
        return { name: null, verified: false, source: null };
      }

      const nameResult = await publicClient.readContract({
        address: ADDR_RESOLVER,
        abi:     RESOLVER_ABI,
        functionName: "name",
        args:    [reverseNode],
      }) as string;

      if (nameResult && nameResult.length > 0) {
        candidateName = nameResult;
        source = "rpc";
      }
    } catch {
      // RPC unavailable — cannot verify
      return { name: null, verified: false, source: null };
    }
  }

  // No primary name set at all
  if (!candidateName) {
    return { name: null, verified: false, source };
  }

  // ── Step 2: Forward-confirmation via RPC (mandatory — never from subgraph) ─
  // Rule: Resolver.addr(namehash(candidateName)) must equal the queried address.
  // If it does not, the reverse record is stale (name transferred or expired).
  try {
    const { publicClient }                       = await import("./publicClient");
    const { ADDR_RESOLVER, RESOLVER_ABI }        = await import("./contracts");
    const { namehash }                           = await import("./namehash");

    const forwardNode = namehash(candidateName) as `0x${string}`;

    const resolvedAddr = await publicClient.readContract({
      address: ADDR_RESOLVER,
      abi:     RESOLVER_ABI,
      functionName: "addr",
      args:    [forwardNode],
    }) as string;

    const verified =
      !!resolvedAddr &&
      resolvedAddr !== ZERO &&
      resolvedAddr.toLowerCase() === address.toLowerCase();

    if (verified) {
      return { name: candidateName, verified: true, source };
    } else {
      // Reverse record exists but forward-confirmation failed — stale record.
      // Do NOT return the candidate name as verified.
      return { name: null, verified: false, source };
    }
  } catch {
    // Forward-confirmation RPC call failed — cannot verify.
    // Safe default: treat as unverified.
    return { name: null, verified: false, source };
  }
}

// Legacy compat
export const getDomain = getDomainByName;
