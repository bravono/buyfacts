import React from "react";
import { SubAppContainer } from "@/components/common/SubAppContainer";

export const metadata = {
  title: "BuyFacts Research Lib",
  description: "Interactive storytelling, guided tours, and survey participation app.",
};

export default function NarrativePage() {
  return (
    <main
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        zIndex: 50,
      }}
    >
      <SubAppContainer
        appName="narrative"
        appUrl="/narrative-app/index.html"
        title="Research Lib"
        className="!rounded-none !min-h-0 !h-full !w-full !shadow-none !border-none"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 0,
          border: "none",
          boxShadow: "none",
          backgroundColor: "#ffffff",
        }}
        iframeStyle={{
          width: "100%",
          height: "100%",
          minHeight: "100%",
          border: "none",
          display: "block",
          backgroundColor: "#ffffff",
        }}
      />
    </main>
  );
}

