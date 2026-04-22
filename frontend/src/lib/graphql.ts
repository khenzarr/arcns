/// GraphQL client for ArcNS subgraph
/// Phase 12: Frontend uses indexer instead of raw RPC reads

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL ||
  "https://api.studio.thegraph.com/query/YOUR_ID/arcns/version/latest";

async function query<T>(gql: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface GQLDomain {
  id: string;
  name: string;
  tld: string;
  owner: { id: string };
  expiresAt: string;
  cost: string;
  registeredAt: string;
  addrRecord?: { addr: string };
  textRecords: { key: string; value: string }[];
  reverseName?: string;
}

export async function getDomainsByOwner(address: string): Promise<GQLDomain[]> {
  const data = await query<{ domains: GQLDomain[] }>(`
    query DomainsForOwner($owner: String!) {
      domains(where: { owner: $owner }, orderBy: expiresAt, orderDirection: asc) {
        id name tld
        owner { id }
        expiresAt cost registeredAt
        addrRecord { addr }
        textRecords { key value }
        reverseName
      }
    }
  `, { owner: address.toLowerCase() });
  return data.domains;
}

export async function getDomain(name: string): Promise<GQLDomain | null> {
  const data = await query<{ domains: GQLDomain[] }>(`
    query DomainByName($name: String!) {
      domains(where: { name: $name }, first: 1) {
        id name tld
        owner { id }
        expiresAt cost registeredAt
        addrRecord { addr }
        textRecords { key value }
        reverseName
      }
    }
  `, { name });
  return data.domains[0] || null;
}

export async function getExpiringDomains(owner: string, withinDays = 30): Promise<GQLDomain[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = nowSec + withinDays * 86400;
  const data = await query<{ domains: GQLDomain[] }>(`
    query ExpiringDomains($owner: String!, $cutoff: BigInt!) {
      domains(
        where: { owner: $owner, expiresAt_lte: $cutoff }
        orderBy: expiresAt
        orderDirection: asc
      ) {
        id name tld expiresAt cost
      }
    }
  `, { owner: owner.toLowerCase(), cutoff: cutoff.toString() });
  return data.domains;
}

export async function getRegistrationHistory(owner: string): Promise<{
  id: string;
  domain: { name: string };
  cost: string;
  timestamp: string;
  transactionHash: string;
}[]> {
  const data = await query<{ registrations: any[] }>(`
    query RegistrationHistory($owner: String!) {
      registrations(where: { owner: $owner }, orderBy: timestamp, orderDirection: desc, first: 50) {
        id
        domain { name }
        cost timestamp transactionHash
      }
    }
  `, { owner: owner.toLowerCase() });
  return data.registrations;
}
