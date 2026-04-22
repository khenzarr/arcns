import {
  Transfer as TransferEvent,
  NewResolver as NewResolverEvent,
} from "../generated/Registry/Registry";
import { Domain, Account, DomainEvent } from "../generated/schema";

// ─── Transfer ─────────────────────────────────────────────────────────────────
// Registry.Transfer(node, newOwner) — update domain ownership + emit DomainEvent

export function handleTransfer(event: TransferEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return; // only update existing domains

  // Capture previous owner before overwriting
  let previousOwnerId = domain.owner;
  let newOwner = event.params.owner.toHexString().toLowerCase();

  // Idempotent: overwrite owner with latest value
  domain.owner = newOwner;
  domain.save();

  // Ensure Account exists for new owner
  let account = Account.load(newOwner);
  if (!account) {
    account = new Account(newOwner);
    account.save();
  }

  // Create DomainEvent for TRANSFER — from = previous owner, to = new owner
  let eventId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString() + "-transfer";
  let domainEvent = new DomainEvent(eventId);
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
// Registry.NewResolver(node, resolver) — update resolver address on domain

export function handleNewResolver(event: NewResolverEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return;

  // Idempotent: overwrite resolver with latest value
  domain.resolver = event.params.resolver;
  domain.save();
}
