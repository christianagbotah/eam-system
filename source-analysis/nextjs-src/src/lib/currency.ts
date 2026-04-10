let currencySymbol = '$';

export const setCurrencySymbol = (symbol: string) => {
  currencySymbol = symbol;
};

export const getCurrencySymbol = () => currencySymbol;

export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currencySymbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
