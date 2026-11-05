import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateSavingsMonthlyAmount } from './savings-contract';

describe('calculateSavingsMonthlyAmount', () => {
  it('rounds a monthly amount of exactly half a cent up', () => {
    assert.equal((169 * 100) / 40, 422.5, 'premise: 169 euros over 40 deposits ends in exactly half a cent');
    assert.equal(calculateSavingsMonthlyAmount(169, 40)?.toFixed(2), '4.23');
  });
});
