import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ReverseClaimed as ReverseClaimedEvent,
} from "../generated/ReverseRegistrar/ReverseRegistrar";
import { Domain } from "../generated/schema";

export function handleReverseClaimed(event: ReverseClaimedEvent): void {
  let nodeHex = event.params.node.toHexString();
  let domain = Domain.load(nodeHex);
  if (!domain) {
    domain = new Domain(nodeHex);
    domain.name = event.params.addr.toHexString() + ".addr.reverse";
    domain.owner = event.params.addr;
    domain.registeredAt = event.block.timestamp;
    domain.expiresAt = BigInt.fromI32(0);
    domain.cost = BigInt.fromI32(0);
  }
  domain.owner = event.params.addr;
  domain.save();
}
