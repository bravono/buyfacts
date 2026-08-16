import React from "react";
import { SubAppContainer } from "@/components/common/SubAppContainer";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "BuyFacts Research Lib",
  description: "Interactive storytelling, guided tours, and survey participation app.",
};

export default function NarrativePage() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Narrative Research Module
          </h1>
          <p className="text-slate-400 text-sm">
            Interactive research, survey participation, and guided learning experiences powered by the Narrative micro-frontend.
          </p>
        </header>

        <div className="flex-1 w-full min-h-[700px]">
          <SubAppContainer
            appName="narrative"
            appUrl="/narrative-app/index.html"
            title="Research Lib"
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
