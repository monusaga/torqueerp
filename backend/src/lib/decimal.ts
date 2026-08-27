import Decimal from 'decimal.js';

// Configure Decimal.js for precise currency math
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(val: number | string | Decimal): Decimal {
  return new Decimal(val || 0);
}

export function roundCurrency(val: number | string | Decimal): number {
  return new Decimal(val || 0).toDecimalPlaces(2).toNumber();
}

export function calculateDiscount(mrp: number, discountPercent: number): {
  unitPrice: number;
  discountAmount: number;
} {
  const dMrp = toDecimal(mrp);
  const dPercent = toDecimal(discountPercent);
  const discountAmount = dMrp.times(dPercent).dividedBy(100);
  const unitPrice = dMrp.minus(discountAmount);

  return {
    unitPrice: roundCurrency(unitPrice),
    discountAmount: roundCurrency(discountAmount),
  };
}

export function calculateLandedCost(
  unitCost: number,
  quantity: number,
  freight: number,
  otherCharges: number,
  totalItemsInPurchase: number
): number {
  if (quantity <= 0) return roundCurrency(unitCost);
  const dUnitCost = toDecimal(unitCost);
  const totalExtraCharges = toDecimal(freight).plus(toDecimal(otherCharges));
  const chargePerItem = totalItemsInPurchase > 0 
    ? totalExtraCharges.dividedBy(totalItemsInPurchase)
    : new Decimal(0);

  const landedUnitCost = dUnitCost.plus(chargePerItem);
  return roundCurrency(landedUnitCost);
}

export function calculateGrossProfit(
  sellingPrice: number,
  unitCost: number,
  quantity: number
): {
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
} {
  const dSelling = toDecimal(sellingPrice);
  const dCost = toDecimal(unitCost);
  const dQty = toDecimal(quantity);

  const totalRevenue = dSelling.times(dQty);
  const cogs = dCost.times(dQty);
  const grossProfit = totalRevenue.minus(cogs);
  
  const grossMarginPercent = totalRevenue.greaterThan(0)
    ? grossProfit.dividedBy(totalRevenue).times(100)
    : new Decimal(0);

  return {
    cogs: roundCurrency(cogs),
    grossProfit: roundCurrency(grossProfit),
    grossMarginPercent: roundCurrency(grossMarginPercent),
  };
}

export function calculatePaymentBalance(grandTotal: number, amountPaid: number): {
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
} {
  const dTotal = toDecimal(grandTotal);
  const dPaid = toDecimal(amountPaid);
  const balanceDue = dTotal.minus(dPaid);

  let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
  if (balanceDue.lessThanOrEqualTo(0)) {
    paymentStatus = 'PAID';
  } else if (dPaid.greaterThan(0)) {
    paymentStatus = 'PARTIALLY_PAID';
  } else {
    paymentStatus = 'UNPAID';
  }

  return {
    balanceDue: roundCurrency(Decimal.max(0, balanceDue)),
    paymentStatus,
  };
}
