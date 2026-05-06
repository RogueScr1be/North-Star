/**
 * EDITABLE ELEMENT DETECTION
 * Utility for checking if a keyboard event target is an editable field
 * Used by global keyboard shortcuts to prevent blocking user input
 *
 * Covers: input, textarea, select, contenteditable, and ARIA role attributes
 */

/**
 * Check if an element is editable, excluding a specific search input element
 * @param target - The element to check
 * @param isExemptElement - If true, this element is exempt from editable detection (e.g., search input)
 * @returns true if the element should block keyboard shortcuts
 */
export function isEditableElement(target: Element | null, isExemptElement: boolean = false): boolean {
  if (!target || isExemptElement) {
    return false;
  }

  // Standard editable inputs
  if (target instanceof HTMLInputElement) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement) {
    return true;
  }

  // Select dropdowns
  if (target instanceof HTMLSelectElement) {
    return true;
  }

  // Contenteditable divs/spans (only HTMLElement has contentEditable property)
  if (target instanceof HTMLElement && target.contentEditable === 'true') {
    return true;
  }

  // ARIA role-based editable elements
  const role = target.getAttribute('role');
  if (role === 'textbox' || role === 'combobox' || role === 'searchbox') {
    return true;
  }

  return false;
}
