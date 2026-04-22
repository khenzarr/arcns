import { Bytes } from "@graphprotocol/graph-ts";
import {
  AddrChanged as AddrChangedEvent,
  TextChanged as TextChangedEvent,
  NameChanged as NameChangedEvent,
} from "../generated/ArcNSResolverV2/ArcNSResolverV2";
import { Domain, AddrRecord, TextRecord } from "../generated/schema";

export function handleAddrChanged(event: AddrChangedEvent): void {
  let domainId = event.params.node.toHexString();

  // Update AddrRecord regardless of whether Domain exists yet
  // (AddrChanged can fire before NameRegistered in the same block)
  let record = AddrRecord.load(domainId);
  if (!record) {
    record = new AddrRecord(domainId);
    record.domain = domainId;
  }
  record.addr = Bytes.fromHexString(event.params.a.toHexString());
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();

  // Link to domain if it exists
  let domain = Domain.load(domainId);
  if (domain) {
    domain.addrRecord = domainId;
    domain.save();
  }
}

export function handleTextChanged(event: TextChangedEvent): void {
  let domainId = event.params.node.toHexString();
  let domain = Domain.load(domainId);
  if (!domain) return;

  let recordId = domainId + "-" + event.params.key;
  let record = TextRecord.load(recordId);
  if (!record) {
    record = new TextRecord(recordId);
    record.domain = domainId;
    record.key = event.params.key;
  }
  record.value = event.params.value;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();
}

export function handleNameChanged(event: NameChangedEvent): void {
  let domainId = event.params.node.toHexString();
  let domain = Domain.load(domainId);
  if (!domain) return;

  domain.reverseName = event.params.name;
  domain.save();
}
