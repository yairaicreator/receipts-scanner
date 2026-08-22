// The three knobs the prototype exposed as editor props. They were design-time
// settings, not user-facing controls, so they stay configuration here.

/** Shown next to every amount. The user's default is the shekel. */
export const CURRENCY = '₪';

/** 'bar' — spend per category, or 'line' — cumulative spend over time. */
export const CHART_TYPE = 'bar';

/** Whether the review form asks for the product/vendor. */
export const SHOW_VENDOR_FIELD = true;

/** Longest edge of the photo posted for reading, in px. */
export const MAX_PHOTO_DIMENSION = 1600;
