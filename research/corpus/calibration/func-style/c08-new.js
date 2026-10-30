// C08: a declaration called with `new`, given a prototype, and used with instanceof.
function Point(x, y) {
  this.x = x;
  this.y = y;
}
Point.prototype.norm = function norm() {
  return Math.hypot(this.x, this.y);
};

export const p = new Point(3, 4);
export const isPoint = p instanceof Point;
