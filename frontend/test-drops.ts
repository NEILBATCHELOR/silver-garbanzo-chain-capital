import { dropsToXrp } from 'xrpl'

// Test 1: String input (drops)
const drops = "1000000"
const xrp1 = dropsToXrp(drops)
console.log(`Type of dropsToXrp return: ${typeof xrp1}`) // Should be number

// Test 2: Number input
const dropsNum = 1000000
const xrp2 = dropsToXrp(dropsNum)
console.log(`Type of dropsToXrp return: ${typeof xrp2}`) // Should be number

// Test 3: What we're doing in the code
type Amount = string | { value: string; currency: string; issuer: string }

function testAmount(amount: Amount) {
  const value = typeof amount === 'string'
    ? parseFloat(dropsToXrp(amount))
    : parseFloat(String(amount.value || '0'))
  
  return value
}

console.log(testAmount("1000000"))
console.log(testAmount({ value: "100", currency: "USD", issuer: "r..." }))
