import { BigInt, Bytes, crypto, ByteArray } from "@graphprotocol/graph-ts";
import {
  NameRegistered as NameRegisteredEvent,
  NameRenewed as NameRenewedEvent,
} from "../generated/ArcController/Controller";
import { Domain, Registration } from "../generated/schema";

// ─── ENS-compatible namehash ──────────────────────────────────────────────────

function namehash(name: string): Bytes {
  let node = Bytes.fromHexString(
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
  if (name == "") return node;
  let labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    let labelHash = crypto.keccak256(ByteArray.fromUTF8(labels[i]));
    // Concatenate node (32 bytes) + labelHash (32 bytes) into a 64-byte ByteArray
    let nodeArr = ByteArray.fromHexString(node.toHexString());
    let combined = new ByteArray(64);
    for (let j = 0; j < 32; j++) combined[j] = nodeArr[j];
    for (let j = 0; j < 32; j++) combined[32 + j] = labelHash[j];
    node = Bytes.fromByteArray(crypto.keccak256(combined));
  }
  return node;
}

// ─── Shared registration handler ─────────────────────────────────────────────

function handleRegistration(
  event: NameRegisteredEvent,
  tld: string
): void {
  let label = event.params.name;
  let fullName = label + "." + tld;
  let nodeBytes = namehash(fullName);
  let domainId = nodeBytes.toHexString();

  // Create or update Domain
  let domain = Domain.load(domainId);
  if (!domain) {
    domain = new Domain(domainId);
    domain.name = fullName;
    domain.label = event.params.label;
    domain.tld = tld;
    domain.registeredAt = event.block.timestamp;
    domain.cost = event.params.cost;
  }
  domain.owner = event.params.owner;
  domain.expiresAt = event.params.expires;
  domain.cost = event.params.cost;
  domain.save();

  // Create Registration record
  let regId =
    event.transaction.hash.toHexString() +
    "-" +
    event.logIndex.toString();
  let reg = new Registration(regId);
  reg.label = label;
  reg.owner = event.params.owner;
  reg.cost = event.params.cost;
  reg.expires = event.params.expires;
  reg.blockNumber = event.block.number;
  reg.timestamp = event.block.timestamp;
  reg.transactionHash = event.transaction.hash;
  reg.save();
}

function handleRenewal(event: NameRenewedEvent, tld: string): void {
  let label = event.params.name;
  let fullName = label + "." + tld;
  let nodeBytes = namehash(fullName);
  let domainId = nodeBytes.toHexString();

  let domain = Domain.load(domainId);
  if (domain) {
    domain.expiresAt = event.params.expires;
    domain.save();
  }
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
