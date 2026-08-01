import type { Metadata } from "next";
import LegalPage, {
  CIRCLE_NAMESPACE_NOTICE,
  INDEPENDENT_PROJECT_NOTICE,
  TESTNET_STATUS_NOTICE,
} from "../../components/LegalPage";

export const metadata: Metadata = { title: "Trademark / Brand Notice | ArcNS" };

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
          title: ".circle testnet namespace",
          content: <p>{CIRCLE_NAMESPACE_NOTICE}</p>,
        },
        {
          title: "No ownership or endorsement claim",
          content: (
            <p>
              The ArcNS project claims no ownership of the Arc or Circle names, marks, logos, or other brand assets.
              References to Arc Testnet and Circle are descriptive only and do not state or imply partnership,
              approval, endorsement, sponsorship, or official status.
            </p>
          ),
        },
        {
          title: "Testnet status and no promises",
          content: (
            <>
              <p>{TESTNET_STATUS_NOTICE}</p>
              <p>
                Nothing in ArcNS branding is a promise of mainnet launch, financial value, legal right, continued
                availability, or future recognition of a testnet name.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}