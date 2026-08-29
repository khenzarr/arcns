import SendAssetPanel from "../../components/send/SendAssetPanel";

export default function SendPage() {
  return (
    <main className="relative min-h-[calc(100vh-64px)] overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_5%,rgba(37,99,255,0.20),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(0,212,255,0.12),transparent_24%),linear-gradient(180deg,#050a18_0%,#070d1e_54%,#050a18_100%)]" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-[1180px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <section className="pt-4 lg:sticky lg:top-28">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--arcns-cyan)]">FlashNames payments utility</p>
          <h1 className="max-w-xl font-space-grotesk text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-white sm:text-6xl">
            Send to a name,<br /><span className="arcns-gradient-text">not a hex string.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--arcns-text-secondary)]">
            Transfer assets from your connected wallet to any valid address, <code>.arc</code> name, or <code>.circle</code> name. FlashNames resolves the receiving address before your wallet asks you to sign.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["01", "Resolve", "See the exact destination behind every FlashNames name."],
              ["02", "Review", "Check token, amount, balance, and final address."],
              ["03", "Send", "Your wallet signs a direct onchain ERC-20 transfer."],
            ].map(([step, title, body]) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3"><span className="text-xs font-bold text-[var(--arcns-cyan)]">{step}</span><strong className="text-white">{title}</strong></div>
                <p className="mt-2 text-sm leading-6 text-[var(--arcns-text-muted)]">{body}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-lg text-xs leading-5 text-[var(--arcns-text-muted)]">
            FlashNames never takes custody and does not route funds through a FlashNames contract. Circle asset names and contract addresses are shown for discovery; this independent interface is not Circle-sponsored or endorsed.
          </p>
        </section>

        <SendAssetPanel />
      </div>
    </main>
  );
}
