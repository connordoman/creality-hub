"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Lightbulb } from "./lightbulb";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb on={isOn} className="size-4" />
          Chamber Light
        </CardTitle>
        <CardDescription>Toggle the built-in chamber LED</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {isOn ? "On" : "Off"}
        </span>
        <Switch
          checked={isOn}
          disabled={disabled || pending}
          onCheckedChange={(checked) => onToggle(checked)}
        />
      </CardContent>
    </Card>
  );
}
