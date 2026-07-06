import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuyFacts® | B2B Research Methods, Tools & Return on Effort Framework",
  description: "BuyFacts® is a professional framework of B2B research methods and tools designed to help organizations recognize market movement early, reduce uncertainty, and maximize Return on Effort.",
  keywords: ["BuyFacts", "B2B Research", "Cubicon", "TRIAD", "Research Tools", "Survey Hosting", "Rule of Three", "Value Quantification", "Return on Effort", "Market Insights"],
  authors: [{ name: "BuyFacts Team" }],
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
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
