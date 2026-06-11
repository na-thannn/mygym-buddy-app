import { createContext, useContext } from "react";

type FixedSnapNavigationValue = {
  activeIndex: number;
  fixedActive: boolean;
  goToSection: (targetId: string) => void;
};

export const FixedSnapNavigationContext = createContext<FixedSnapNavigationValue>({
  activeIndex: 0,
  fixedActive: false,
  goToSection: () => undefined,
});

export function useFixedSnapNavigation() {
  return useContext(FixedSnapNavigationContext);
}
