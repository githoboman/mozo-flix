"use client";

import { forwardRef } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: string;          // material-symbols name, leading
  trailingIcon?: string;
};

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-black hover:bg-accent-bright hover:-translate-y-0.5 hover:shadow-glow",
  secondary:
    "border border-white/15 bg-card-2 text-white hover:border-accent hover:text-accent hover:-translate-y-0.5",
  ghost:
    "text-muted hover:bg-white/5 hover:text-white",
  danger:
    "border border-red-500/40 text-red-200 hover:bg-red-500/15 hover:border-red-500/60",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[10px]",
  md: "h-10 px-5 text-[12px]",
  lg: "h-12 px-7 text-[14px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded font-ui font-bold uppercase tracking-[0.08em] transition-all press-feedback disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function classes({
  variant = "primary",
  size = "md",
  fullWidth = false,
  extra = "",
}: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  extra?: string;
}) {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${
    fullWidth ? "w-full" : ""
  } ${extra}`;
}

function renderContent({
  loading,
  icon,
  trailingIcon,
  children,
}: {
  loading?: boolean;
  icon?: string;
  trailingIcon?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <>
        <span className="material-symbols-outlined animate-spin text-[16px]">
          progress_activity
        </span>
        <span className="opacity-80">{children}</span>
      </>
    );
  }
  return (
    <>
      {icon && (
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
      )}
      <span>{children}</span>
      {trailingIcon && (
        <span className="material-symbols-outlined text-[16px]">
          {trailingIcon}
        </span>
      )}
    </>
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & BaseProps
>(function Button(
  {
    variant,
    size,
    loading,
    fullWidth,
    icon,
    trailingIcon,
    className = "",
    disabled,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classes({ variant, size, fullWidth, extra: className })}
      {...rest}
    >
      {renderContent({ loading, icon, trailingIcon, children })}
    </button>
  );
});

/** Link variant — looks identical to <Button> but renders Next <Link>. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  trailingIcon,
  className = "",
  href,
  children,
  external = false,
}: BaseProps & {
  href: string;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls = classes({ variant, size, fullWidth, extra: className });
  const inner = renderContent({ icon, trailingIcon, children });
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
