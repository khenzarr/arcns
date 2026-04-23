/**
 * ArcNS Subgraph Client — v0.2.0 schema
 *
 * Failsafe: every function catches all errors and returns null/[] so the
 * frontend always falls back to RPC silently. Never throws to the caller.
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
      signal: AbortSignal.timeout(8000), // 8s hard timeout
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
    contenthash: string | null;
    texts: string[];
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

// ─── Queries ──────────────────────────────────────────────────────────────────

const DOMAIN_FIELDS = `
  id name labelName
  owner { id }
  resolver
  createdAt expiry registrationType
  lastCost resolvedAddress
  resolverRecord { addr contenthash texts }
`;

/** Resolve a domain name → full domain data (subgraph primary) */
export async function getDomainByName(name: string): Promise<GQLDomain | null> {
  const data = await gqlQuery<{ domains: GQLDomain[] }>(
    `query($name: String!) {
      domains(where: { name: $name }, first: 1) { ${DOMAIN_FIELDS} }
    }`,
    { name }
  );
  return data?.domains?.[0] ?? null;
}

/** Get all domains owned by an address */
export async function getDomainsByOwner(address: string): Promise<GQLDomain[]> {
  const data = await gqlQuery<{ domains: GQLDomain[] }>(
    `query($owner: String!) {
      domains(where: { owner: $owner }, orderBy: expiry, orderDirection: asc) {
        ${DOMAIN_FIELDS}
      }
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
        orderBy: timestamp orderDirection: desc first: 50
      ) {
        id domain { name } registrant cost expiresAt timestamp transactionHash
      }
    }`,
    { registrant: address.toLowerCase() }
  );
  return data?.registrations ?? [];
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
        orderBy: expiry orderDirection: asc
      ) { ${DOMAIN_FIELDS} }
    }`,
    { owner: owner.toLowerCase(), cutoff }
  );
  return data?.domains ?? [];
}

// Legacy compat exports
export type { GQLDomain as GQLDomainLegacy };
export const getDomain = getDomainByName;

// ─── Resolution API helpers ───────────────────────────────────────────────────

/** Resolve name → address (subgraph first, RPC fallback) */
export async function resolveName(name: string): Promise<{
  address: string | null;
  owner: string | null;
  expiry: string | null;
  source: "subgraph" | "rpc" | null;
}> {
  // Try subgraph
  const domain = await getDomainByName(name);
  if (domain) {
    const address = domain.resolvedAddress ?? domain.resolverRecord?.addr ?? null;
    return { address, owner: domain.owner?.id ?? null, expiry: domain.expiry, source: "subgraph" };
  }
  // Fallback: RPC
  try {
    const { publicClient } = await import("./publicClient");
    const { namehash } = await import("./namehash");
    const { CONTRACTS } = await import("./contracts");
    const node = namehash(name) as `0x${string}`;
    const ZERO = "0x0000000000000000000000000000000000000000";
    const resolverAddr = await publicClient.readContract({
      address: CONTRACTS.registry,
      abi: [{ name: "resolver", type: "function" as const, stateMutability: "view" as const, inputs: [{ name: "node", type: "bytes32" as const }], outputs: [{ name: "", type: "address" as const }] }],
      functionName: "resolver", args: [node],
    }) as string;
    if (!resolverAddr || resolverAddr === ZERO) return { address: null, owner: null, expiry: null, source: null };
    const owner = await publicClient.readContract({
      address: CONTRACTS.registry,
      abi: [{ name: "owner", type: "function" as const, stateMutability: "view" as const, inputs: [{ name: "node", type: "bytes32" as const }], outputs: [{ name: "", type: "address" as const }] }],
      functionName: "owner", args: [node],
    }) as string;
    const addr = await publicClient.readContract({
      address: resolverAddr as `0x${string}`,
      abi: [{ name: "addr", type: "function" as const, stateMutability: "view" as const, inputs: [{ name: "node", type: "bytes32" as const }], outputs: [{ name: "", type: "address" as const }] }],
      functionName: "addr", args: [node],
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
  // Try subgraph reverse record
  const rev = await getReverseRecord(address);
  if (rev?.name) return { name: rev.name, source: "subgraph" };
  // Fallback: RPC
  try {
    const { publicClient } = await import("./publicClient");
    const { CONTRACTS } = await import("./contracts");
    const hexAddr = address.toLowerCase().replace("0x", "");
    const reverseNode = `${hexAddr}.addr.reverse`;
    const { namehash } = await import("./namehash");
    const node = namehash(reverseNode) as `0x${string}`;
    const ZERO = "0x0000000000000000000000000000000000000000";
    const resolverAddr = await publicClient.readContract({
      address: CONTRACTS.registry,
      abi: [{ name: "resolver", type: "function" as const, stateMutability: "view" as const, inputs: [{ name: "node", type: "bytes32" as const }], outputs: [{ name: "", type: "address" as const }] }],
      functionName: "resolver", args: [node],
    }) as string;
    if (!resolverAddr || resolverAddr === ZERO) return { name: null, source: null };
    const name = await publicClient.readContract({
      address: resolverAddr as `0x${string}`,
      abi: [{ name: "name", type: "function" as const, stateMutability: "view" as const, inputs: [{ name: "node", type: "bytes32" as const }], outputs: [{ name: "", type: "string" as const }] }],
      functionName: "name", args: [node],
    }) as string;
    return { name: name && name.length > 0 ? name : null, source: "rpc" };
  } catch { return { name: null, source: null }; }
}
