import { type ClassValue, clsx } from "clsx";
import { twMerge } from "@/lib/tw-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
