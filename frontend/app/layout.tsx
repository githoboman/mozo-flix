import type { Metadata } from "next";
import { Bebas_Neue, Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});
const syne = Syne({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});
const dmSans = DM_Sans({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MOZOflix — Watch. Earn. Own.",
  description:
    "The first decentralised watch-to-earn video platform on Stacks. Your attention has value — it's time you got paid for it.",
  // Site-verification tags. `other` renders as raw <meta name="..." content="..." />
  // in the document head. Keep entries here rather than sprinkled through
  // components so the head stays predictable.
  other: {
    "ory-verify": "orynth-e8dc7b27439948e98a9f66626f9c5976",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${syne.variable} ${dmSans.variable} dark`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="bg-bg text-white noise-bg">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
