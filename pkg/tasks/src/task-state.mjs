/**
 * TaskState enum - represents the lifecycle state of a task
 * @enum {string}
 */
export const TaskState = Object.freeze({
  BLOCKED: 'blocked',
  PENDING: 'pending',
  ACTIVE: 'active',
  DONE: 'done'
});
