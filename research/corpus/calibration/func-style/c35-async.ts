// C35: async declarations and async arrows.
export async function load(url: string): Promise<string> {
  return url;
}

export const loadArrow = async (url: string): Promise<string> => url;
