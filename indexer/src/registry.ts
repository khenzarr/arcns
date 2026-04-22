import { Bytes } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  NewResolver as NewResolverEvent,
} from "../generated/Registry/Registry";
import { Domain } from "../generated/schema";

export function handleTransfer(event: TransferEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return;
  domain.owner = event.params.owner;
  domain.save();
}

export function handleNewResolver(event: NewResolverEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) return;
  domain.resolver = event.params.resolver;
  domain.save();
}
