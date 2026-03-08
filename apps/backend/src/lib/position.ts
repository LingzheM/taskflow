import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export { generateKeyBetween };

/**
 * Get the position string to place an item at the end of a list
 * @param before 
 * @returns 
 */
export function positionAtEnd(lastPosition: string | null): string {
    return generateKeyBetween(lastPosition, null);
}


/**
 * Get the position string to place an item at the beginning of a list
 * @param before 
 * @returns 
 */
export function positionAtStart(before: string | null): string {
    return generateKeyBetween(null, before);
}

/**
 * Get a position between two existing positions
 * @param a 
 * @param b 
 * @returns 
 */
export function positionBetween(a: string | null, b: string | null): string {
    return generateKeyBetween(a, b);
}

/**
 * Generate initial positions for N items
 * @param count 
 * @returns 
 */
export function generateInitialPositions(count: number): string[] {
    return generateNKeysBetween(null, null, count);
}


/**
 * Given an ordered list of items and a target index,
 * compute the fractional position string to insert at that index.
 * @param items 
 * @param index 
 * @returns 
 */
export function getPositionBetween(
    items: { postition: string }[],
    index: number,
): string {
    const before = index > 0 ? items[index -1].postition : null;
    const after = index < items.length ? items[index].postition : null;
    return generateKeyBetween(before, after);
}


/**
 * Given an array and a move operation (from -> to index),
 * compute the new position for the moved item without mutating the array.
 * @param items 
 * @param activeId 
 * @param overIndex 
 * @returns 
 */
export function computeMovePosition(
    items: { id: string; position: string }[],
    activeId: string,
    overIndex: number,
): string {
    // Remove the active item to get the "rest" array
    const rest = items.filter((i) => i.id !== activeId);
    return getPositionBetween(rest, overIndex);
}