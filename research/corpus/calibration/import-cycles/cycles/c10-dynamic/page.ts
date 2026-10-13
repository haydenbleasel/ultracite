export const renderPage = (path: string): string => `<main>${path}</main>`;

export const goHome = async (): Promise<string> => {
  const { navigate } = await import("./router");
  return navigate("/");
};
