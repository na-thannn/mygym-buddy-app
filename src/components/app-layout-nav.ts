import { cn } from "@/lib/utils";

export function getSidebarNavClassName(mobile: boolean) {
  return cn(
    "flex flex-1 flex-col",
    mobile ? "gap-1 overflow-y-auto px-3 py-4" : "gap-0.5 overflow-visible",
  );
}

export type SidebarNavItemVariant = "default" | "child";

export function getSidebarNavItemClassName(mobile: boolean, variant: SidebarNavItemVariant = "default") {
  return cn(
    "group flex items-center rounded-xl px-3 font-medium transition duration-200",
    mobile ? "gap-3 py-3 text-sm" : "gap-2.5 py-2 text-[13px]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    variant === "child" &&
      cn(
        "ml-2 border-l border-white/10 pl-4",
        mobile ? "py-2.5 text-[13px]" : "py-1.5 text-[12.5px]",
      ),
  );
}
