export class Assert {
  static ok(expr: any, msg?: string): any {
    if (!expr) {
      throw new Error(msg || 'Unknown assertion error');
    }
    return expr;
  }
}
