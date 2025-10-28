/**
 * Currency Amount Component
 * Formats and displays currency amounts
 */

interface CurrencyAmountProps {
  amount: string | number
  currency: string
  decimals?: number
  className?: string
}

export function CurrencyAmount({
  amount,
  currency,
  decimals = 2,
  className = ''
}: CurrencyAmountProps) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numAmount)

  return (
    <span className={`font-mono ${className}`}>
      {formatted} {currency}
    </span>
  )
}
