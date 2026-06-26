"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const PROMPT_DELAY_MS = 60_000;

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
  const deferredPromptRef = useRef(deferredPrompt);
  const shownRef = useRef(false);

  useEffect(() => {
    deferredPromptRef.current = deferredPrompt;
  }, [deferredPrompt]);

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

  useEffect(() => {
    if (shownRef.current || isStandalone || dismissed) {
      return;
    }

    if (!deferredPrompt && !isIOS) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (shownRef.current || isStandalone || dismissed) {
        return;
      }

      if (!deferredPromptRef.current && !isIOS) {
        return;
      }

      shownRef.current = true;

      toast.custom(
        (toastId) => (
          <div className="flex w-full max-w-md items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Download className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium">Install Creality Hub</p>
              {isIOS ? (
                <p className="text-sm text-muted-foreground">
                  Tap <Share className="mr-1 inline size-3" /> Share, then
                  &ldquo;Add to Home Screen&rdquo; to install this app.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add this dashboard to your home screen for quick access.
                </p>
              )}
              <div className="flex gap-2">
                {!isIOS && deferredPromptRef.current ? (
                  <Button
                    size="sm"
                    onClick={async () => {
                      const prompt = deferredPromptRef.current;
                      if (!prompt) {
                        return;
                      }

                      await prompt.prompt();
                      await prompt.userChoice;
                      setDeferredPrompt(null);
                      setDismissed(true);
                      toast.dismiss(toastId);
                    }}
                  >
                    Install
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDismissed(true);
                    toast.dismiss(toastId);
                  }}
                >
                  Not now
                </Button>
              </div>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                setDismissed(true);
                toast.dismiss(toastId);
              }}
              aria-label="Dismiss install prompt"
            >
              <X className="size-4" />
            </Button>
          </div>
        ),
        {
          duration: Infinity,
          dismissible: true,
          onDismiss: () => setDismissed(true),
        }
      );
    }, PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isStandalone, dismissed, deferredPrompt, isIOS]);

  return null;
}
