// The same chain as a switch.
type Kind = "info" | "warn" | "error";
export const icon = (kind: Kind): string => {
  switch (kind) {
    case "info": {
      return "i";
    }
    case "warn": {
      return "!";
    }
    case "error": {
      return "x";
    }
    default: {
      return "?";
    }
  }
};
