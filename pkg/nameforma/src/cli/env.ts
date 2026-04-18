export const USER = process.env.CLAUDECODE ? 'Claude' : 'Standard';
export const IS_CLAUDE = USER === 'Claude';
export const IS_AGENT = IS_CLAUDE;
