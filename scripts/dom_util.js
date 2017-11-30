/**
 *
 * @param {Element} elt
 */
export function hideElement(elt) {
  elt.classList.add("invisible");
}

/**
 *
 * @param {Element} elt
 */
export function showElement(elt) {
  elt.classList.remove("invisible");
}