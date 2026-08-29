import type { Metadata } from "next";
import LegalPage, {
  CIRCLE_NAMESPACE_NOTICE,
  INDEPENDENT_PROJECT_NOTICE,
  SERVICE_STATUS_NOTICE,
} from "../../components/LegalPage";

export const metadata: Metadata = {
  title: "Trademark / Brand Notice",
  description: "Brand and trademark notice for the independent FlashNames protocol.",
  alternates: { canonical: "/trademark" },
  openGraph: {
    type: "website",
    url: "https://flashnames.space/trademark",
    title: "Trademark / Brand Notice | FlashNames",
    description: "Brand and trademark notice for the independent FlashNames protocol.",
  },
  twitter: {
    card: "summary",
    title: "Trademark / Brand Notice | FlashNames",
    description: "Brand and trademark notice for the independent FlashNames protocol.",
  },
};

export default function TrademarkPage() {
  return (
    <LegalPage
      title="Trademark / Brand Notice"
      summary="This notice distinguishes the independent FlashNames protocol from third-party Arc and Circle brands and does not grant permission to use any party’s marks."
      sections={[
        {
          title: "Arc and Circle attribution",
          content: <p>{INDEPENDENT_PROJECT_NOTICE}</p>,
        },
        {
          title: ".circle namespace",
          content: <p>{CIRCLE_NAMESPACE_NOTICE}</p>,
        },
        {
          title: "No ownership or endorsement claim",
          content: (
            <p>
              The FlashNames project claims no ownership of the Arc or Circle names, marks, logos, or other brand
              assets. References to Arc and Circle are descriptive only and do not state or imply partnership,
              approval, endorsement, sponsorship, or official status.
            </p>
          ),
        },
        {
          title: "Service status and no promises",
          content: (
            <>
              <p>{SERVICE_STATUS_NOTICE}</p>
              <p>
                Nothing in FlashNames branding is a promise of financial value, legal right, continued availability,
                or perpetual recognition of a name.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
