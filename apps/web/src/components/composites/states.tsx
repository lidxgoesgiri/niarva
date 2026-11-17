import { CircleAlert, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Empty collection state with one clear next action. */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      data-state="empty"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-elevated/50 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-8 text-ink-muted" />
      <h2 className="text-lg">{title}</h2>
      <p className="max-w-md text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Recoverable error state. The message never contains internal details. */
export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      data-state="error"
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-fail/40 bg-fail/10 px-5 py-4 text-sm",
        className,
      )}
    >
      <p className="flex items-center gap-2 font-medium text-fail">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        {title}
      </p>
      <p className="text-ink">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-raised/70", className)} />;
}
