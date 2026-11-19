export interface Cat {
  name: string;
}

export const describeCat = (cat: Cat): string => cat.name;
