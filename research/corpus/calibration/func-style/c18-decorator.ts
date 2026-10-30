// C18: a class decorator defined below the class (TDZ when the class is defined).
let error: string | null = null;
try {
  @register
  class Widget {}
  void Widget;
} catch (e) {
  error = String(e);
}
export const decoratorError = error;

const register = (target: unknown, _context: ClassDecoratorContext): void => {
  void target;
};
