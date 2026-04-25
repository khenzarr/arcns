import { Bytes } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
} from "../generated/ArcRegistrar/BaseRegistrar";
import { Domain, Account, DomainEvent, LabelhashIndex } from "../generated/schema";
import { getOrCreateAccount } from "./controller";

// ─── ERC-721 Transfer handler ─────────────────────────────────────────────────
//
// BaseRegistrar.Transfer(from, to, tokenId) fires on every ERC-721 transfer.
// tokenId == keccak256(label) as uint256 (the labelhash).
//
// We look up the domain via LabelhashIndex (written at registration time in
// controller.ts) to get the namehash-based domain id.
//
// Mint events (from == zero address) are skipped — the Controller NameRegistered
// handler already sets the initial owner on the Domain entity.

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function handleTransfer(event: TransferEvent, tld: string): void {
  let from = event.params.from.toHexString().toLowerCase();

  // Skip mints — already handled by Controller NameRegistered
  if (from == ZERO_ADDRESS) return;

  // Derive labelhash hex from tokenId (pad to 32 bytes)
  let raw = event.params.tokenId.toHexString().slice(2);
  while (raw.length < 64) raw = "0" + raw;
  let labelhashHex = "0x" + raw;

  // Look up domain id via LabelhashIndex (tld-scoped to avoid arc/circle collision)
  let indexId = tld + "-" + labelhashHex;
  let index = LabelhashIndex.load(indexId);
  if (!index) return; // domain not registered through our controller — skip

  let domainId = index.domainId;
  let domain = Domain.load(domainId);
  if (!domain) return;

  let previousOwner = domain.owner;
  let newOwnerAccount = getOrCreateAccount(event.params.to);
  domain.owner = newOwnerAccount.id;
  domain.save();

  // DomainEvent: TRANSFER
  let evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString() + "-erc721";
  let domainEvent = new DomainEvent(evId);
  domainEvent.domain = domainId;
  domainEvent.eventType = "TRANSFER";
  domainEvent.from = event.params.from;
  domainEvent.to = event.params.to;
  domainEvent.blockNumber = event.block.number;
  domainEvent.timestamp = event.block.timestamp;
  domainEvent.transactionHash = event.transaction.hash;
  domainEvent.save();
}

// ─── Arc handlers ─────────────────────────────────────────────────────────────

export function handleArcTransfer(event: TransferEvent): void {
  handleTransfer(event, "arc");
}

// ─── Circle handlers ──────────────────────────────────────────────────────────

export function handleCircleTransfer(event: TransferEvent): void {
  handleTransfer(event, "circle");
}
