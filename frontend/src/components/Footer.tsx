import Image from "next/image";
import Link from "next/link";

type FooterLinkItem = {
  label: string;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  note?: string;
};

type FooterSection = {
  title: string;
  links: FooterLinkItem[];
};

const GITHUB_REPO = "https://github.com/khenzarr/arcns";

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "ArcNS",
    links: [
      { label: "Search Names", href: "/" },
      { label: "My Domains", href: "/my-domains" },
      { label: "Resolve", href: "/resolve" },
      { label: "Official Domain", href: "https://arcname.services", external: true },
      { label: "GitHub", href: GITHUB_REPO, external: true },
    ],
  },
  {
    title: "Protocol",
    links: [
      {
        label: "Deployed Contracts",
        href: `${GITHUB_REPO}/blob/master/docs/final/DEPLOYED_ADDRESSES.md`,
        external: true,
      },
      {
        label: "Indexing Status",
        href: `${GITHUB_REPO}/blob/master/docs/final/SUBGRAPH_GUIDE.md`,
        external: true,
      },
      {
        label: "Mainnet Gap Report",
        href: `${GITHUB_REPO}/blob/master/docs/final/MAINNET_GAP_REPORT.md`,
        external: true,
      },
      {
        label: "Security / Audit Status",
        href: `${GITHUB_REPO}/blob/master/docs/final/AUDIT_SCOPE.md`,
        external: true,
      },
      {
        label: "Goldsky Integration",
        href: `${GITHUB_REPO}/blob/master/docs/integration/GOLDSKY_PHASE3_FINAL_SYNC_PARITY_REPORT.md`,
        external: true,
      },
    ],
  },
  {
    title: "Developers",
    links: [
      {
        label: "Resolver API",
        href: `${GITHUB_REPO}/blob/master/docs/integration/public-adapter-api.md`,
        external: true,
      },
      {
        label: "Integration Docs",
        href: `${GITHUB_REPO}/tree/master/docs/integration`,
        external: true,
      },
      {
        label: "Public Adapter",
        href: `${GITHUB_REPO}/blob/master/docs/integration/TIER2_PUBLIC_ADAPTER_STATUS.md`,
        external: true,
      },
      {
        label: "Wallet Integration",
        href: `${GITHUB_REPO}/blob/master/docs/integration/wallet-integration-package.md`,
        external: true,
      },
      {
        label: "BENS / Blockscout Roadmap",
        href: `${GITHUB_REPO}/blob/master/docs/integration/GOLDSKY_ARCNS_INTEGRATION_PLAN.md`,
        external: true,
      },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "X / Twitter", href: "https://x.com/arc_name", external: true },
      { label: "Feedback", href: `${GITHUB_REPO}/issues`, external: true },
      {
        label: "Grant Updates",
        href: `${GITHUB_REPO}/blob/master/docs/grants/CIRCLE_GRANT_README.md`,
        external: true,
      },
      {
        label: "Ecosystem",
        href: `${GITHUB_REPO}/blob/master/docs/integration/ECOSYSTEM_INTEGRATION_STATUS.md`,
        external: true,
      },
    ],
  },
  {
    title: "Legal / Brand",
    links: [
      { label: "Privacy Policy", disabled: true, note: "Coming soon" },
      { label: "Terms of Use", disabled: true, note: "Coming soon" },
      { label: "Trademark Guidelines", disabled: true, note: "Coming soon" },
      { label: "Brand Kit", disabled: true, note: "Coming soon" },
    ],
  },
];

function FooterLink({ item }: { item: FooterLinkItem }) {
  const className =
    "group inline-flex items-center gap-2 text-sm text-[var(--arcns-text-secondary)] transition hover:text-[var(--arcns-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--arcns-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050A18]";

  if (item.disabled || !item.href) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-[var(--arcns-text-disabled)]">
        <span>{item.label}</span>
        {item.note ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--arcns-text-muted)]">
            {item.note}
          </span>
        ) : null}
      </span>
    );
  }

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        <span>{item.label}</span>
        <span
          aria-hidden="true"
          className="text-[11px] text-[var(--arcns-text-muted)] transition group-hover:text-[var(--arcns-cyan)]"
        >
          ↗
        </span>
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#050A18]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--arcns-cyan)]/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.22),transparent_62%)] opacity-80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(37,99,255,0.14),transparent_24%),radial-gradient(circle_at_86%_12%,rgba(0,212,255,0.11),transparent_22%)]"
      />

      <div className="relative mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="arcns-glass relative overflow-hidden rounded-[28px] border border-[var(--arcns-border-default)] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-7 sm:py-8 lg:px-8 lg:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(0,212,255,0.08),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(37,99,255,0.12),transparent_28%)]"
          />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)] xl:gap-10">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[var(--arcns-border-strong)] bg-[linear-gradient(180deg,rgba(11,18,36,0.92),rgba(8,14,31,0.82))] shadow-[0_0_30px_rgba(0,212,255,0.14)]">
                  <Image
                    src="/arcns/arcns-emblem.svg"
                    alt="ArcNS emblem"
                    fill
                    sizes="56px"
                    className="object-contain p-2"
                  />
                </div>
                <div>
                  <p className="font-space-grotesk text-2xl font-bold tracking-[-0.04em] text-[var(--arcns-text-primary)]">
                    ArcNS
                  </p>
                  <p className="text-sm text-[var(--arcns-text-secondary)]">
                    Human-readable identity for Arc.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--arcns-text-secondary)]">
                  USDC-powered registrations
                </span>
              </div>

              <div className="space-y-2 text-sm leading-6 text-[var(--arcns-text-secondary)]">
                <p>Live on Arc Testnet · Pre-mainnet · External audit pending</p>
                <p className="max-w-xl text-[13px] text-[var(--arcns-text-muted)]">
                  ArcNS is an Arc Testnet naming and identity protocol. Mainnet deployment is gated on
                  security review and operational hardening.
                </p>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-6">
              {FOOTER_SECTIONS.map(section => (
                <section key={section.title} className="min-w-0">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--arcns-text-muted)]">
                    {section.title}
                  </h2>
                  <ul className="space-y-3">
                    {section.links.map(item => (
                      <li key={item.label}>
                        <FooterLink item={item} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}