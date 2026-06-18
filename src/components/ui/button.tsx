import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-[0.005em] ring-offset-background transition-all duration-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:shadow-elegant hover:-translate-y-px hover:bg-[hsl(212_65%_26%)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border/80 bg-background/60 backdrop-blur-sm hover:bg-accent/10 hover:border-accent/60 hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline decoration-accent/70 decoration-2",
        premium:
          "text-primary-foreground shadow-elegant hover:shadow-premium hover:-translate-y-px [background:linear-gradient(135deg,hsl(212_65%_18%)_0%,hsl(212_60%_24%)_55%,hsl(188_55%_32%)_100%)]",
        gold:
          "text-[hsl(215_45%_12%)] shadow-elegant hover:shadow-premium hover:-translate-y-px [background:linear-gradient(135deg,hsl(41_75%_58%)_0%,hsl(41_85%_70%)_55%,hsl(38_70%_52%)_100%)]",
      },
      size: {
        default: "h-11 md:h-10 px-4 py-2",
        sm: "h-10 md:h-9 rounded-md px-3",
        lg: "h-12 md:h-12 rounded-xl px-7 md:px-9 text-[15px]",
        icon: "h-11 w-11 md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
