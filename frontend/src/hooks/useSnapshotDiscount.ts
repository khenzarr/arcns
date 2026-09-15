"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { zeroAddress, type Hex } from "viem";
import { ADDR_ARC_CONTROLLER, ADDR_CIRCLE_CONTROLLER, ADDR_DISCOUNT_REGISTRY, DEPLOYED_CHAIN_ID } from "../lib/generated-contracts";
import { DISCOUNT_CONTROLLER_ABI, DISCOUNT_REGISTRY_ABI } from "../lib/discountContract";
import { EARLY_ADOPTER_PROOF_METADATA, lookupEarlyAdopterProof } from "../lib/discountProofs";
import { publicClient } from "../lib/publicClient";
import type { SupportedTLD } from "../lib/normalization";

export type SnapshotDiscount = { base: bigint; premium: bigint; total: bigint; proof: Hex[] };

/** Fail closed: a snapshot proof alone never enables a discounted transaction. */
export function useSnapshotDiscount(label: string, tld: SupportedTLD, duration: bigint) {
  const { address, chainId } = useAccount();
  const key = `${address ?? ""}:${chainId ?? ""}:${label}:${tld}:${duration}`;
  const [result, setResult] = useState<{ key: string; discount: SnapshotDiscount } | null>(null);

  useEffect(() => {
    setResult(null);
    if (!address || chainId !== DEPLOYED_CHAIN_ID || !label || ADDR_DISCOUNT_REGISTRY === zeroAddress) return;
    let cancelled = false;
    const controller = tld === "arc" ? ADDR_ARC_CONTROLLER : ADDR_CIRCLE_CONTROLLER;
    const registry = ADDR_DISCOUNT_REGISTRY;
    const registryCall = (functionName: "campaignId" | "snapshotBlock" | "merkleRoot" | "rootFrozen" | "discountActive") =>
      publicClient.readContract({ address: registry, abi: DISCOUNT_REGISTRY_ABI, functionName });

    (async () => {
      const lookup = await lookupEarlyAdopterProof(address);
      if (lookup.status !== "eligible" || cancelled) return;

      const [arcPointer, circlePointer, campaignId, snapshotBlock, root, frozen, active, used, arcAuthorized, circleAuthorized] = await Promise.all([
        publicClient.readContract({ address: ADDR_ARC_CONTROLLER, abi: DISCOUNT_CONTROLLER_ABI, functionName: "discountRegistry" }),
        publicClient.readContract({ address: ADDR_CIRCLE_CONTROLLER, abi: DISCOUNT_CONTROLLER_ABI, functionName: "discountRegistry" }),
        registryCall("campaignId"),
        registryCall("snapshotBlock"),
        registryCall("merkleRoot"),
        registryCall("rootFrozen"),
        registryCall("discountActive"),
        publicClient.readContract({ address: registry, abi: DISCOUNT_REGISTRY_ABI, functionName: "used", args: [address] }),
        publicClient.readContract({ address: registry, abi: DISCOUNT_REGISTRY_ABI, functionName: "authorizedControllers", args: [ADDR_ARC_CONTROLLER] }),
        publicClient.readContract({ address: registry, abi: DISCOUNT_REGISTRY_ABI, functionName: "authorizedControllers", args: [ADDR_CIRCLE_CONTROLLER] }),
      ]);

      const expected = EARLY_ADOPTER_PROOF_METADATA;
      if (
        arcPointer.toLowerCase() !== registry.toLowerCase() ||
        circlePointer.toLowerCase() !== registry.toLowerCase() ||
        String(campaignId).toLowerCase() !== expected.campaignIdBytes32.toLowerCase() ||
        BigInt(snapshotBlock) !== BigInt(expected.snapshotBlock) ||
        String(root).toLowerCase() !== expected.merkleRoot.toLowerCase() ||
        frozen !== true || active !== true || used !== false ||
        arcAuthorized !== true || circleAuthorized !== true
      ) return;

      const quote = await publicClient.readContract({
        address: controller, abi: DISCOUNT_CONTROLLER_ABI, functionName: "discountRentPrice", args: [label, duration],
      });
      const { base, premium } = quote;
      if (!cancelled && base > 0n) setResult({ key, discount: { base, premium, total: base + premium, proof: lookup.proof } });
    })().catch(() => { if (!cancelled) setResult(null); });

    return () => { cancelled = true; };
  }, [address, chainId, label, tld, duration, key]);

  return result?.key === key ? result.discount : null;
}
