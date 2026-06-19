"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
    );
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  if (!deferredPrompt && !isIOS) {
    return null;
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border border-border bg-card p-4 shadow-lg sm:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium">Install Creality Hub</p>
          {isIOS ? (
            <p className="text-sm text-muted-foreground">
              Tap <Share className="inline size-3 mr-1" /> Share, then
              &ldquo;Add to Home Screen&rdquo; to install this app.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add this dashboard to your home screen for quick access.
            </p>
          )}
          <div className="flex gap-2">
            {!isIOS && deferredPrompt ? (
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
            >
              Not now
            </Button>
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          className="shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install prompt"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
