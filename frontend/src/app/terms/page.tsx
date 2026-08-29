import type { Metadata } from "next";
import LegalPage, {
  CIRCLE_NAMESPACE_NOTICE,
  INDEPENDENT_PROJECT_NOTICE,
  REGISTRATION_NOTICE,
  SERVICE_STATUS_NOTICE,
} from "../../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using the independent FlashNames application and protocol interfaces.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "https://flashnames.space/terms",
    title: "Terms of Use | FlashNames",
    description: "Terms for using the independent FlashNames application and protocol interfaces.",
  },
  twitter: {
    card: "summary",
    title: "Terms of Use | FlashNames",
    description: "Terms for using the independent FlashNames application and protocol interfaces.",
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      summary="These terms describe the basis on which the FlashNames application and protocol interfaces are made available. They are informational project terms and are not legal advice."
      sections={[
        {
          title: "Service and network status",
          content: <p>{SERVICE_STATUS_NOTICE}</p>,
        },
        {
          title: "No promises or professional advice",
          content: (
            <p>
              FlashNames is provided on an as-is and as-available basis. Nothing in the app or documentation is a
              promise of financial return, uninterrupted availability, legal outcome, or fitness for a particular
              purpose. FlashNames does not provide financial, investment,
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
                renewal status, destination addresses, wallet transactions, and current network conditions.
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
