import { generateKeyBetween } from 'fractional-indexing';

/**
 * Given an ordered list of items and a target index,
 * compute the fractional position string to insert at that index.
 */
function getPositionBetween(
  items: { position: string }[],
  index: number,
): string {
  const before = index > 0 ? items[index - 1].position : null;
  const after = index < items.length ? items[index].position : null;
  return generateKeyBetween(before, after);
}

/**
 * Given a list and a move operation, compute the new position
 * for the moved item without mutating the array.
 *
 * Removes the active item first (to simulate its absence),
 * then finds the slot at overIndex in the remaining array.
 */
export function computeMovePosition(
  items: { id: string; position: string }[],
  activeId: string,
  overIndex: number,
): string {
  const rest = items.filter((i) => i.id !== activeId);
  return getPositionBetween(rest, overIndex);
}
