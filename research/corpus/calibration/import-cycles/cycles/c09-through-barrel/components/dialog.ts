import { Button } from ".";

export const Dialog = (title: string): string =>
  `<dialog>${title}${Button("Close")}</dialog>`;
