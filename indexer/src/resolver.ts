import { Bytes } from "@graphprotocol/graph-ts";
import {
  AddrChanged as AddrChangedEvent,
  NameChanged as NameChangedEvent,
} from "../generated/Resolver/Resolver";
import { Domain, ResolverRecord, ReverseRecord, Account } from "../generated/schema";

// ─── AddrChanged ─────────────────────────────────────────────────────────────
// Resolver.AddrChanged(node, a) — update addr record and mirror on Domain.
// v1 scope: addr only.

export function handleAddrChanged(event: AddrChangedEvent): void {
  let nodeHex = event.params.node.toHexString();

  let record = ResolverRecord.load(nodeHex);
  if (!record) {
    record = new ResolverRecord(nodeHex);
    record.domain = nodeHex;
    record.blockNumber = event.block.number;
    record.timestamp = event.block.timestamp;
  }
  record.addr = event.params.a;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();

  // Mirror resolvedAddress on Domain for fast portfolio queries
  let domain = Domain.load(nodeHex);
  if (domain) {
    domain.resolverRecord = nodeHex;
    domain.resolvedAddress = event.params.a;
    domain.save();
  }
}

// ─── NameChanged ─────────────────────────────────────────────────────────────
// Resolver.NameChanged(node, name) — fires when a reverse record name is set.
// Updates both the node-keyed and address-keyed ReverseRecord entries,
// and mirrors the primary name on the Account entity.

export function handleNameChanged(event: NameChangedEvent): void {
  let nodeHex = event.params.node.toHexString();
  let name = event.params.name;

  if (name.length == 0) return;

  // Look up the node-keyed ReverseRecord to find the address id
  let nodeRecord = ReverseRecord.load(nodeHex);
  if (!nodeRecord) return;

  let addrId = nodeRecord.name; // temporarily holds the address id (set by ReverseClaimed)

  // Update node-keyed record with the real name
  nodeRecord.name = name;
  nodeRecord.blockNumber = event.block.number;
  nodeRecord.timestamp = event.block.timestamp;
  nodeRecord.save();

  // Update address-keyed record
  if (addrId.length > 0 && addrId != name) {
    let addrRecord = ReverseRecord.load(addrId);
    if (addrRecord) {
      addrRecord.name = name;
      addrRecord.blockNumber = event.block.number;
      addrRecord.timestamp = event.block.timestamp;
      addrRecord.save();
    }

    // Mirror primary name on Account for fast reverse lookups
    let account = Account.load(addrId);
    if (account) {
      account.reverseName = name;
      account.save();
    }
  }
}
