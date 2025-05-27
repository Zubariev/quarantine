import { Suspense, type ReactNode } from "react";

export const SuspenseWrapper = ({ children }: { children: ReactNode }) => {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}; 