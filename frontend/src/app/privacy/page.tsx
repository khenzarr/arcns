import type { Metadata } from "next";
import LegalPage, {
  CIRCLE_NAMESPACE_NOTICE,
  INDEPENDENT_PROJECT_NOTICE,
  SERVICE_STATUS_NOTICE,
} from "../../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy information for the independent FlashNames application.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "https://flashnames.space/privacy",
    title: "Privacy Policy | FlashNames",
    description: "Privacy information for the independent FlashNames application.",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | FlashNames",
    description: "Privacy information for the independent FlashNames application.",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This policy explains the information involved when you use the public FlashNames application. Public blockchain activity is inherently visible and should not be treated as private."
      sections={[
        {
          title: "Current service status",
          content: <p>{SERVICE_STATUS_NOTICE}</p>,
        },
        {
          title: "Information processed",
          content: (
            <p>
              The app may process wallet addresses, name-search input, network information, and transaction data
              needed to display and submit interactions. Wallet and name records written onchain are public data
              and may be indexed or retained by independent infrastructure providers.
            </p>
          ),
        },
        {
          title: "Infrastructure and third parties",
          content: (
            <p>
              The app may rely on wallet providers, RPC endpoints, indexers, hosting services, and public blockchain
              explorers. Those independent services may process technical data under their own policies. FlashNames
              does not control or guarantee third-party infrastructure availability.
            </p>
          ),
        },
        {
          title: "No financial or legal promise",
          content: (
            <p>
              This policy does not create a financial guarantee, legal representation, fiduciary relationship, or
              promise concerning the value, permanence, availability, or portability of any name.
            </p>
          ),
        },
        {
          title: "Independent project notice",
          content: (
            <>
              <p>{INDEPENDENT_PROJECT_NOTICE}</p>
              <p>{CIRCLE_NAMESPACE_NOTICE}</p>
            </>
          ),
        },
      ]}
    />
  );
}
