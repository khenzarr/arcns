import type { Metadata } from "next";
import LegalPage, {
  CIRCLE_NAMESPACE_NOTICE,
  INDEPENDENT_PROJECT_NOTICE,
  REGISTRATION_NOTICE,
  TESTNET_STATUS_NOTICE,
} from "../../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Testnet-only terms for using the independent ArcNS public app.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "https://arcname.services/terms",
    title: "Terms of Use | ArcNS",
    description: "Testnet-only terms for using the independent ArcNS public app.",
  },
  twitter: {
    card: "summary",
    title: "Terms of Use | ArcNS",
    description: "Testnet-only terms for using the independent ArcNS public app.",
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      summary="These terms describe the limited, testnet-only basis on which ArcNS is currently made available. They are informational project terms and are not legal advice."
      sections={[
        {
          title: "Testnet service and launch status",
          content: <p>{TESTNET_STATUS_NOTICE}</p>,
        },
        {
          title: "No promises or professional advice",
          content: (
            <p>
              ArcNS is provided on an experimental, as-is, and as-available basis. Nothing in the app or
              documentation is a promise of mainnet or public launch, financial return, continued availability,
              legal outcome, or fitness for a particular purpose. ArcNS does not provide financial, investment,
              tax, or legal advice.
            </p>
          ),
        },
        {
          title: "Name registration and renewal",
          content: (
            <>
              <p>{REGISTRATION_NOTICE}</p>
              <p>
                Users are responsible for checking the selected registration period, applicable expiry date,
                renewal status, wallet transactions, and testnet conditions. Testnet names and records may not
                carry over to any future deployment.
              </p>
            </>
          ),
        },
        {
          title: "Independent project and trademarks",
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