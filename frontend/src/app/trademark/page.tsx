import type { Metadata } from "next";
import LegalPage, {
  CIRCLE_NAMESPACE_NOTICE,
  INDEPENDENT_PROJECT_NOTICE,
  NETWORK_STATUS_NOTICE,
} from "../../components/LegalPage";
import { IS_MAINNET_UI, NETWORK_DISPLAY } from "../../lib/networkDisplay";

export const metadata: Metadata = {
  title: "Trademark / Brand Notice",
  description: `Brand and trademark notice for the independent ArcNS protocol built on ${NETWORK_DISPLAY.networkDisplayName}.`,
  alternates: { canonical: "/trademark" },
  openGraph: {
    type: "website",
    url: "https://arcname.services/trademark",
    title: "Trademark / Brand Notice | ArcNS",
    description: `Brand and trademark notice for the independent ArcNS protocol built on ${NETWORK_DISPLAY.networkDisplayName}.`,
  },
  twitter: {
    card: "summary",
    title: "Trademark / Brand Notice | ArcNS",
    description: `Brand and trademark notice for the independent ArcNS protocol built on ${NETWORK_DISPLAY.networkDisplayName}.`,
  },
};

export default function TrademarkPage() {
  return (
    <LegalPage
      title="Trademark / Brand Notice"
      summary="This notice distinguishes the independent ArcNS project from third-party Arc and Circle brands and does not grant permission to use any party’s marks."
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
              The ArcNS project claims no ownership of the Arc or Circle names, marks, logos, or other brand assets.
              References to Arc and Circle are descriptive only and do not state or imply partnership,
              approval, endorsement, sponsorship, or official status.
            </p>
          ),
        },
        {
          title: IS_MAINNET_UI ? "Network and user responsibility" : "Testnet status and no promises",
          content: (
            <>
              <p>{NETWORK_STATUS_NOTICE}</p>
              <p>
                Nothing in ArcNS branding is a promise of financial value, legal rights, uninterrupted availability,
                or official recognition by Circle or the Arc team.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
