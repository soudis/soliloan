import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { withoutLoan } from './lender-notes-files';

describe('withoutLoan', () => {
  it('keeps only notes and files that belong to no Kredit, in their order', () => {
    const items = [
      { id: 'a', loanId: null },
      { id: 'b', loanId: 'loan-1' },
      { id: 'c', loanId: null },
    ];

    assert.deepEqual(
      withoutLoan(items).map((item) => item.id),
      ['a', 'c'],
    );
  });

  it('returns an empty list when every item belongs to a Kredit', () => {
    assert.deepEqual(withoutLoan([{ id: 'a', loanId: 'loan-1' }]), []);
  });
});
