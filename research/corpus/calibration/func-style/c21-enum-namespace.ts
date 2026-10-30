// C21: an enum and a namespace used before their definitions, at module evaluation and inside a
// function.
export const later = (): number => Color.Red;

let enumError: string | null = null;
try {
  enumError = String(Color.Red);
} catch (e) {
  enumError = String(e);
}
export const enumAtEval = enumError;

enum Color {
  Red = 1,
}

export const ns = (): string => Tools.name;
namespace Tools {
  export const name = "tools";
}
