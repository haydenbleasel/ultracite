declare const load: () => Promise<string[]>;
declare const render: (rows: string[]) => void;

export const refresh = () => {
  load().then(render).catch(reportError);
};
