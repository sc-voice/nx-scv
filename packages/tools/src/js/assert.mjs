export class Assert {
  static ok(expr, msg) {
    if (!expr) {
      throw new Error(msg || 'Unknown assertion error');
    }
    return expr;
  }
}
