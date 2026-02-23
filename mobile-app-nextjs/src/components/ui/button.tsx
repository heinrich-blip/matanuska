import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:from-violet-600 hover:to-violet-700 shadow-lg shadow-violet-500/25",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25",
        outline:
          "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm",
        secondary:
          "bg-white/10 text-white hover:bg-white/15 backdrop-blur-sm",
        ghost: "hover:bg-white/10 hover:text-white",
        link: "text-violet-400 underline-offset-4 hover:underline hover:text-violet-300",
        success: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-10 rounded-xl px-4",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  children?: React.ReactNode;
}

function LoadingSpinner(): React.JSX.Element {
  return (
    <span className="flex items-center gap-2">
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>Loading...</span>
    </span>
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, isLoading, children, disabled, ...props }, ref) {
    const content: React.ReactNode = isLoading ? <LoadingSpinner /> : children;

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };