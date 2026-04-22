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
