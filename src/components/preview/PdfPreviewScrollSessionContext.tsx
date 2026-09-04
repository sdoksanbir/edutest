import { createContext, useContext, type ReactNode } from "react";

type ScrollSession = {
  begin: () => void;
  end: () => void;
};

const PdfPreviewScrollSessionContext = createContext<ScrollSession | null>(null);

export function PdfPreviewScrollSessionProvider({
  begin,
  end,
  children,
}: ScrollSession & { children: ReactNode }) {
  return (
    <PdfPreviewScrollSessionContext.Provider value={{ begin, end }}>
      {children}
    </PdfPreviewScrollSessionContext.Provider>
  );
}

export function usePdfPreviewScrollSession(): ScrollSession | null {
  return useContext(PdfPreviewScrollSessionContext);
}
