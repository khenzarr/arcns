import type { Metadata } from "next";
import LegalPage, {
  CIRCLE_NAMESPACE_NOTICE,
  INDEPENDENT_PROJECT_NOTICE,
  TESTNET_STATUS_NOTICE,
} from "../../components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy | ArcNS" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This policy explains the information involved when you use the public ArcNS testnet app. Public blockchain activity is inherently visible and should not be treated as private."
      sections={[
        {
          title: "Current service status",
          content: <p>{TESTNET_STATUS_NOTICE}</p>,
        },
        {
          title: "Information processed",
          content: (
            <p>
              The app may process wallet addresses, name-search input, network information, and transaction data
              needed to display and submit testnet interactions. Wallet and name records written to Arc Testnet
              are public blockchain data and may be indexed or retained by independent infrastructure providers.
            </p>
          ),
        },
        {
          title: "Infrastructure and third parties",
          content: (
            <p>
              The app may rely on wallet providers, RPC endpoints, indexers, hosting services, and public blockchain
              explorers. Those independent services may process technical data under their own policies. ArcNS
              makes no promise that testnet infrastructure will remain available or that a mainnet service will launch.
            </p>
          ),
        },
        {
          title: "No financial or legal promise",
          content: (
            <p>
              This policy does not create a financial guarantee, legal representation, fiduciary relationship, or
              promise concerning the value, permanence, availability, or future portability of any testnet name.
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