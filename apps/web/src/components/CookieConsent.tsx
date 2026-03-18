"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (consent === null) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
    // Trigger GA load if it's waiting for consent
    window.dispatchEvent(new Event("cookie_consent_changed"));
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-3xl mx-auto rounded-xl border border-neutral-800 bg-neutral-900/95 backdrop-blur-sm px-6 py-4 flex flex-col sm:flex-row items-center gap-4 shadow-2xl">
        <p className="text-sm text-neutral-300 flex-1">
          We use cookies for analytics to improve our service.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
