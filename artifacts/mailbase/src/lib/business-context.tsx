import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface BusinessContextType {
  business: string;
  setBusiness: (b: string) => void;
}

const STORAGE_KEY = "mailbase_active_business";

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusinessState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "equifind";
  });

  const setBusiness = (b: string) => {
    setBusinessState(b);
    localStorage.setItem(STORAGE_KEY, b);
  };

  return (
    <BusinessContext.Provider value={{ business, setBusiness }}>
      <div className="min-h-[100dvh] bg-background text-foreground font-sans">
        {children}
      </div>
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusiness must be used within BusinessProvider");
  return context;
}
