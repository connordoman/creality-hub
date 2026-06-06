import { formatDateTime } from "@/lib/time";

interface DateTimeProps extends Omit<React.ComponentProps<"time">, "dateTime"> {
  date: number | null | undefined;
}

export function DateTime({ date, ...props }: DateTimeProps) {
  const formatted = formatDateTime(date);
  return (
    <time dateTime={date ? new Date(date).toISOString() : undefined} {...props}>
      {formatted}
    </time>
  );
}
