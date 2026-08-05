import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import BorderFrame from "@/components/BorderFrame";

export const metadata: Metadata = {
  title: "BuyFacts® | B2B Research Methods, Tools & Return on Effort Framework",
  description: "BuyFacts® is a professional framework of B2B research methods and tools designed to help organizations recognize market movement early, reduce uncertainty, and maximize Return on Effort.",
  keywords: ["BuyFacts", "B2B Research", "Cubicon", "TRIAD", "Research Tools", "Survey Hosting", "Rule of Three", "Value Quantification", "Return on Effort", "Market Insights"],
  authors: [{ name: "BuyFacts Team" }],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "BuyFacts® | B2B Research Methods, Tools & Return on Effort",
    description: "Recognize meaningful movement earlier, reduce uncertainty, and improve Return on Effort through faster, easier, and better research.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="apollo-tracker"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,o.onload=function(){window.trackingFunctions.onLoad({appId:"6a6cb0a231116f00207872d3"})},document.head.appendChild(o)}initApollo();`,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <BorderFrame />
        {children}
      </body>
    </html>
  );
}

