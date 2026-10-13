import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateSavingsDepositCountFromMonthlyAmount, calculateSavingsMonthlyAmount } from './savings-contract';

describe('calculateSavingsMonthlyAmount', () => {
  it('rounds a monthly amount of exactly half a cent up', () => {
    assert.equal((169 * 100) / 40, 422.5, 'premise: 169 euros over 40 deposits ends in exactly half a cent');
    assert.equal(calculateSavingsMonthlyAmount(169, 40)?.toFixed(2), '4.23');
  });
});

describe('calculateSavingsDepositCountFromMonthlyAmount', () => {
  it('adds no deposit when the amount is an exact multiple of the monthly amount', () => {
    assert.equal(37 * 11130, 411810, 'premise: 4118.10 euros are exactly 37 deposits of 111.30 euros');
    assert.equal(calculateSavingsDepositCountFromMonthlyAmount(4118.1, 111.3), 37);
  });

  it('returns null for a monthly amount below one cent', () => {
    assert.equal(calculateSavingsDepositCountFromMonthlyAmount(4118.1, 0.001), null);
  });
});
