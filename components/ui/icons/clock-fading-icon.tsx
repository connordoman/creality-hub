import { cn } from "@/lib/utils";
import { LucideProps } from "lucide-react";

export function ClockFadingIcon({ className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "lucide lucide-clock-fading-icon lucide-clock-fading",
        className
      )}
      {...props}
    >
      <path d="M12 2a10 10 0 0 1 7.38 16.75" />
      <path d="M12 6v6l4 2" />
      <path d="M8.644 21.42a10 10 0 0 0 7.631-.38" opacity="0.75" />
      <path d="M2.83 16a10 10 0 0 0 2.43 3.4" opacity="0.66" />
      <path d="M2.5 8.875a10 10 0 0 0-.5 3" opacity="0.5" />
      <path d="M4.636 5.235a10 10 0 0 1 .891-.857" opacity="0.4" />
    </svg>
  );
}
