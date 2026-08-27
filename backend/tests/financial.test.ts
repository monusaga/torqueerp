import { describe, it, expect } from 'vitest';
import {
  calculateDiscount,
  calculateLandedCost,
  calculateGrossProfit,
  calculatePaymentBalance,
  roundCurrency,
  toDecimal,
} from '../src/lib/decimal.js';

describe('Deterministic Financial Calculation & GST Matrix Tests', () => {
  it('calculates 20% trade discount on ₹1,000 correctly as ₹800 net unit price', () => {
    const result = calculateDiscount(1000, 20);
    expect(result.discountAmount).toBe(200);
    expect(result.unitPrice).toBe(800);
    expect(roundCurrency(result.unitPrice * 5)).toBe(4000);
  });

  it('calculates 0% GST rate on essential parts (Subtotal ₹500 -> CGST ₹0, SGST ₹0, Grand Total ₹500)', () => {
    const subtotal = toDecimal(500);
    const taxRate = toDecimal(0);
    const taxAmount = subtotal.times(taxRate).dividedBy(100);
    const grandTotal = subtotal.plus(taxAmount);

    expect(taxAmount.toNumber()).toBe(0);
    expect(grandTotal.toNumber()).toBe(500);
  });

  it('calculates 5% GST rate accurately (Subtotal ₹1,000 -> 2.5% CGST ₹25, 2.5% SGST ₹25, Grand Total ₹1,050)', () => {
    const subtotal = toDecimal(1000);
    const taxRate = toDecimal(5);
    const taxAmount = subtotal.times(taxRate).dividedBy(100);
    const cgst = taxAmount.dividedBy(2);
    const sgst = taxAmount.dividedBy(2);
    const grandTotal = subtotal.plus(taxAmount);

    expect(taxAmount.toNumber()).toBe(50);
    expect(cgst.toNumber()).toBe(25);
    expect(sgst.toNumber()).toBe(25);
    expect(grandTotal.toNumber()).toBe(1050);
  });

  it('calculates 12% GST rate accurately (Subtotal ₹1,000 -> 6% CGST ₹60, 6% SGST ₹60, Grand Total ₹1,120)', () => {
    const subtotal = toDecimal(1000);
    const taxRate = toDecimal(12);
    const taxAmount = subtotal.times(taxRate).dividedBy(100);
    const cgst = taxAmount.dividedBy(2);
    const sgst = taxAmount.dividedBy(2);
    const grandTotal = subtotal.plus(taxAmount);

    expect(taxAmount.toNumber()).toBe(120);
    expect(cgst.toNumber()).toBe(60);
    expect(sgst.toNumber()).toBe(60);
    expect(grandTotal.toNumber()).toBe(1120);
  });

  it('calculates 18% standard GST rate accurately (Subtotal ₹1,000 -> 9% CGST ₹90, 9% SGST ₹90, Grand Total ₹1,180)', () => {
    const subtotal = toDecimal(1000);
    const taxRate = toDecimal(18);
    const taxAmount = subtotal.times(taxRate).dividedBy(100);
    const cgst = taxAmount.dividedBy(2);
    const sgst = taxAmount.dividedBy(2);
    const grandTotal = subtotal.plus(taxAmount);

    expect(taxAmount.toNumber()).toBe(180);
    expect(cgst.toNumber()).toBe(90);
    expect(sgst.toNumber()).toBe(90);
    expect(grandTotal.toNumber()).toBe(1180);
  });

  it('calculates 28% luxury/automotive GST rate (Subtotal ₹1,000 -> 14% CGST ₹140, 14% SGST ₹140, Grand Total ₹1,280)', () => {
    const subtotal = toDecimal(1000);
    const taxRate = toDecimal(28);
    const taxAmount = subtotal.times(taxRate).dividedBy(100);
    const cgst = taxAmount.dividedBy(2);
    const sgst = taxAmount.dividedBy(2);
    const grandTotal = subtotal.plus(taxAmount);

    expect(taxAmount.toNumber()).toBe(280);
    expect(cgst.toNumber()).toBe(140);
    expect(sgst.toNumber()).toBe(140);
    expect(grandTotal.toNumber()).toBe(1280);
  });

  it('calculates Landed Cost accurately distributed across shipment units', () => {
    // 10 units at ₹800 base cost with ₹500 freight and ₹100 handling charges
    const landedCost = calculateLandedCost(800, 10, 500, 100, 10);
    // (500 + 100) / 10 = ₹60 extra per unit -> Landed Cost = ₹860
    expect(landedCost).toBe(860);
  });

  it('calculates Gross Profit and Gross Margin % accurately (Selling: ₹1000, Cost: ₹800)', () => {
    const { cogs, grossProfit, grossMarginPercent } = calculateGrossProfit(1000, 800, 1);
    expect(cogs).toBe(800);
    expect(grossProfit).toBe(200);
    expect(grossMarginPercent).toBe(20);
  });

  it('calculates Partial Payment and Balance Due correctly (Invoice: ₹10000, Paid: ₹6000)', () => {
    const { balanceDue, paymentStatus } = calculatePaymentBalance(10000, 6000);
    expect(balanceDue).toBe(4000);
    expect(paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('handles Full Payment status (Invoice: ₹5000, Paid: ₹5000)', () => {
    const { balanceDue, paymentStatus } = calculatePaymentBalance(5000, 5000);
    expect(balanceDue).toBe(0);
    expect(paymentStatus).toBe('PAID');
  });

  it('handles Unpaid status (Invoice: ₹3500, Paid: 0)', () => {
    const { balanceDue, paymentStatus } = calculatePaymentBalance(3500, 0);
    expect(balanceDue).toBe(3500);
    expect(paymentStatus).toBe('UNPAID');
  });

  it('prevents floating-point decimal rounding anomalies (e.g. 0.1 + 0.2)', () => {
    const d1 = toDecimal(0.1);
    const d2 = toDecimal(0.2);
    const sum = d1.plus(d2);
    expect(sum.toNumber()).toBe(0.3);
    expect(roundCurrency(99.994)).toBe(99.99);
    expect(roundCurrency(99.996)).toBe(100.00);
  });
});
