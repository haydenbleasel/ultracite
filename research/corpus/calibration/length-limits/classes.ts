// Calibration case F01 for max-classes-per-file (length-calibration.cjs): an `export default class`,
// a class declaration, a class expression and an abstract class. ESLint and Oxlint count all four.
// Nothing here is run.

// F01: four classes
export default class A {}

export class B {}

export const C = class {};

export abstract class D {}
