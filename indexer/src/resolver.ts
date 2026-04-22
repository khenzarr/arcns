import { Bytes } from "@graphprotocol/graph-ts";
import {
  AddrChanged as AddrChangedEvent,
  NameChanged as NameChangedEvent,
} from "../generated/Resolver/Resolver";
import { Domain, ResolverRecord } from "../generated/schema";

export function handleAddrChanged(event: AddrChangedEvent): void {
  let nodeHex = event.params.node.toHexString();

  // Create or update ResolverRecord — works even if Domain doesn't exist yet
  let record = ResolverRecord.load(nodeHex);
  if (!record) {
    record = new ResolverRecord(nodeHex);
    record.node = event.params.node;
  }
  record.address = Bytes.fromHexString(event.params.a.toHexString());
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();

  // Link to Domain if it exists
  let domain = Domain.load(nodeHex);
  if (domain) {
    domain.addrRecord = nodeHex;
    domain.save();
  }
}

export function handleNameChanged(event: NameChangedEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return;
  domain.reverseName = event.params.name;
  domain.save();
}
