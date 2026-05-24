import { DataProvider } from "@/lib/DataProvider";
import { WalletProvider } from "@/lib/useWallet";
import { TopNav } from "@/components/TopNav";

/**
 * App route-group layout.
 *
 * Hoists TopNav, WalletProvider, and DataProvider out of individual pages so:
 *  - TopNav stops remounting on every navigation (was the main cause of
 *    "every click feels slow" — each remount fired a fresh balance fetch)
 *  - Wallet state is a singleton shared across every component instead of
 *    each useWallet() racing its own getStxBalance call
 *  - The on-chain video cache is shared across browse, watch, studio, etc.
 *
 * Marketing visitors on "/" never load any of this — they stay in the
 * (landing) group which has none of these providers.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider>
      <DataProvider>
        <TopNav />
        {children}
      </DataProvider>
    </WalletProvider>
  );
}
