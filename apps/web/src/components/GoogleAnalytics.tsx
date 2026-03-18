"use client";

import Script from "next/script";
import { useState, useEffect } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX";

export default function GoogleAnalytics() {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      setConsentGiven(localStorage.getItem("cookie_consent") === "accepted");
    };

    checkConsent();
    window.addEventListener("cookie_consent_changed", checkConsent);
    return () => window.removeEventListener("cookie_consent_changed", checkConsent);
  }, []);

  if (!consentGiven || GA_ID === "G-XXXXXXXXXX") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
