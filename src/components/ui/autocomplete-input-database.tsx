import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Search, Trash2 } from 'lucide-react';
import type { AutocompleteData } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  category: string; // نوع البيانات مثل "senderNames", "supplierNames", etc
  disabled?: boolean;
  className?: string;
  type?: string;
  inputMode?: "numeric" | "decimal" | "text" | "search" | "email" | "tel" | "url";
}

export function AutocompleteInput({
  value,
  onChange,
  placeholder,
  category,
  disabled = false,
  className = "",
  type = "text",
  inputMode = "text"
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // جلب البيانات من قاعدة البيانات
  const { data: autocompleteData = [], isLoading } = useQuery({
    queryKey: ['autocomplete', category],
    queryFn: () => apiRequest(`/api/autocomplete/${category}`, 'GET') as Promise<AutocompleteData[]>,
    enabled: !!category,
  });

  // حفظ البيانات في قاعدة البيانات
  const saveDataMutation = useMutation({
    mutationFn: (data: { category: string; value: string; usageCount?: number }) =>
      apiRequest('/api/autocomplete', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autocomplete', category] });
      // إعادة تحديث البيانات فوراً
      queryClient.refetchQueries({ queryKey: ['autocomplete', category] });
    },
    onError: (error) => {
      console.error('Error saving autocomplete data:', error);
    }
  });

  // حذف البيانات من قاعدة البيانات
  const removeDataMutation = useMutation({
    mutationFn: ({ category, value }: { category: string; value: string }) =>
      apiRequest(`/api/autocomplete/${category}/${encodeURIComponent(value)}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autocomplete', category] });
    },
  });

  // فلترة البيانات حسب البحث
  const filteredData = Array.isArray(autocompleteData) ? autocompleteData.filter(item =>
    item.value.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // حفظ البيانات عند اختيار القيمة
  const handleSelect = useCallback((selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchQuery('');
    
    // حفظ البيانات في قاعدة البيانات (سيزيد عدد الاستخدام)
    if (selectedValue && typeof selectedValue === 'string' && selectedValue.trim()) {
      saveDataMutation.mutate({
        category,
        value: selectedValue.trim()
      });
    }
  }, [onChange, category, saveDataMutation]);

  // حفظ البيانات عند كتابة قيمة جديدة والانتقال للحقل التالي
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // تأخير لضمان عدم إغلاق القائمة عند الضغط على خيار
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        
        // حفظ البيانات إذا كانت موجودة وليست فارغة
        if (value && typeof value === 'string' && value.trim() && value.trim().length >= 2) {
          // دائماً حفظ القيمة (سيتم تحديث عدد الاستخدام إذا كانت موجودة مسبقاً)
          saveDataMutation.mutate({
            category,
            value: value.trim()
          });
        }
      }
    }, 150);
  }, [value, category, saveDataMutation]);

  // حذف عنصر من القائمة
  const handleRemove = useCallback((itemValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeDataMutation.mutate({ category, value: itemValue });
  }, [category, removeDataMutation]);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSearchQuery(newValue);
    if (!isOpen && newValue && newValue.length >= 1) {
      setIsOpen(true);
    }
  };
  
  // حفظ البيانات عند الضغط على Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() && value.trim().length >= 2) {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      
      // حفظ البيانات في قاعدة البيانات
      saveDataMutation.mutate({
        category,
        value: value.trim()
      });
    }
  }, [value, category, saveDataMutation]);

  const handleInputFocus = () => {
    // فتح القائمة دائماً عند التركيز، حتى لو كانت فارغة
    setIsOpen(true);
    // تحديث البيانات عند التركيز للحصول على أحدث البيانات
    queryClient.refetchQueries({ queryKey: ['autocomplete', category] });
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`arabic-numbers ${className}`}
        type={type}
        inputMode={inputMode}
      />
      
      {isOpen && !disabled && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-1">
          <Card className="max-h-64 overflow-y-auto shadow-lg border">
            {isLoading ? (
              <div className="p-3 text-center text-gray-500">
                <Search className="w-4 h-4 animate-spin mx-auto mb-2" />
                جاري التحميل...
              </div>
            ) : Array.isArray(filteredData) && filteredData.length > 0 ? (
              <div className="py-1">
                {filteredData.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer group"
                    onClick={() => handleSelect(item.value)}
                  >
                    <span className="flex-1 text-right">{item.value}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-gray-400">{item.usageCount}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-6 h-6 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={(e) => handleRemove(item.value, e)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="p-3 text-center text-gray-500">
                <Search className="w-4 h-4 mx-auto mb-2" />
                لا توجد نتائج للبحث "{searchQuery}"
              </div>
            ) : (
              <div className="p-3 text-center text-gray-500">
                ابدأ بالكتابة لحفظ البيانات تلقائياً
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}