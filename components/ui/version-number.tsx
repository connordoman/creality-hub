"use client";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useAppVersion } from "@/hooks/use-app-version";
import { Spinner } from "./spinner";

const versionNumberVariants = cva("font-mono px-0 inline-flex items-center", {
  variants: {
    variant: {
      badge: "rounded-full bg-accent",
      muted: "text-muted-foreground px-0",
      default: "",
    },
    size: {
      sm: "text-sm px-1.5 py-px gap-1",
      default: "text-base px-2 py-0.5 gap-1.5",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

interface VersionNumberProps
  extends
    VariantProps<typeof versionNumberVariants>,
    Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  className?: string;
  hideText?: boolean;
}

export function VersionNumber({
  variant = "default",
  size = "default",
  hideText,
  className,
  ...props
}: VersionNumberProps) {
  const versionNumber = useAppVersion();

  return (
    <span
      className={cn(versionNumberVariants({ variant, size, className }))}
      {...props}
    >
      {hideText ? null : "Version "}
      {versionNumber.isLoading ? <Spinner /> : versionNumber.data}
    </span>
  );
}
