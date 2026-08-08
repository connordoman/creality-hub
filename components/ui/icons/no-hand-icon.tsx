import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { HandIcon } from "lucide-react";

const handIconVariants = cva("inline-block", {
  variants: {
    size: {
      default: "size-4",
      sm: "size-3",
      lg: "size-5",
      icon: "size-6",
    },
  },
});

interface NoHandIconProps
  extends Omit<React.ComponentProps<typeof HandIcon>, "size">,
    VariantProps<typeof handIconVariants> {
  slashed?: boolean;
  slashedColor?: string;
}

export function NoHandIcon({
  className,
  slashed = false,
  slashedColor = "blue",
  size = "default",
  ...props
}: NoHandIconProps) {
  const handIconClasses = handIconVariants({ size });
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center aspect-square",
        className
      )}
    >
      <HandIcon className={cn(handIconClasses)} strokeWidth={1.25} {...props} />
      <span
        data-slashed={slashed}
        className={cn(
          "absolute top-1/10 left-1/10 data-[slashed=true]:scale-x-100 scale-x-0 origin-left w-[125%] h-1/15 transition-all duration-300 ease-in-out rotate-45 shadow"
        )}
        style={{
          backgroundColor: slashedColor,
        }}
      />
    </span>
  );
}
