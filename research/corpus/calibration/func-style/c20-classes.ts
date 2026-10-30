// C20: classes: `new` inside a function (deferred), and `extends` at module evaluation.
export const build = (): Base => new Base();

let extendsError: string | null = null;
try {
  class Child extends Base {}
  void Child;
} catch (e) {
  extendsError = String(e);
}
export const childError = extendsError;

class Base {}
