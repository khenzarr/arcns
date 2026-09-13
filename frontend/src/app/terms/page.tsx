import type { Metadata } from "next";
import LegalPage, {
  CIRCLE_NAMESPACE_NOTICE,
  INDEPENDENT_PROJECT_NOTICE,
  REGISTRATION_NOTICE,
  NETWORK_STATUS_NOTICE,
} from "../../components/LegalPage";
import { NETWORK_DISPLAY } from "../../lib/networkDisplay";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms for using the independent ArcNS app on ${NETWORK_DISPLAY.networkDisplayName}.`,
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "https://arcname.services/terms",
    title: "Terms of Use | ArcNS",
    description: `Terms for using the independent ArcNS app on ${NETWORK_DISPLAY.networkDisplayName}.`,
  },
  twitter: {
    card: "summary",
    title: "Terms of Use | ArcNS",
    description: `Terms for using the independent ArcNS app on ${NETWORK_DISPLAY.networkDisplayName}.`,
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      summary={`These terms describe the basis on which the independent ArcNS app is made available on ${NETWORK_DISPLAY.networkDisplayName}. They are informational project terms and are not legal advice.`}
      sections={[
        {
          title: "Network and service status",
          content: <p>{NETWORK_STATUS_NOTICE}</p>,
        },
        {
          title: "No promises or professional advice",
          content: (
            <p>
              ArcNS is provided on an experimental, as-is, and as-available basis. Nothing in the app or
              documentation is a promise of financial return, continued availability,
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
                renewal status, wallet transactions, and network conditions. Records created in a different deployment do not automatically transfer to Arc mainnet.
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
