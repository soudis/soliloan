/** 1-based page indices. Ellipsis for gaps when total pages large. Pattern common in MUI / Radix / shadcn-style pagers. */
export type PaginationItem = number | 'ellipsis';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * @param total - total page count
 * @param current - 1-based current page
 * @param siblingCount - pages shown on each side of current (inside window)
 */
export function getPaginationItems(total: number, current: number, siblingCount = 1): PaginationItem[] {
  if (total < 1) return [];
  if (total === 1) return [1];

  const totalNumbers = siblingCount * 2 + 5;
  if (total <= totalNumbers) {
    return range(1, total);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    return [...range(1, Math.min(leftItemCount, total)), 'ellipsis', total];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const start = Math.max(1, total - rightItemCount + 1);
    return [1, 'ellipsis', ...range(start, total)];
  }

  if (showLeftEllipsis && showRightEllipsis) {
    return [1, 'ellipsis', ...range(leftSibling, rightSibling), 'ellipsis', total];
  }

  return range(1, total);
}
