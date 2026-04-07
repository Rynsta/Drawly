"use client";

import { cn } from "@/lib/cn";
import { hapticLight } from "@/lib/haptics";
import { sfxClick } from "@/lib/sfx";

type Variant = "primary" | "secondary" | "ghost" | "discord";

export function Button({
  className,
  variant = "primary",
  children,
  onClick,
  disabled,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-glow hover:brightness-110",
        variant === "secondary" &&
          "border border-glass-border bg-white/5 text-zinc-100 hover:bg-white/10",
        variant === "ghost" && "text-zinc-300 hover:bg-white/5 hover:text-white",
        variant === "discord" &&
          "bg-[#5865F2] text-white hover:brightness-110",
        className,
      )}
      onClick={(e) => {
        if (!disabled) {
          hapticLight();
          sfxClick();
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
