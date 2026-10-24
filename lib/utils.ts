import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function for consistent date formatting
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Utility function for currency formatting with configurable symbol
export const formatCurrency = (amount: number = 0, currencySymbol: string = '₹') => {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${currencySymbol}${safeAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Utility function for currency formatting using Intl (for international support)
export const formatCurrencyIntl = (amount: number = 0, currency: string = 'INR') => {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(safeAmount);
};
