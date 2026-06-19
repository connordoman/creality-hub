"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { startTransition, useOptimistic } from "react";
import { Lightbulb } from "./lightbulb";
import { FieldLabel } from "../ui/field";
import { Label } from "../ui/label";

interface ChamberLightProps {
  isOn: boolean;
  pending?: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ChamberLight({
  isOn,
  pending = false,
  disabled = false,
  onToggle,
}: ChamberLightProps) {
  const [displayOn, setDisplayOn] = useOptimistic(
    isOn,
    (_current, next: boolean) => next
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb on={displayOn} className="size-4" />
          Chamber Light
        </CardTitle>
        <CardDescription>Toggle the built-in chamber LED</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <Label className="w-full flex items-center justify-between cursor-pointer">
          <span className="text-sm text-muted-foreground">
            {displayOn ? "On" : "Off"}
          </span>
          <Switch
            checked={displayOn}
            size="lg"
            disabled={disabled || pending}
            onCheckedChange={(checked) => {
              startTransition(() => {
                setDisplayOn(checked);
              });
              onToggle(checked);
            }}
          />
        </Label>
      </CardContent>
    </Card>
  );
}
