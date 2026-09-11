import { CONSULT_LOGO_URL, PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_SUBTITLE } from "@/lib/brand";

type BrandLockupProps = {
  subtitle?: string;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
  description?: string | null;
};

const sizeMap = {
  sm: { logo: "h-auto w-[172px]", title: "text-sm", description: "text-[13px]" },
  md: { logo: "h-auto w-[220px]", title: "text-base", description: "text-xs" },
  lg: { logo: "h-auto w-[280px]", title: "text-xl", description: "text-sm" },
} as const;

/** Lockup de marca Consult Services + 7Grafica, usado em telas sem shell (ex.: login). */
export function BrandLockup({
  subtitle = PRODUCT_SUBTITLE,
  align = "left",
  size = "md",
  description = PRODUCT_DESCRIPTION,
}: BrandLockupProps) {
  const styles = sizeMap[size];
  const textAlign = align === "center" ? "text-center" : "text-left";
  const wrapperAlign = align === "center" ? "items-center" : "items-start";

  return (
    <div className={`flex flex-col ${wrapperAlign}`}>
      <img src={CONSULT_LOGO_URL} alt="Consult Services Tecnologia" className={styles.logo} />
      <div className={`mt-3 min-w-0 ${textAlign}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">{PRODUCT_NAME}</p>
        <p className={`mt-1 font-semibold leading-5 text-(--text-primary) ${styles.title}`}>{subtitle}</p>
        {description ? (
          <p className={`mt-1 leading-5 text-(--text-secondary) ${styles.description}`}>{description}</p>
        ) : null}
      </div>
    </div>
  );
}
