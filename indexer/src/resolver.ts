import { Bytes } from "@graphprotocol/graph-ts";
import {
  AddrChanged as AddrChangedEvent,
  NameChanged as NameChangedEvent,
  TextChanged as TextChangedEvent,
  ContenthashChanged as ContenthashChangedEvent,
} from "../generated/Resolver/Resolver";
import { Domain, ResolverRecord, ReverseRecord } from "../generated/schema";

// ─── AddrChanged ─────────────────────────────────────────────────────────────
// ALWAYS overwrite — latest event wins (deterministic by block + logIndex)

export function handleAddrChanged(event: AddrChangedEvent): void {
  let nodeHex = event.params.node.toHexString();

  let record = ResolverRecord.load(nodeHex);
  if (!record) {
    record = new ResolverRecord(nodeHex);
    record.domain = nodeHex;
    record.texts = [];
  }
  record.addr = event.params.a;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();

  // Link to Domain if it exists
  let domain = Domain.load(nodeHex);
  if (domain) {
    domain.resolverRecord = nodeHex;
    domain.save();
  }
}

// ─── NameChanged ─────────────────────────────────────────────────────────────
// When NameChanged fires on a reverse node, update both ReverseRecord entries.
// The node-keyed record stores the address id in its `name` field (set by
// handleReverseClaimed) so we can look up the address-keyed record here.

export function handleNameChanged(event: NameChangedEvent): void {
  let nodeHex = event.params.node.toHexString();
  let name = event.params.name;

  // Guard: never store empty names
  if (name.length == 0) return;

  // Check if this is a forward domain (unusual)
  let domain = Domain.load(nodeHex);
  if (domain) {
    domain.save();
    return;
  }

  // Look up the node-keyed ReverseRecord
  let nodeRecord = ReverseRecord.load(nodeHex);
  if (nodeRecord) {
    // The node-keyed record's `name` field holds the address id (set by ReverseClaimed)
    let addrId = nodeRecord.name; // e.g. "0x0b943fe9..."

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
    }
  }
}

// ─── TextChanged ─────────────────────────────────────────────────────────────

export function handleTextChanged(event: TextChangedEvent): void {
  let nodeHex = event.params.node.toHexString();
  let record = ResolverRecord.load(nodeHex);
  if (!record) {
    record = new ResolverRecord(nodeHex);
    record.domain = nodeHex;
    record.texts = [];
    record.blockNumber = event.block.number;
    record.timestamp = event.block.timestamp;
  }
  let texts = record.texts;
  let key = event.params.key;
  let found = false;
  for (let i = 0; i < texts.length; i++) {
    if (texts[i] == key) { found = true; break; }
  }
  if (!found) texts.push(key);
  record.texts = texts;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();
}

// ─── ContenthashChanged ───────────────────────────────────────────────────────

export function handleContenthashChanged(event: ContenthashChangedEvent): void {
  let nodeHex = event.params.node.toHexString();
  let record = ResolverRecord.load(nodeHex);
  if (!record) {
    record = new ResolverRecord(nodeHex);
    record.domain = nodeHex;
    record.texts = [];
  }
  record.contenthash = event.params.hash;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();
}
