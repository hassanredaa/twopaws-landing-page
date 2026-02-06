import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SupplierDoc } from "@/hooks/useSuppliers";
import { Store } from "lucide-react";
import { toPrerenderSafeImageSrc } from "@/lib/prerenderImage";

type SupplierPickerProps = {
  suppliers: SupplierDoc[];
  selectedSupplierId: string;
  supplierMode: "all" | "single";
  loading?: boolean;
  onSelectAll: () => void;
  onSelectSupplier: (supplierId: string) => void;
};

const getLogoUrl = (supplier: SupplierDoc) =>
  (supplier.logo_url as string) ||
  (supplier.logoUrl as string) ||
  (supplier.logo as string);

const getEtaMins = (supplier: SupplierDoc) => {
  const rawEta =
    (supplier as { etaMins?: unknown }).etaMins ??
    (supplier as { eta?: unknown }).eta ??
    (supplier as { deliveryEta?: unknown }).deliveryEta ??
    (supplier as { delivery_eta?: unknown }).delivery_eta;

  const etaNumber =
    typeof rawEta === "number"
      ? rawEta
      : typeof rawEta === "string"
        ? Number.parseInt(rawEta, 10)
        : undefined;

  return Number.isFinite(etaNumber) && (etaNumber as number) > 0 ? (etaNumber as number) : 120;
};

const isSupplierAvailable = (supplier: SupplierDoc) => {
  const isExplicitlyUnavailable =
    (supplier as { isAvailable?: boolean }).isAvailable === false;

  if (isExplicitlyUnavailable) return false;
  if ("isActive" in supplier && supplier.isActive === false) return false;
  return true;
};

function SupplierLogo({ name, logoUrl }: { name?: string; logoUrl?: string }) {
  const [failed, setFailed] = useState(false);
  const safeLogoUrl = toPrerenderSafeImageSrc(logoUrl);
  const showImage = safeLogoUrl && !failed;
  const fallbackInitial = (name ?? "S").slice(0, 1).toUpperCase();

  return (
    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
      {showImage ? (
        <img
          src={safeLogoUrl}
          alt={name ?? "Supplier"}
          width={112}
          height={112}
          className="h-full w-full object-contain p-3"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-lg font-semibold text-slate-400">{fallbackInitial}</span>
      )}
    </div>
  );
}

type PickerCardProps = {
  label: string;
  etaLabel?: string;
  etaMins?: number;
  logoUrl?: string;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
};

function SupplierPickerCard({
  label,
  etaLabel,
  etaMins,
  logoUrl,
  selected,
  onClick,
  icon,
}: PickerCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="snap-start"
      aria-pressed={selected}
    >
      <div
        className={cn(
          "group flex w-36 flex-none flex-col items-center gap-3 rounded-2xl p-2 text-center transition",
          "hover:-translate-y-1"
        )}
      >
        <div
          className={cn(
            "relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm transition",
            "hover:border-slate-300",
            selected && "border-[hsl(var(--brand-dark))] ring-2 ring-[hsl(var(--brand-dark))] shadow-md"
          )}
        >
          {icon ? (
            <div className="flex h-full w-full items-center justify-center text-[hsl(var(--brand-dark))]">
              {icon}
            </div>
          ) : (
            <SupplierLogo name={label} logoUrl={logoUrl} />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold leading-tight text-slate-900">
            {label}
          </p>
          <p className="text-xs text-slate-500">
            {etaLabel ?? `${etaMins ?? 120} mins`}
          </p>
        </div>
      </div>
    </button>
  );
}

function SupplierSkeletonCard() {
  return (
    <div className="w-36 flex-none snap-start">
      <div className="flex h-full flex-col items-center gap-3 rounded-2xl p-2">
        <Skeleton className="h-28 w-28 rounded-full" />
        <div className="flex w-full flex-col items-center gap-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-3 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SupplierPicker({
  suppliers,
  selectedSupplierId,
  supplierMode,
  loading,
  onSelectAll,
  onSelectSupplier,
}: SupplierPickerProps) {
  const availableSuppliers = useMemo(
    () => suppliers.filter(isSupplierAvailable),
    [suppliers]
  );

  const isAllSelected = supplierMode === "all" || selectedSupplierId === "all";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex max-w-full gap-6 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
        <SupplierPickerCard
          label="All suppliers"
          etaLabel="Browse everything"
          selected={isAllSelected}
          onClick={onSelectAll}
          icon={<Store className="h-10 w-10" strokeWidth={1.5} />}
        />

        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <SupplierSkeletonCard key={`supplier-skeleton-${index}`} />
          ))}

        {!loading &&
          availableSuppliers.map((supplier) => (
            <SupplierPickerCard
              key={supplier.id}
              label={supplier.name ?? "Supplier"}
              etaMins={getEtaMins(supplier)}
              logoUrl={getLogoUrl(supplier)}
              selected={selectedSupplierId === supplier.id}
              onClick={() => onSelectSupplier(supplier.id)}
            />
          ))}
      </div>

      {!loading && availableSuppliers.length === 0 && (
        <p className="text-sm text-slate-500">
          No suppliers are available right now.
        </p>
      )}
    </div>
  );
}
