"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { usePrinterSettings } from "@/context/printer-settings";
import {
  isValidPrinterHost,
  isValidPrinterName,
} from "@/lib/settings/validation";
import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "../ui/input";

export function PrinterSettingsDialog() {
  const { printerHost, printerName, isSaving, saveError, updateSettings } =
    usePrinterSettings();
  const [open, setOpen] = useState(false);
  const [draftHost, setDraftHost] = useState("");
  const [draftName, setDraftName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      setDraftHost(printerHost ?? "");
      setDraftName(printerName ?? "");
      setValidationError(null);
    }
  };

  const handleSave = async () => {
    if (!isValidPrinterName(draftName)) {
      setValidationError("Enter a printer name (1-100 characters)");
      return;
    }

    if (!isValidPrinterHost(draftHost)) {
      setValidationError("Enter a valid IPv4 address or hostname");
      return;
    }

    setValidationError(null);

    try {
      await updateSettings({
        printerHost: draftHost.trim(),
        printerName: draftName.trim(),
      });
      setOpen(false);
    } catch {
      // saveError is surfaced below
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <SettingsIcon data-icon="inline-start" />
            Printer
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Printer settings</DialogTitle>
          <DialogDescription>
            Saved on the server and shared across all devices. Update the name
            or IP address when your printer changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="printer-name">Printer nickname</FieldLabel>
            <Input
              id="printer-name"
              name="printer-name"
              type="text"
              autoComplete="off"
              value={draftName}
              disabled={isSaving}
              placeholder="Creality K1C"
              onChange={(event) => setDraftName(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="printer-host">
              Printer IP or hostname
            </FieldLabel>
            <Input
              id="printer-host"
              name="printer-host"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={draftHost}
              disabled={isSaving}
              placeholder="10.0.0.184"
              onChange={(event) => setDraftHost(event.target.value)}
            />
          </Field>

          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}
          {saveError ? (
            <p className="text-sm text-destructive">{saveError.message}</p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={isSaving} />}
          >
            Cancel
          </DialogClose>
          <Button disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
