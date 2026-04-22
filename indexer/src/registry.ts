import { Bytes } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  NewResolver as NewResolverEvent,
} from "../generated/ArcNSRegistry/ArcNSRegistry";
import { Domain } from "../generated/schema";

export function handleTransfer(event: TransferEvent): void {
  let domainId = event.params.node.toHexString();
  let domain = Domain.load(domainId);
  if (!domain) return;

  // Update owner when registry ownership changes
  domain.owner = event.params.owner.toHexString();
  domain.save();
}

export function handleNewResolver(event: NewResolverEvent): void {
  let domainId = event.params.node.toHexString();
  let domain = Domain.load(domainId);
  if (!domain) return;

  domain.resolver = event.params.resolver;
  domain.save();
}
