export const formatCurrency = (amount: number, locale: string = "id-ID") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0, // No decimals (optional)
  }).format(amount);
};

export const formatNumber = (amount: number, locale: string = "en-US", fractionDigits: number = 2) => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0, // No decimals (optional)
    maximumFractionDigits: fractionDigits, // Control the number of decimal places
  }).format(amount);
};
  