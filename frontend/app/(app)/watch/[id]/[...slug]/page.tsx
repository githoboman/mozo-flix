/**
 * URL: /watch/[id]/[...slug]
 *
 * Re-export of the canonical /watch/[id] page so pretty URLs like
 * /watch/8/bitcoin-advice-you-need-now resolve to the same component.
 * The slug is decorative; the page reads `params.id` (which still
 * resolves through the parent dynamic segment) and ignores `params.slug`.
 */
export { default } from "../page";
