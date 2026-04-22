import {
  Transfer as TransferEvent,
  NewResolver as NewResolverEvent,
} from "../generated/Registry/Registry";
import { Domain, Account } from "../generated/schema";

// ─── Transfer ─────────────────────────────────────────────────────────────────
// Registry.Transfer(node, newOwner) — update domain ownership

export function handleTransfer(event: TransferEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return; // only update existing domains

  domain.owner = event.params.owner.toHexString().toLowerCase();
  domain.save();

  // Ensure Account exists for new owner
  let accountId = event.params.owner.toHexString().toLowerCase();
  let account = Account.load(accountId);
  if (!account) {
    account = new Account(accountId);
    account.save();
  }
}

// ─── NewResolver ──────────────────────────────────────────────────────────────
// Registry.NewResolver(node, resolver) — update resolver address on domain

export function handleNewResolver(event: NewResolverEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return;

  domain.resolver = event.params.resolver;
  domain.save();
}
