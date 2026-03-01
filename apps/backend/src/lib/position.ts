import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export { generateKeyBetween };

/**
 * Get the position string to place an item at the end of a list
 * @param before 
 * @returns 
 */
export function positionAtEnd(before: string | null): string {
    return generateKeyBetween(null, before);
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