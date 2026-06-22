/** @deprecated see nf-program */
export const USER = process.env.CLAUDECODE ? 'Claude' : 'Standard';
export const IS_CLAUDE = USER === 'Claude';
