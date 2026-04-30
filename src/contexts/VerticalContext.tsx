import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Vertical = "qualidade" | "checklist" | "qsms" | "vistoria";
export type VerticalFilter = Vertical | "all";

type VerticalConfig = {
  id: Vertical;
  label: string;
  shortLabel: string;
  description: string;
  // Tailwind color classes — keep aligned with badges in DesviosList
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  ringClass: string;
};

export const VERTICAL_CONFIG: Record<Vertical, VerticalConfig> = {
  qualidade: {
    id: "qualidade",
    label: "Qualidade",
    shortLabel: "Qualidade",
    description: "Verificações e desvios de qualidade",
    color: "blue",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
    ringClass: "ring-blue-500",
  },
  checklist: {
    id: "checklist",
    label: "Checklist",
    shortLabel: "Checklist",
    description: "Itens de checklist e punch list",
    color: "violet",
    bgClass: "bg-violet-50",
    textClass: "text-violet-700",
    borderClass: "border-violet-200",
    ringClass: "ring-violet-500",
  },
  qsms: {
    id: "qsms",
    label: "QSMS",
    shortLabel: "QSMS",
    description: "Qualidade, Segurança, Meio Ambiente e Saúde",
    color: "orange",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
    ringClass: "ring-orange-500",
  },
  vistoria: {
    id: "vistoria",
    label: "Vistoria de Recebimento",
    shortLabel: "Vistoria",
    description: "Vistoria de recebimento de andar",
    color: "emerald",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    ringClass: "ring-emerald-500",
  },
};

export const VERTICAL_LABELS: Record<Vertical, string> = {
  qualidade: "Qualidade",
  checklist: "Checklist",
  qsms: "QSMS",
  vistoria: "Vistoria",
};

export const VERTICAL_LIST: Vertical[] = ["qualidade", "checklist", "qsms", "vistoria"];

const STORAGE_KEY = "active-vertical";

type VerticalContextValue = {
  vertical: VerticalFilter;
  setVertical: (v: VerticalFilter) => void;
  config: VerticalConfig | null;
  isAll: boolean;
};

const VerticalContext = createContext<VerticalContextValue | undefined>(undefined);

export function VerticalProvider({ children }: { children: ReactNode }) {
  const [vertical, setVerticalState] = useState<VerticalFilter>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (
      saved === "qualidade" ||
      saved === "checklist" ||
      saved === "qsms" ||
      saved === "vistoria" ||
      saved === "all"
    ) {
      return saved;
    }
    return "all";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, vertical);
  }, [vertical]);

  const setVertical = (v: VerticalFilter) => setVerticalState(v);

  const value: VerticalContextValue = {
    vertical,
    setVertical,
    config: vertical === "all" ? null : VERTICAL_CONFIG[vertical],
    isAll: vertical === "all",
  };

  return <VerticalContext.Provider value={value}>{children}</VerticalContext.Provider>;
}

export function useVertical() {
  const ctx = useContext(VerticalContext);
  if (!ctx) throw new Error("useVertical must be used within VerticalProvider");
  return ctx;
}
