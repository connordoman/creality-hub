import { cn } from "@/lib/utils";
import { LucideProps } from "lucide-react";

export function HotSurfaceIcon({ className, ...props }: LucideProps) {
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
        "lucide lucide-hot-surface-icon lucide-hot-surface",
        className
      )}
      {...props}
    >
      <path d="M 3,21 H 21" />
      <path d="m 5.8008574,3.021415 c 0,0 -1.7794425,1.9652527 -1.7794425,3.4892926 0,1.52404 1.7794425,3.4892924 1.7794425,3.4892924 0,0 1.9777277,1.918878 1.9777277,3.489293 0,1.570414 -1.9777277,3.489292 -1.9777277,3.489292" />
      <path d="m 11.800858,3.021415 c 0,0 -1.779443,1.9652527 -1.779443,3.4892926 0,1.52404 1.779443,3.4892924 1.779443,3.4892924 0,0 1.977728,1.918878 1.977728,3.489293 0,1.570414 -1.977728,3.489292 -1.977728,3.489292" />
      <path d="m 17.800857,3.021415 c 0,0 -1.779442,1.9652527 -1.779442,3.4892926 0,1.52404 1.779442,3.4892924 1.779442,3.4892924 0,0 1.977728,1.918878 1.977728,3.489293 0,1.570414 -1.977728,3.489292 -1.977728,3.489292" />
    </svg>
  );
}
