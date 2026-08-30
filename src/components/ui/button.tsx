import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const variants = {
      default: "btn-primary",
      secondary: "btn-secondary",
      outline: "btn-outline",
      ghost: "bg-transparent hover:bg-[#FCF4EE] text-[#55483D]",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs",
      md: "h-[52px] px-6 text-sm",
      lg: "h-14 px-8 text-base",
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-sm font-semibold whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
