/**
 * Landing route-group layout.
 *
 * Deliberately minimal: no DataProvider, no contract reads on mount, no
 * toast provider. Marketing visitors load the page without paying for any
 * Stacks RPC traffic. Wallet-connection and on-chain state only spin up
 * when the user navigates into the (app) group.
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
