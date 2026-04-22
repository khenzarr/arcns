import { BigInt, Bytes, crypto, ByteArray } from "@graphprotocol/graph-ts";
import {
  NameRegistered as NameRegisteredEvent,
  NameRenewed as NameRenewedEvent,
} from "../generated/ArcNSRegistrarControllerV2/ArcNSRegistrarControllerV2";
import { Domain, Registration, Renewal, Account } from "../generated/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateAccount(address: Bytes): Account {
  let id = address.toHexString();
  let account = Account.load(id);
  if (!account) {
    account = new Account(id);
    account.save();
  }
  return account;
}

function labelToTLD(name: string): string {
  let parts = name.split(".");
  return parts[parts.length - 1];
}

function namehash(name: string): Bytes {
  let node = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000");
  if (name == "") return node;
  let labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    let labelHash = crypto.keccak256(ByteArray.fromUTF8(labels[i]));
    let combined = new Uint8Array(64);
    for (let j = 0; j < 32; j++) combined[j] = node[j];
    for (let j = 0; j < 32; j++) combined[32 + j] = labelHash[j];
    node = Bytes.fromByteArray(crypto.keccak256(ByteArray.fromUint8Array(combined)));
  }
  return node;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export function handleNameRegistered(event: NameRegisteredEvent): void {
  let name = event.params.name;
  let tld = labelToTLD(name);
  let fullName = name + "." + tld;
  let nodeHash = namehash(fullName);
  let domainId = nodeHash.toHexString();

  let owner = getOrCreateAccount(event.params.owner);

  // Create or update domain
  let domain = Domain.load(domainId);
  if (!domain) {
    domain = new Domain(domainId);
    domain.name = fullName;
    domain.label = event.params.label;
    domain.tld = tld;
    domain.registeredAt = event.block.timestamp;
  }
  domain.owner = owner.id;
  domain.expiresAt = event.params.expires;
  domain.cost = event.params.cost;
  domain.save();

  // Create registration record
  let regId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let registration = new Registration(regId);
  registration.domain = domainId;
  registration.owner = owner.id;
  registration.cost = event.params.cost;
  registration.expiresAt = event.params.expires;
  registration.blockNumber = event.block.number;
  registration.timestamp = event.block.timestamp;
  registration.transactionHash = event.transaction.hash;
  registration.save();
}

export function handleNameRenewed(event: NameRenewedEvent): void {
  let name = event.params.name;
  let tld = labelToTLD(name);
  let fullName = name + "." + tld;
  let nodeHash = namehash(fullName);
  let domainId = nodeHash.toHexString();

  let domain = Domain.load(domainId);
  if (domain) {
    domain.expiresAt = event.params.expires;
    domain.save();
  }

  let renewalId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let renewal = new Renewal(renewalId);
  renewal.domain = domainId;
  renewal.cost = event.params.cost;
  renewal.newExpiresAt = event.params.expires;
  renewal.blockNumber = event.block.number;
  renewal.timestamp = event.block.timestamp;
  renewal.transactionHash = event.transaction.hash;
  renewal.save();
}
