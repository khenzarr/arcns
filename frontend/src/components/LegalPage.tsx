import Link from "next/link";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export const INDEPENDENT_PROJECT_NOTICE =
  "ArcNS is an independent name service built on Arc Testnet. ArcNS is not affiliated with, endorsed by, or sponsored by Circle unless separately agreed in writing. Arc is a trademark of Circle Internet Group, Inc. and/or its affiliates.";

export const CIRCLE_NAMESPACE_NOTICE =
  "`.circle` is an ArcNS testnet namespace and does not imply Circle endorsement, sponsorship, affiliation, or ownership.";

export const REGISTRATION_NOTICE =
  "Names are ERC-721 NFTs with registration periods and renewal requirements. Registration expires unless renewed before the applicable expiry date.";

export const TESTNET_STATUS_NOTICE =
  "ArcNS is live on Arc Testnet for testing and demonstration. Mainnet deployment is gated on external audit, mainnet USDC configuration, operational hardening, and final legal/brand review.";

export default function LegalPage({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <article className="arcns-glass rounded-[28px] border border-[var(--arcns-border-default)] px-6 py-8 text-[var(--arcns-text-secondary)] shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:px-10 sm:py-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--arcns-cyan)]">
          Legal / Brand
        </p>
        <h1 className="font-space-grotesk text-3xl font-bold tracking-[-0.04em] text-[var(--arcns-text-primary)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 leading-7">{summary}</p>
        <p className="mt-3 text-sm text-[var(--arcns-text-muted)]">Last updated: August 1, 2026</p>

        <div className="mt-10 space-y-9">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="font-space-grotesk text-xl font-semibold text-[var(--arcns-text-primary)]">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 leading-7">{section.content}</div>
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm">
          <Link className="text-[var(--arcns-cyan)] hover:underline" href="/">
            Return to ArcNS
          </Link>
        </div>
      </article>
    </div>
  );
}