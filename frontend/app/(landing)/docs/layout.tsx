import { LandingNav } from "@/components/landing/LandingNav";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { LandingFooter } from "@/components/landing/Footer";

/**
 * Docs shell. Uses the marketing chrome (LandingNav + Footer) rather than
 * the app TopNav — docs are meant to be readable without a wallet.
 * Layout is a two-column grid on md+: fixed sidebar + fluid prose column.
 */
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LandingNav />
      <main className="mx-auto max-w-[1200px] px-4 pt-[100px] pb-16 sm:px-6 md:px-10 md:pt-[120px]">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr] md:gap-12">
          <aside className="md:sticky md:top-[100px] md:h-fit md:self-start">
            <DocsSidebar />
          </aside>
          <article className="min-w-0">{children}</article>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
