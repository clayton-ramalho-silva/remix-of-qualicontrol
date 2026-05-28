import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Obra = { id: number; codigo: string; nome: string };

interface ObraSelectProps {
  obras?: Obra[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Quando definido, inclui uma opção "todas" no topo com este rótulo (valor "all"). */
  allLabel?: string;
  className?: string;
  disabled?: boolean;
}

const obraLabel = (o: Obra) => `${o.codigo} - ${o.nome}`;

export default function ObraSelect({
  obras,
  value,
  onValueChange,
  placeholder = "Selecione a obra",
  allLabel,
  className,
  disabled,
}: ObraSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = obras?.find((o) => String(o.id) === value);
  const triggerLabel =
    value === "all" && allLabel
      ? allLabel
      : selected
        ? obraLabel(selected)
        : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between bg-card font-normal",
            !triggerLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{triggerLabel ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar obra..." />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>Nenhuma obra encontrada.</CommandEmpty>
            <CommandGroup>
              {allLabel && (
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onValueChange("all");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === "all" ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
              )}
              {obras?.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.codigo} ${o.nome}`}
                  onSelect={() => {
                    onValueChange(String(o.id));
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === String(o.id) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{obraLabel(o)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
