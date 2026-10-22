// The parameter is required, so `loadPage()` is TS2554 (#851).
declare const loadPage: (cursor: string | undefined) => void;

loadPage(undefined);
