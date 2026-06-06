import { cn } from "@/lib/utils";
import { LightbulbIcon, LightbulbOffIcon, LucideProps } from "lucide-react";

interface LightbulbProps extends LucideProps {
  on?: boolean;
}

export function Lightbulb({ on, className, ...props }: LightbulbProps) {
  if (on) {
    return (
      <LightbulbIcon {...props} className={cn("text-yellow-300", className)} />
    );
  }

  return (
    <LightbulbOffIcon
      {...props}
      className={cn("text-muted-foreground", className)}
    />
  );
}
