import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConnectionBadgeProps {
  connected: boolean;
}

export function ConnectionBadge({ connected }: ConnectionBadgeProps) {
  return (
    <Badge
      variant={connected ? "default" : "destructive"}
      className={cn("gap-2 uppercase tracking-wide")}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          connected ? "bg-primary-foreground animate-pulse" : "bg-destructive",
        )}
      />
      {connected ? "Connected" : "Disconnected"}
    </Badge>
  );
}
