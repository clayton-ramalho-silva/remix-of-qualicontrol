import { useVertical, VERTICAL_LIST, VERTICAL_CONFIG, type VerticalFilter } from "@/contexts/VerticalContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Layers3, ShieldCheck, ListChecks, HardHat } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  qualidade: ShieldCheck,
  checklist: ListChecks,
  qsms: HardHat,
} as const;

export default function VerticalSwitcher() {
  const { vertical, setVertical } = useVertical();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const options: { id: VerticalFilter; label: string; Icon: typeof Layers3 }[] = [
    { id: "all", label: "Todas", Icon: Layers3 },
    ...VERTICAL_LIST.map((v) => ({ id: v, label: VERTICAL_CONFIG[v].shortLabel, Icon: ICONS[v] })),
  ];

  if (collapsed) {
    // In collapsed sidebar, render a vertical stack of icon buttons
    return (
      <div className="flex flex-col items-center gap-1 px-1 py-2 border-b border-sidebar-border/40">
        {options.map(({ id, label, Icon }) => {
          const active = vertical === id;
          return (
            <button
              key={id}
              onClick={() => setVertical(id)}
              title={label}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-3 py-3 border-b border-sidebar-border/40">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/50 mb-2 px-1">
        Vertical
      </p>
      <div className="grid grid-cols-2 gap-1">
        {options.map(({ id, label, Icon }) => {
          const active = vertical === id;
          return (
            <button
              key={id}
              onClick={() => setVertical(id)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
