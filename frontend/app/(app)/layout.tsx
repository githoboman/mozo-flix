import { DataProvider } from "@/lib/DataProvider";

/**
 * App route-group layout.
 *
 * Everything that needs on-chain state (browse, watch, studio, dashboard,
 * etc.) lives under this layout so DataProvider's eager listVideos fetch
 * runs only when the user actually enters the app. Marketing visitors on
 * "/" never trigger it.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DataProvider>{children}</DataProvider>;
}
