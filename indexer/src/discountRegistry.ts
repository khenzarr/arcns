import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ArcNSEarlyAdopterDiscountRegistry,
  DiscountActiveUpdated as DiscountActiveUpdatedEvent,
  DiscountControllerAuthorizationUpdated as DiscountControllerAuthorizationUpdatedEvent,
  DiscountRootFrozen as DiscountRootFrozenEvent,
  DiscountRootUpdated as DiscountRootUpdatedEvent,
  DiscountUsed as DiscountUsedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from "../generated/templates/DiscountRegistry/ArcNSEarlyAdopterDiscountRegistry";
import {
  DiscountActivationChange,
  DiscountConsumed,
  DiscountController,
  DiscountControllerAuthorization,
  DiscountRegistryState,
  DiscountRegistryOwnershipTransfer,
  DiscountRootFrozen,
  DiscountRootUpdate,
} from "../generated/schema";

const ZERO_ROOT = "0x0000000000000000000000000000000000000000000000000000000000000000";

function eventId(transactionHash: Bytes, logIndex: string): string {
  return transactionHash.toHexString() + "-" + logIndex;
}

function registryId(address: Address): string {
  return address.toHexString().toLowerCase();
}

function loadOrCreateState(
  address: Address,
  transactionHash: Bytes,
  blockNumber: BigInt,
  logIndex: BigInt,
  timestamp: BigInt
): DiscountRegistryState {
  let id = registryId(address);
  let state = DiscountRegistryState.load(id);

  if (!state) {
    state = new DiscountRegistryState(id);
    state.contractAddress = address;
    state.merkleRoot = Bytes.fromHexString(ZERO_ROOT);
    state.rootFrozen = false;
    state.discountActive = false;

    let registry = ArcNSEarlyAdopterDiscountRegistry.bind(address);
    let campaignIdResult = registry.try_campaignId();
    if (!campaignIdResult.reverted) {
      state.campaignId = campaignIdResult.value;
    }
    let snapshotBlockResult = registry.try_snapshotBlock();
    if (!snapshotBlockResult.reverted) {
      state.snapshotBlock = snapshotBlockResult.value;
    }
    let ownerResult = registry.try_owner();
    if (!ownerResult.reverted) {
      state.owner = ownerResult.value;
    }
  }

  state.blockNumber = blockNumber;
  state.logIndex = logIndex;
  state.timestamp = timestamp;
  state.transactionHash = transactionHash;
  return state;
}

export function handleDiscountRootUpdated(event: DiscountRootUpdatedEvent): void {
  let id = eventId(event.transaction.hash, event.logIndex.toString());
  let update = new DiscountRootUpdate(id);
  update.contractAddress = event.address;
  update.oldRoot = event.params.oldRoot;
  update.newRoot = event.params.newRoot;
  update.transactionHash = event.transaction.hash;
  update.logIndex = event.logIndex;
  update.blockNumber = event.block.number;
  update.timestamp = event.block.timestamp;
  update.save();

  let state = loadOrCreateState(
    event.address,
    event.transaction.hash,
    event.block.number,
    event.logIndex,
    event.block.timestamp
  );
  state.merkleRoot = event.params.newRoot;
  state.save();
}

export function handleDiscountRootFrozen(event: DiscountRootFrozenEvent): void {
  let id = eventId(event.transaction.hash, event.logIndex.toString());
  let frozen = new DiscountRootFrozen(id);
  frozen.contractAddress = event.address;
  frozen.root = event.params.root;
  frozen.transactionHash = event.transaction.hash;
  frozen.logIndex = event.logIndex;
  frozen.blockNumber = event.block.number;
  frozen.timestamp = event.block.timestamp;
  frozen.save();

  let state = loadOrCreateState(
    event.address,
    event.transaction.hash,
    event.block.number,
    event.logIndex,
    event.block.timestamp
  );
  state.merkleRoot = event.params.root;
  state.rootFrozen = true;
  state.save();
}

export function handleDiscountActiveUpdated(event: DiscountActiveUpdatedEvent): void {
  let id = eventId(event.transaction.hash, event.logIndex.toString());
  let change = new DiscountActivationChange(id);
  change.contractAddress = event.address;
  change.active = event.params.active;
  change.transactionHash = event.transaction.hash;
  change.logIndex = event.logIndex;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();

  let state = loadOrCreateState(
    event.address,
    event.transaction.hash,
    event.block.number,
    event.logIndex,
    event.block.timestamp
  );
  state.discountActive = event.params.active;
  state.save();
}

export function handleDiscountControllerAuthorizationUpdated(
  event: DiscountControllerAuthorizationUpdatedEvent
): void {
  let id = eventId(event.transaction.hash, event.logIndex.toString());
  let authorization = new DiscountControllerAuthorization(id);
  authorization.contractAddress = event.address;
  authorization.controller = event.params.controller;
  authorization.authorized = event.params.authorized;
  authorization.transactionHash = event.transaction.hash;
  authorization.logIndex = event.logIndex;
  authorization.blockNumber = event.block.number;
  authorization.timestamp = event.block.timestamp;
  authorization.save();

  let state = loadOrCreateState(
    event.address,
    event.transaction.hash,
    event.block.number,
    event.logIndex,
    event.block.timestamp
  );
  state.save();

  let controllerId =
    registryId(event.address) + "-" + event.params.controller.toHexString().toLowerCase();
  let controller = DiscountController.load(controllerId);
  if (!controller) {
    controller = new DiscountController(controllerId);
    controller.registry = state.id;
    controller.contractAddress = event.address;
    controller.controller = event.params.controller;
  }
  controller.authorized = event.params.authorized;
  controller.transactionHash = event.transaction.hash;
  controller.logIndex = event.logIndex;
  controller.blockNumber = event.block.number;
  controller.timestamp = event.block.timestamp;
  controller.save();
}

export function handleDiscountUsed(event: DiscountUsedEvent): void {
  let id = eventId(event.transaction.hash, event.logIndex.toString());
  let consumed = new DiscountConsumed(id);
  consumed.contractAddress = event.address;
  consumed.account = event.params.account;
  consumed.controller = event.params.controller;
  consumed.campaignId = event.params.campaignId;
  consumed.transactionHash = event.transaction.hash;
  consumed.logIndex = event.logIndex;
  consumed.blockNumber = event.block.number;
  consumed.timestamp = event.block.timestamp;
  consumed.save();

  let state = loadOrCreateState(
    event.address,
    event.transaction.hash,
    event.block.number,
    event.logIndex,
    event.block.timestamp
  );
  state.campaignId = event.params.campaignId;
  state.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  let id = eventId(event.transaction.hash, event.logIndex.toString());
  let transfer = new DiscountRegistryOwnershipTransfer(id);
  transfer.contractAddress = event.address;
  transfer.previousOwner = event.params.previousOwner;
  transfer.newOwner = event.params.newOwner;
  transfer.transactionHash = event.transaction.hash;
  transfer.logIndex = event.logIndex;
  transfer.blockNumber = event.block.number;
  transfer.timestamp = event.block.timestamp;
  transfer.save();

  let state = loadOrCreateState(
    event.address,
    event.transaction.hash,
    event.block.number,
    event.logIndex,
    event.block.timestamp
  );
  state.owner = event.params.newOwner;
  state.save();
}