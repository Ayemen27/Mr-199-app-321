import { useState, useMemo } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "اختر...",
  emptyText = "لا توجد نتائج",
  allowCustom = true,
  customPlaceholder = "إدخال يدوي...",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const allOptions = useMemo(() => {
    const uniqueOptions = Array.from(new Set(options));
    return uniqueOptions.sort((a, b) => a.localeCompare(b, 'ar'));
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return allOptions;
    return allOptions.filter(option => 
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allOptions, searchTerm]);

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === "__custom__") {
      setShowCustomInput(true);
      return;
    }
    
    onValueChange(selectedValue);
    setOpen(false);
    setShowCustomInput(false);
    setCustomInput("");
    setSearchTerm("");
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onValueChange(customInput.trim());
      setOpen(false);
      setShowCustomInput(false);
      setCustomInput("");
      setSearchTerm("");
    }
  };

  const displayValue = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className={cn(
            "truncate",
            !value && "text-muted-foreground"
          )}>
            {displayValue}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-auto">
          {filteredOptions.length === 0 && !allowCustom && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          )}
          {filteredOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === option ? "opacity-100" : "opacity-0"
                )}
              />
              {option}
            </button>
          ))}
          {allowCustom && (
            <button
              onClick={() => handleSelect("__custom__")}
              className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              {customPlaceholder}
            </button>
          )}
        </div>
        
        {showCustomInput && (
          <div className="border-t p-3 space-y-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="أدخل القيمة الجديدة..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCustomSubmit();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCustomSubmit}
                size="sm"
                className="flex-1"
                disabled={!customInput.trim()}
              >
                إضافة
              </Button>
              <Button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomInput("");
                  setSearchTerm("");
                }}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}