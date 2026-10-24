"use client";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ButtonGroup } from "./button-group";

interface ValueToggleProps<T extends string | number> {
  items: T[] | readonly T[];
  value: T | undefined;
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
          data-active={value === item}
          disabled={value === item}
          className={cn(
            "flex-1 data-active:disabled:opacity-100 data-active:border-primary/30! data-active:bg-primary/80!",
          )}
          onClick={() => onChange(item)}
        >
          {`${item} ${unit}`}
        </Button>
      ))}
    </ButtonGroup>
  );
}
