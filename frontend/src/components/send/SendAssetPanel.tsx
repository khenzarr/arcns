"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { erc20Abi, getAddress, isAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { publicClient } from "../../lib/publicClient";
import { DEPLOYED_CHAIN_ID } from "../../lib/generated-contracts";
import {
  ARC_TESTNET_SEND_ASSETS,
  formatAssetBalance,
  parseSendAmount,
  resolveSendRecipient,
  type ResolutionResult,
  type SendAsset,
} from "../../lib/sendAssets";
import { CopyButton } from "../ui/CopyButton";

type Review = {
  recipient: ResolutionResult;
  amount: bigint;
  displayAmount: string;
};

function shortAddress(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function tokenTone(symbol: string) {
  if (symbol === "USDC") return "from-[#2775CA] to-[#49a5ff]";
  if (symbol === "EURC") return "from-[#005339] to-[#18b77b]";
  if (symbol === "cirBTC") return "from-[#f7931a] to-[#ffc45e]";
  return "from-[#6d7cff] to-[#00d4ff]";
}

export default function SendAssetPanel() {
  const { address, chainId, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [assets, setAssets] = useState<SendAsset[]>([...ARC_TESTNET_SEND_ASSETS]);
  const [selectedAddress, setSelectedAddress] = useState<string>(ARC_TESTNET_SEND_ASSETS[0].address);
  const [recipientInput, setRecipientInput] = useState("");
  const [resolution, setResolution] = useState<ResolutionResult | null>(null);
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<bigint | undefined>();
  const [customAddress, setCustomAddress] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [walletAssetsOpen, setWalletAssetsOpen] = useState(false);
  const [assetDiscovery, setAssetDiscovery] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [busy, setBusy] = useState<"resolve" | "token" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const selectedAsset = useMemo(
    () => assets.find(asset => asset.address.toLowerCase() === selectedAddress.toLowerCase()) ?? assets[0],
    [assets, selectedAddress],
  );

  const detectedAssets = useMemo(
    () => assets.filter(asset => asset.provenance === "detected"),
    [assets],
  );
  const detectedAssetCount = detectedAssets.length;

  const loadWalletAssets = useCallback(async () => {
    if (!address || chainId !== DEPLOYED_CHAIN_ID) {
      setAssets(current => current.filter(asset => asset.provenance !== "detected"));
      setAssetDiscovery("idle");
      return;
    }

    setAssetDiscovery("loading");
    try {
      const response = await fetch(`/api/v1/wallet-assets/${address}`, {
        headers: { Accept: "application/json" },
      });
      const body = await response.json() as {
        status?: string;
        assets?: Array<{ address: `0x${string}`; indexedBalance: string }>;
      };
      if (!response.ok || body.status !== "ok" || !Array.isArray(body.assets)) {
        throw new Error("Asset index unavailable");
      }

      const inspected = await Promise.allSettled(
        body.assets.map(async candidate => {
          const [symbol, decimals] = await Promise.all([
            publicClient.readContract({ address: candidate.address, abi: erc20Abi, functionName: "symbol" }),
            publicClient.readContract({ address: candidate.address, abi: erc20Abi, functionName: "decimals" }),
          ]);
          if (typeof symbol !== "string" || !symbol.trim()) throw new Error("Token has no symbol");
          const numericDecimals = Number(decimals);
          if (!Number.isInteger(numericDecimals) || numericDecimals < 0 || numericDecimals > 255) throw new Error("Token decimals are invalid");
          return {
            address: getAddress(candidate.address),
            symbol: symbol.trim().slice(0, 16),
            name: `${symbol.trim().slice(0, 32)} token`,
            decimals: numericDecimals,
            provenance: "detected" as const,
          } satisfies SendAsset;
        }),
      );

      const detected: SendAsset[] = inspected.flatMap(result =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      setAssets(current => {
        const retained = current.filter(asset => asset.provenance !== "detected");
        const retainedAddresses = new Set(retained.map(asset => asset.address.toLowerCase()));
        return [...retained, ...detected.filter(asset => !retainedAddresses.has(asset.address.toLowerCase()))];
      });
      setAssetDiscovery("ready");
    } catch {
      setAssets(current => current.filter(asset => asset.provenance !== "detected"));
      setAssetDiscovery("error");
    }
  }, [address, chainId]);

  const refreshBalance = useCallback(async () => {
    if (!address || !selectedAsset) {
      setBalance(undefined);
      return;
    }
    try {
      const value = await publicClient.readContract({
        address: selectedAsset.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      setBalance(value);
    } catch {
      setBalance(undefined);
    }
  }, [address, selectedAsset]);

  useEffect(() => { void refreshBalance(); }, [refreshBalance]);

  useEffect(() => { void loadWalletAssets(); }, [loadWalletAssets]);

  useEffect(() => {
    setReview(null);
    setTxHash(null);
  }, [selectedAddress, recipientInput, amount]);

  async function resolveRecipient() {
    setBusy("resolve");
    setError(null);
    try {
      const result = await resolveSendRecipient(recipientInput);
      setResolution(result);
      return result;
    } catch (caught) {
      setResolution(null);
      setError(caught instanceof Error ? caught.message : "Recipient could not be resolved.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function addCustomToken() {
    setBusy("token");
    setError(null);
    try {
      if (!isAddress(customAddress)) throw new Error("Enter a valid ERC-20 contract address.");
      const tokenAddress = getAddress(customAddress);
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "symbol" }),
        publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" }),
      ]);
      if (!symbol || typeof symbol !== "string") throw new Error("Token symbol could not be read.");
      const custom: SendAsset = {
        address: tokenAddress,
        symbol: symbol.slice(0, 16),
        name: "Custom ERC-20 token",
        decimals: Number(decimals),
        provenance: "custom",
      };
      setAssets(current => current.some(asset => asset.address.toLowerCase() === tokenAddress.toLowerCase()) ? current : [...current, custom]);
      setSelectedAddress(tokenAddress);
      setCustomOpen(false);
      setCustomAddress("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Token metadata could not be read.");
    } finally {
      setBusy(null);
    }
  }

  async function prepareReview() {
    setError(null);
    setTxHash(null);
    if (!isConnected || !address) return setError("Connect your wallet before preparing a transfer.");
    if (chainId !== DEPLOYED_CHAIN_ID) return setError(`Switch your wallet to Arc Testnet (Chain ID ${DEPLOYED_CHAIN_ID}).`);

    const recipient = resolution && resolution.input.trim().toLowerCase() === recipientInput.trim().toLowerCase()
      ? resolution
      : await resolveRecipient();
    if (!recipient) return;

    try {
      const parsedAmount = parseSendAmount(amount, selectedAsset.decimals, balance);
      setReview({ recipient, amount: parsedAmount, displayAmount: amount.trim() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Amount is not valid.");
    }
  }

  async function confirmTransfer() {
    if (!review) return;
    setBusy("send");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: selectedAsset.address,
        abi: erc20Abi,
        functionName: "transfer",
        args: [review.recipient.address, review.amount],
        chainId: DEPLOYED_CHAIN_ID,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setReview(null);
      setAmount("");
      await refreshBalance();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Transfer was not completed.";
      setError(message.toLowerCase().includes("rejected") ? "The transaction was rejected in your wallet." : message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-[rgba(120,160,255,0.24)] bg-[rgba(7,13,29,0.82)] shadow-[0_36px_120px_rgba(0,0,0,0.38)] backdrop-blur-2xl" aria-labelledby="send-panel-title">
      <div className="border-b border-white/10 px-5 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--arcns-text-muted)]">Direct wallet transfer</p><h2 id="send-panel-title" className="mt-1 text-2xl font-bold tracking-tight text-white">Send an asset</h2></div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">Non-custodial</span>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <fieldset>
          <legend className="sr-only">Choose asset</legend>
          <div className="mb-3"><span className="text-sm font-semibold text-white">Choose asset</span></div>
          <div className="grid gap-2 sm:grid-cols-3">
            {assets.filter(asset => asset.provenance === "circle").map(asset => {
              const active = selectedAsset.address.toLowerCase() === asset.address.toLowerCase();
              return (
                <button key={asset.address} type="button" onClick={() => setSelectedAddress(asset.address)} aria-pressed={active} className={`rounded-2xl border p-3 text-left transition ${active ? "border-[var(--arcns-cyan)] bg-[rgba(0,212,255,0.08)] shadow-[0_0_28px_rgba(0,212,255,0.08)]" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}>
                  <span className={`mb-3 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${tokenTone(asset.symbol)} text-[10px] font-extrabold text-white shadow-lg`}>{asset.symbol.slice(0, 4)}</span>
                  <strong className="block text-sm text-white">{asset.symbol}</strong>
                  <span className="mt-1 block truncate text-[11px] text-[var(--arcns-text-muted)]">Circle asset</span>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setCustomOpen(value => !value)} className="mt-3 text-sm font-semibold text-[var(--arcns-cyan)] hover:text-white">+ Add custom ERC-20</button>
          {customOpen ? (
            <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:flex-row">
              <input value={customAddress} onChange={event => setCustomAddress(event.target.value)} placeholder="0x token contract" aria-label="Custom token contract address" className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080e1f] px-3 font-mono text-sm text-white outline-none focus:border-[var(--arcns-cyan)]" />
              <button type="button" onClick={addCustomToken} disabled={busy === "token"} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white hover:border-[var(--arcns-cyan)] disabled:opacity-50">{busy === "token" ? "Reading..." : "Use token"}</button>
            </div>
          ) : null}

          {selectedAsset.provenance === "custom" ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[rgba(0,212,255,0.22)] bg-[rgba(0,212,255,0.05)] px-3 py-2 text-xs">
              <span className="text-[var(--arcns-text-muted)]">Selected custom token</span><strong className="text-white">{selectedAsset.symbol}</strong>
            </div>
          ) : null}

          {isConnected && chainId === DEPLOYED_CHAIN_ID ? (
            <div className="relative mt-3">
              <button type="button" onClick={() => setWalletAssetsOpen(open => !open)} aria-expanded={walletAssetsOpen} aria-controls="wallet-assets-listbox" className={`flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border px-3 text-left transition ${selectedAsset.provenance === "detected" ? "border-[var(--arcns-cyan)] bg-[rgba(0,212,255,0.06)]" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white">{selectedAsset.provenance === "detected" ? selectedAsset.symbol : "Wallet assets"}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--arcns-text-muted)]">{assetDiscovery === "loading" ? "Scanning Arc wallet..." : assetDiscovery === "error" ? "Automatic scan unavailable" : `${detectedAssetCount} additional ERC-20 asset${detectedAssetCount === 1 ? "" : "s"}`}</span>
                </span>
                <span className={`text-sm text-[var(--arcns-cyan)] transition-transform ${walletAssetsOpen ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
              </button>

              {walletAssetsOpen ? (
                <div id="wallet-assets-listbox" role="listbox" aria-label="Detected wallet assets" className="absolute inset-x-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#080e1f] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
                  <div className="mb-2 flex items-center justify-between gap-3 px-2 py-1"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--arcns-text-muted)]">Detected on Arc</span><button type="button" onClick={() => void loadWalletAssets()} disabled={assetDiscovery === "loading"} className="text-[11px] font-semibold text-[var(--arcns-cyan)] hover:text-white disabled:opacity-50">Refresh</button></div>
                  {detectedAssets.length > 0 ? detectedAssets.map(asset => {
                    const active = selectedAsset.address.toLowerCase() === asset.address.toLowerCase();
                    return (
                      <button key={asset.address} type="button" role="option" aria-selected={active} onClick={() => { setSelectedAddress(asset.address); setWalletAssetsOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-[rgba(0,212,255,0.09)]" : "hover:bg-white/[0.05]"}`}>
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${tokenTone(asset.symbol)} text-[9px] font-extrabold text-white`}>{asset.symbol.slice(0, 4)}</span>
                        <span className="min-w-0 flex-1"><strong className="block text-sm text-white">{asset.symbol}</strong><span className="block truncate font-mono text-[10px] text-[var(--arcns-text-muted)]">{shortAddress(asset.address)}</span></span>
                        {active ? <span className="text-[var(--arcns-cyan)]" aria-hidden="true">✓</span> : null}
                      </button>
                    );
                  }) : <p className="px-3 py-4 text-center text-xs leading-5 text-[var(--arcns-text-muted)]">{assetDiscovery === "loading" ? "Scanning wallet contracts..." : "No additional ERC-20 assets found."}</p>}
                </div>
              ) : null}
              {assetDiscovery === "error" ? <p className="mt-2 text-xs leading-5 text-amber-100/80">Circle assets and manual contract entry remain available.</p> : null}
            </div>
          ) : null}
        </fieldset>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="send-recipient" className="text-sm font-semibold text-white">Recipient</label><span className="text-xs text-[var(--arcns-text-muted)]">0x / .arc / .circle</span></div>
          <div className="flex rounded-2xl border border-white/10 bg-[#080e1f] p-1 focus-within:border-[var(--arcns-cyan)]">
            <input id="send-recipient" value={recipientInput} onChange={event => { setRecipientInput(event.target.value); setResolution(null); }} onBlur={() => { if (recipientInput.trim()) void resolveRecipient(); }} placeholder="alice.arc or 0x..." autoComplete="off" spellCheck={false} className="min-h-12 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-white outline-none" />
            <button type="button" onClick={resolveRecipient} disabled={busy === "resolve" || !recipientInput.trim()} className="min-h-12 rounded-xl bg-white/[0.06] px-4 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40">{busy === "resolve" ? "Resolving..." : "Resolve"}</button>
          </div>
          {resolution ? (
            <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-emerald-300">{resolution.resolvedName ? `${resolution.resolvedName} resolves to` : "Direct address"}</p><p className="mt-1 truncate font-mono text-xs text-white" title={resolution.address}>{resolution.address}</p></div><CopyButton value={resolution.address} aria-label="Copy resolved address" /></div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="send-amount" className="text-sm font-semibold text-white">Amount</label>
            <div className="flex items-center gap-2 text-xs text-[var(--arcns-text-muted)]">
              <span>Balance: {formatAssetBalance(balance, selectedAsset.decimals)} {selectedAsset.symbol}</span>
              {selectedAsset.symbol !== "USDC" && balance !== undefined ? (
                <button type="button" onClick={() => setAmount(formatAssetBalance(balance, selectedAsset.decimals))} className="font-semibold text-[var(--arcns-cyan)] hover:text-white">Use max</button>
              ) : null}
            </div>
          </div>
          <div className="flex items-center rounded-2xl border border-white/10 bg-[#080e1f] px-4 focus-within:border-[var(--arcns-cyan)]">
            <input id="send-amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="min-h-14 min-w-0 flex-1 bg-transparent text-2xl font-semibold text-white outline-none" />
            <strong className="text-sm text-[var(--arcns-text-secondary)]">{selectedAsset.symbol}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--arcns-text-muted)]"><span>Token contract</span><span className="flex items-center gap-1 font-mono" title={selectedAsset.address}>{shortAddress(selectedAsset.address)}<CopyButton value={selectedAsset.address} aria-label={`Copy ${selectedAsset.symbol} token address`} /></span></div>
          {selectedAsset.symbol === "USDC" ? <p className="mt-2 text-xs leading-5 text-amber-100/80">Keep some USDC available for Arc network fees. Exact full-balance sends are intentionally disabled.</p> : null}
        </div>

        {error ? <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-200">{error}</div> : null}

        {review ? (
          <div className="rounded-2xl border border-[var(--arcns-cyan)]/30 bg-[rgba(0,212,255,0.06)] p-4">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--arcns-cyan)]">Final review</p><p className="mt-2 text-lg font-bold text-white">{review.displayAmount} {selectedAsset.symbol}</p><p className="mt-1 text-sm text-[var(--arcns-text-secondary)]">to {review.recipient.resolvedName ?? shortAddress(review.recipient.address)}</p><p className="mt-2 break-all font-mono text-[11px] text-[var(--arcns-text-muted)]">{review.recipient.address}</p></div><button type="button" onClick={() => setReview(null)} className="text-sm text-[var(--arcns-text-muted)] hover:text-white">Edit</button></div>
            <button type="button" onClick={confirmTransfer} disabled={busy === "send"} className="mt-4 min-h-12 w-full rounded-xl bg-[var(--arcns-gradient-primary)] px-5 font-bold text-white shadow-[0_14px_40px_rgba(0,174,255,0.20)] disabled:opacity-50">{busy === "send" ? "Waiting for confirmation..." : "Confirm in wallet"}</button>
          </div>
        ) : (
          <button type="button" onClick={prepareReview} className="min-h-14 w-full rounded-2xl bg-[var(--arcns-gradient-primary)] px-5 text-base font-bold text-white shadow-[0_16px_46px_rgba(0,174,255,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_54px_rgba(0,174,255,0.30)]">{isConnected ? "Review transfer" : "Connect wallet in the header"}</button>
        )}

        {txHash ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm text-emerald-200">Transfer confirmed. <a className="font-semibold underline underline-offset-4" href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></div> : null}

        <div className="flex items-start gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-[var(--arcns-text-muted)]"><span aria-hidden="true" className="mt-0.5 text-[var(--arcns-cyan)]">◇</span><p>Always verify the resolved address in the review step. Transfers are irreversible. Custom tokens are read directly from the contract and are not verified or endorsed by ArcNS.</p></div>
      </div>
    </section>
  );
}
