import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface FloatingButtonContextType {
  setFloatingAction: (action: (() => void) | null, label?: string) => void;
  floatingAction: (() => void) | null;
  floatingLabel: string;
}

const FloatingButtonContext = createContext<FloatingButtonContextType | undefined>(undefined);

export function FloatingButtonProvider({ children }: { children: ReactNode }) {
  const [floatingAction, setAction] = useState<(() => void) | null>(null);
  const [floatingLabel, setLabel] = useState<string>('إضافة جديد');

  const setFloatingAction = useCallback((action: (() => void) | null, label: string = 'إضافة جديد') => {
    // منع إعادة التصيير غير الضرورية
    setAction(prevAction => {
      if (prevAction === action) return prevAction;
      return action;
    });
    setLabel(prevLabel => {
      if (prevLabel === label) return prevLabel;
      return label;
    });
  }, []);

  return (
    <FloatingButtonContext.Provider value={{
      setFloatingAction,
      floatingAction,
      floatingLabel,
    }}>
      {children}
    </FloatingButtonContext.Provider>
  );
}

export function useFloatingButton() {
  const context = useContext(FloatingButtonContext);
  if (context === undefined) {
    throw new Error('useFloatingButton must be used within a FloatingButtonProvider');
  }
  return context;
}