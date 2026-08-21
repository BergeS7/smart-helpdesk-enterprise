import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function DSCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes("ds-card", className)} {...props} />;
}

export function DSPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes("ds-panel", className)} {...props} />;
}

export function DSButton({ variant = "secondary", className, type = "button", ...props }:
ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={classes("ds-button", `ds-button--${variant}`, className)} {...props} />;
}

export function DSBadge({ tone = "neutral", className, children }:
HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={classes("ds-badge", `ds-status--${tone}`, className)}>{children}</span>;
}

export function DSPageHeader({ icon: Icon, title, description, actions }: {
  icon?: LucideIcon; title: ReactNode; description?: ReactNode; actions?: ReactNode;
}) {
  return <header className="ds-page-header">
    <div className="ds-page-header__identity">
      {Icon ? <span className="ds-page-header__icon"><Icon className="ds-icon" aria-hidden="true" /></span> : null}
      <div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>
    </div>
    {actions ? <div className="ds-page-header__actions">{actions}</div> : null}
  </header>;
}

export function DSEmptyState({ icon: Icon, title, description, action }: {
  icon?: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode;
}) {
  return <div className="ds-empty-state">
    {Icon ? <Icon className="ds-empty-state__icon" aria-hidden="true" /> : null}
    <strong>{title}</strong>{description ? <p>{description}</p> : null}{action}
  </div>;
}
