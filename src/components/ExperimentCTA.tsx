import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getVariant,
  trackCtaEvent,
  markPendingConversion,
  type CtaVariant,
} from "@/lib/cta-experiments";

type CommonProps = {
  ctaId: string;
  variants: CtaVariant[];
  /** Whether clicking this CTA should be recorded as a pending conversion (signup intent). */
  conversionIntent?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
  helperClassName?: string;
  /** Suffix appended after the variant label (e.g. an arrow icon). */
  trailing?: React.ReactNode;
};

type LinkProps = CommonProps & { to: string; href?: never; onClick?: never; type?: never };
type AnchorProps = CommonProps & { href: string; to?: never; onClick?: never; type?: never };
type ButtonProps = CommonProps & {
  to?: never;
  href?: never;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
};

export type ExperimentCTAProps = LinkProps | AnchorProps | ButtonProps;

export function ExperimentCTA(props: ExperimentCTAProps) {
  const { ctaId, variants, conversionIntent, size, variant, className, helperClassName, trailing } = props;
  const chosen = useMemo(() => getVariant({ cta_id: ctaId, variants }), [ctaId, variants]);
  const impressed = useRef(false);

  useEffect(() => {
    if (impressed.current) return;
    impressed.current = true;
    trackCtaEvent(ctaId, chosen.id, "impression");
  }, [ctaId, chosen.id]);

  const handleClick = () => {
    trackCtaEvent(ctaId, chosen.id, "click");
    if (conversionIntent) markPendingConversion(ctaId, chosen.id);
  };

  const label = (
    <>
      {chosen.label}
      {trailing}
    </>
  );

  let inner: React.ReactNode;
  if ("to" in props && props.to) {
    inner = (
      <Button asChild size={size} variant={variant} className={className}>
        <Link to={props.to} onClick={handleClick}>{label}</Link>
      </Button>
    );
  } else if ("href" in props && props.href) {
    inner = (
      <Button asChild size={size} variant={variant} className={className}>
        <a href={props.href} onClick={handleClick}>{label}</a>
      </Button>
    );
  } else {
    inner = (
      <Button
        type={(props as ButtonProps).type ?? "button"}
        size={size}
        variant={variant}
        className={className}
        onClick={(e) => { handleClick(); (props as ButtonProps).onClick?.(e); }}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="inline-flex flex-col items-start">
      {inner}
      {chosen.helper && (
        <span className={cn("mt-1.5 text-xs text-muted-foreground", helperClassName)}>
          {chosen.helper}
        </span>
      )}
    </div>
  );
}