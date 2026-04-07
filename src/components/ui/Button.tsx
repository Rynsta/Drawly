"use client";

import { cn } from "@/lib/cn";
import { hapticLight } from "@/lib/haptics";
import { sfxClick } from "@/lib/sfx";

type Variant = "primary" | "secondary" | "ghost" | "discord" | "danger";

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
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "bg-gradient-to-r from-blue-500 via-pink-500 to-orange-400 text-white shadow-[0_4px_20px_-4px_rgba(96,165,250,0.5)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-4px_rgba(96,165,250,0.6)] hover:brightness-110 active:translate-y-0",
        variant === "secondary" &&
          "border border-white/15 bg-white/[0.07] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-white/25 hover:bg-white/[0.12] hover:text-white",
        variant === "ghost" &&
          "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
        variant === "discord" &&
          "bg-[#5865F2] text-white shadow-[0_4px_16px_-4px_rgba(88,101,242,0.5)] hover:brightness-110",
        variant === "danger" &&
          "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200",
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
