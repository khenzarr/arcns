import { BigInt, Bytes, crypto, ByteArray } from "@graphprotocol/graph-ts";
import {
  NameRegistered as NameRegisteredEvent,
  NameRenewed as NameRenewedEvent,
} from "../generated/ArcController/Controller";
import { Domain, Registration, Account, DomainEvent } from "../generated/schema";

// ─── ENS-compatible namehash ──────────────────────────────────────────────────

export function namehash(name: string): Bytes {
  let node = Bytes.fromHexString(
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
  if (name == "") return node;
  let labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    let labelHash = crypto.keccak256(ByteArray.fromUTF8(labels[i]));
    let nodeArr = ByteArray.fromHexString(node.toHexString());
    let combined = new ByteArray(64);
    for (let j = 0; j < 32; j++) combined[j] = nodeArr[j];
    for (let j = 0; j < 32; j++) combined[32 + j] = labelHash[j];
    node = Bytes.fromByteArray(crypto.keccak256(combined));
  }
  return node;
}

// ─── Account helper ───────────────────────────────────────────────────────────

function getOrCreateAccount(addr: Bytes): Account {
  let id = addr.toHexString().toLowerCase();
  let account = Account.load(id);
  if (!account) {
    account = new Account(id);
    account.save();
  }
  return account;
}

// ─── Shared registration handler ─────────────────────────────────────────────

function handleRegistration(event: NameRegisteredEvent, tld: string): void {
  let labelName = event.params.name;

  // Guard: skip empty-name events — never index them
  if (labelName.length == 0) return;

  let fullName = labelName + "." + tld;
  let nodeBytes = namehash(fullName);
  let domainId = nodeBytes.toHexString();

  // Deterministic labelhash = keccak256(label)
  let labelhash = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8(labelName))
  );

  // Duration = expiresAt - block.timestamp (approximate)
  let duration = event.params.expires.minus(event.block.timestamp);

  // Idempotent: load existing domain or create new — only overwrite changed fields
  let domain = Domain.load(domainId);
  if (!domain) {
    domain = new Domain(domainId);
    domain.name = fullName;
    domain.labelName = labelName;
    domain.labelhash = labelhash;
    domain.createdAt = event.block.timestamp;
    domain.registrationType = tld == "arc" ? "ARC" : "CIRCLE";
  }
  // Always overwrite mutable fields with latest event values
  domain.owner = getOrCreateAccount(event.params.owner).id;
  domain.expiry = event.params.expires;
  domain.lastCost = event.params.cost;
  domain.save();

  // Ensure Account exists
  getOrCreateAccount(event.params.owner);

  // Create immutable Registration record (txHash-logIndex is unique per event)
  let regId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let reg = new Registration(regId);
  reg.domain = domainId;
  reg.registrant = event.params.owner;
  reg.cost = event.params.cost;
  reg.duration = duration;
  reg.expiresAt = event.params.expires;
  reg.blockNumber = event.block.number;
  reg.timestamp = event.block.timestamp;
  reg.transactionHash = event.transaction.hash;
  reg.save();

  // Create DomainEvent record for REGISTER
  let eventId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString() + "-reg";
  let domainEvent = new DomainEvent(eventId);
  domainEvent.domain = domainId;
  domainEvent.eventType = "REGISTER";
  domainEvent.from = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
  domainEvent.to = event.params.owner;
  domainEvent.cost = event.params.cost;
  domainEvent.blockNumber = event.block.number;
  domainEvent.timestamp = event.block.timestamp;
  domainEvent.transactionHash = event.transaction.hash;
  domainEvent.save();
}

function handleRenewal(event: NameRenewedEvent, tld: string): void {
  let labelName = event.params.name;

  // Guard: skip empty-name events
  if (labelName.length == 0) return;

  let fullName = labelName + "." + tld;
  let nodeBytes = namehash(fullName);
  let domainId = nodeBytes.toHexString();

  let domain = Domain.load(domainId);
  if (!domain) return; // domain must exist before we can renew or emit events

  // Idempotent: always update expiry and lastCost — latest event wins
  domain.expiry = event.params.expires;
  domain.lastCost = event.params.cost;
  domain.save();

  // Create DomainEvent record for RENEW
  let eventId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString() + "-renew";
  let domainEvent = new DomainEvent(eventId);
  domainEvent.domain = domainId;
  domainEvent.eventType = "RENEW";
  domainEvent.cost = event.params.cost;
  domainEvent.blockNumber = event.block.number;
  domainEvent.timestamp = event.block.timestamp;
  domainEvent.transactionHash = event.transaction.hash;
  domainEvent.save();
}

// ─── Arc handlers ─────────────────────────────────────────────────────────────

export function handleArcNameRegistered(event: NameRegisteredEvent): void {
  handleRegistration(event, "arc");
}

export function handleArcNameRenewed(event: NameRenewedEvent): void {
  handleRenewal(event, "arc");
}

// ─── Circle handlers ──────────────────────────────────────────────────────────

export function handleCircleNameRegistered(event: NameRegisteredEvent): void {
  handleRegistration(event, "circle");
}

export function handleCircleNameRenewed(event: NameRenewedEvent): void {
  handleRenewal(event, "circle");
}
