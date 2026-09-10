import type { Route } from "next";

export interface NavItem {
  href: Route;
  label: string;
  /** Shown in the mobile drawer only — gives each destination a reason to tap. */
  hint: string;
}

export const navItems: NavItem[] = [
  { href: "/vehicles", label: "Stock", hint: "Browse every car we have" },
  { href: "/finance", label: "Finance", hint: "Spread the cost" },
  { href: "/part-exchange", label: "Part Exchange", hint: "Value your current car" },
  { href: "/hire", label: "Hire", hint: "Executive and everyday hire" },
  { href: "/about", label: "About", hint: "Who we are" },
  { href: "/contact", label: "Contact", hint: "Find and reach the showroom" },
];
