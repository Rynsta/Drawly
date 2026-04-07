import { cn } from "@/lib/cn";

export function GlassCard({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass-panel p-6", className)} {...rest}>
      {children}
    </div>
  );
}
