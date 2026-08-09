"use client";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ButtonGroup } from "./button-group";

interface ValueToggleProps<T extends string | number> {
  items: T[];
  value: T;
  unit: string;
  className?: string;
  onChange: (value: T) => void;
}

export function ValueToggle<T extends string | number>({
  items,
  value,
  unit,
  className,
  onChange,
}: ValueToggleProps<T>) {
  return (
    <ButtonGroup className={cn("flex justify-stretch w-full", className)}>
      {items.map((item, index) => (
        <Button
          key={`${item}-${index}`}
          size="xs"
          variant="outline"
          disabled={value === item}
          className="flex-1"
          onClick={() => onChange(item)}
        >
          {`${item} ${unit}`}
        </Button>
      ))}
    </ButtonGroup>
  );
}
