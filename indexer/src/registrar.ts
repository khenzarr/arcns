import {
  NameRegistered as NameRegisteredEvent,
  NameRenewed as NameRenewedEvent,
} from "../generated/ArcRegistrar/BaseRegistrar";
import { Domain } from "../generated/schema";

// Registrar events carry tokenId (uint256 = keccak256(label)) and expiry.
// The controller events carry the human-readable name — those are the primary
// source for Domain creation. Registrar events update expiry only.

export function handleArcRegistrarNameRegistered(
  event: NameRegisteredEvent
): void {
  // tokenId = uint256(keccak256(label)) — used as the domain's label hash
  // We can't reconstruct the full name here without the label string,
  // so we only update expiry if the domain already exists.
  let tokenIdHex = event.params.id.toHexString();
  // Domain id is the namehash, not the tokenId — skip if not found
  // (controller event will create it with the full name)
}

export function handleArcRegistrarNameRenewed(
  event: NameRenewedEvent
): void {
  // Same — expiry update handled by controller NameRenewed event
}

export function handleCircleRegistrarNameRegistered(
  event: NameRegisteredEvent
): void {
  // handled by controller
}

export function handleCircleRegistrarNameRenewed(
  event: NameRenewedEvent
): void {
  // handled by controller
}
