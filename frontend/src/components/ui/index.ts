/**
 * index.ts — ArcNS shared UI component barrel export.
 *
 * Import from "@/components/ui" for clean imports across the app.
 */

export { GlassCard }         from "./GlassCard";
export type { GlassCardVariant } from "./GlassCard";

export { PrimaryButton }     from "./PrimaryButton";
export { SecondaryButton }   from "./SecondaryButton";
export { IconButton }        from "./IconButton";

export { StatusBadge }       from "./StatusBadge";
export type { StatusVariant } from "./StatusBadge";

export { TldBadge }          from "./TldBadge";
export type { TldVariant }   from "./TldBadge";

export { PrimaryBadge }      from "./PrimaryBadge";
export { NetworkBadge }      from "./NetworkBadge";
export type { NetworkVariant } from "./NetworkBadge";

export { AddressPill }       from "./AddressPill";
export { CopyButton }        from "./CopyButton";

export { PageHeader }        from "./PageHeader";
export { OrbitBackground }   from "./OrbitBackground";
export { FooterIdentityLine } from "./FooterIdentityLine";

export { LoadingSkeleton, Skeleton } from "./LoadingSkeleton";
export { EmptyState }        from "./EmptyState";
export { ErrorState }        from "./ErrorState";

export { cn }                from "./utils";
