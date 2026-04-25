import { Bytes } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  NewResolver as NewResolverEvent,
} from "../generated/Registry/Registry";
import { Domain, Account, DomainEvent } from "../generated/schema";

// ─── Transfer ─────────────────────────────────────────────────────────────────
// Registry.Transfer(node, newOwner) — update domain ownership.
// This fires alongside the ERC-721 Transfer from the Registrar.
// Both are idempotent; this one has the node (namehash) directly.

export function handleTransfer(event: TransferEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return;

  let previousOwnerId = domain.owner;
  let newOwner = event.params.owner.toHexString().toLowerCase();

  domain.owner = newOwner;
  domain.save();

  // Ensure Account exists for new owner
  let account = Account.load(newOwner);
  if (!account) {
    account = new Account(newOwner);
    account.save();
  }

  // DomainEvent: TRANSFER
  let evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString() + "-registry-transfer";
  let domainEvent = new DomainEvent(evId);
  domainEvent.domain = nodeHex;
  domainEvent.eventType = "TRANSFER";
  domainEvent.from = Bytes.fromHexString(previousOwnerId);
  domainEvent.to = event.params.owner;
  domainEvent.blockNumber = event.block.number;
  domainEvent.timestamp = event.block.timestamp;
  domainEvent.transactionHash = event.transaction.hash;
  domainEvent.save();
}

// ─── NewResolver ──────────────────────────────────────────────────────────────
// Registry.NewResolver(node, resolver) — update resolver address on domain.

export function handleNewResolver(event: NewResolverEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return;

  domain.resolver = event.params.resolver;
  domain.save();
}
