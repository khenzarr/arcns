import { BigInt } from "@graphprotocol/graph-ts";
import {
  ReverseClaimed as ReverseClaimedEvent,
} from "../generated/ReverseRegistrar/ReverseRegistrar";
import { ReverseRecord, Account } from "../generated/schema";

// ─── ReverseClaimed ───────────────────────────────────────────────────────────
// We store TWO entries:
//   1. id = lowercase address  → for address → name lookup
//   2. id = node hex           → so NameChanged on resolver can find it by node
//      The node-keyed entry stores the address in its `name` field temporarily
//      until NameChanged fires and replaces it with the real name.

export function handleReverseClaimed(event: ReverseClaimedEvent): void {
  let addrId = event.params.addr.toHexString().toLowerCase();
  let nodeHex = event.params.node.toHexString();

  // ── Entry keyed by address ────────────────────────────────────────────────
  let record = ReverseRecord.load(addrId);
  if (!record) {
    record = new ReverseRecord(addrId);
    record.name = "";
    record.node = event.params.node;
    record.blockNumber = event.block.number;
    record.logIndex = event.logIndex;
    record.timestamp = event.block.timestamp;
  } else {
    let isNewer =
      event.block.number > record.blockNumber ||
      (event.block.number == record.blockNumber &&
        event.logIndex > record.logIndex);
    if (isNewer) {
      record.node = event.params.node;
      record.blockNumber = event.block.number;
      record.logIndex = event.logIndex;
      record.timestamp = event.block.timestamp;
    }
  }
  record.save();

  // ── Entry keyed by node — stores addrId in name so NameChanged can find it
  let nodeRecord = ReverseRecord.load(nodeHex);
  if (!nodeRecord) {
    nodeRecord = new ReverseRecord(nodeHex);
    nodeRecord.node = event.params.node;
    nodeRecord.blockNumber = event.block.number;
    nodeRecord.logIndex = event.logIndex;
    nodeRecord.timestamp = event.block.timestamp;
  }
  // Store the address id so NameChanged can look up the address-keyed record
  nodeRecord.name = addrId;
  nodeRecord.save();

  // Ensure Account exists
  let account = Account.load(addrId);
  if (!account) {
    account = new Account(addrId);
    account.save();
  }
}
