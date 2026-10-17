"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Pill, Package, AlertTriangle, ArrowRight } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { apiClient } from "@/lib/api/client";
import { MedicineStockView } from "@/types/database";
import { useDebounce } from "@/hooks/use-debounce";

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [results, setResults] = useState<MedicineStockView[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.trim().length < 2) {
      setResults([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    apiClient<MedicineStockView[]>("/api/medicines", {
      params: { search: debouncedSearch, pageSize: 8 },
    })
      .then((res) => {
        if (isMounted) {
          setResults(res.data);
        }
      })
      .catch((err) => console.error("Search failed:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch]);

  const handleSelect = (medicineId: string) => {
    setOpen(false);
    router.push(`/medicines/${medicineId}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-between w-48 sm:w-64 md:w-80 h-9 px-3 text-xs text-muted-foreground bg-white border border-border rounded-md hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm transition-all"
        aria-label="Search medicines"
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">Search medicines, generic names...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-slate-100 border border-slate-300 rounded shadow-xs">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a medicine name, generic name, or strength..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Searching database...
            </div>
          ) : results.length === 0 && search.length >= 2 ? (
            <CommandEmpty>No matching medicines found.</CommandEmpty>
          ) : null}

          {results.length > 0 && (
            <CommandGroup heading="Medicines & Formulations">
              {results.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.name} ${m.strength} ${m.generic_name || ""}`}
                  onSelect={() => handleSelect(m.id)}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Pill className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-navy">
                        {m.name}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {m.strength} • {m.dosage_form}
                        </span>
                      </p>
                      {m.generic_name && (
                        <p className="text-xs text-muted-foreground">
                          {m.generic_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600">
                      {m.sellable_quantity} in stock
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Quick Navigation">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                router.push("/medicines");
              }}
              className="cursor-pointer"
            >
              <Package className="h-4 w-4 mr-2 text-slate-500" />
              <span>View All Medicines</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setOpen(false);
                router.push("/alerts");
              }}
              className="cursor-pointer"
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-[#B7791F]" />
              <span>View Active Alerts</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
