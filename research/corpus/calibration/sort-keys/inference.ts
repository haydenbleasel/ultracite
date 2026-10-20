// Calibration cases for TypeScript inference from context-sensitive callbacks, modelled on the
// TanStack Query and Router option objects that made Ultracite turn key sorting off in its
// TanStack presets. Nothing is imported: the generic functions are declared here. The
// sort-keys-linters.cjs --calibration step type-checks this file before and after each fix.

declare function useMutation<TData, TVariables, TContext>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => TContext;
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables, context: TContext | undefined) => void;
}): TData;

export const I01 = () =>
  useMutation({
    mutationFn: async (id: number) => ({ id, ok: true }),
    onMutate: (id) => ({ previous: id }),
    onError: (_error, _id, context) => {
      context?.previous.toFixed();
    },
    onSettled: (data, _error, _id, context) => {
      data?.ok.valueOf();
      context?.previous.toFixed();
    },
  });

declare function createRoute<TLoaderData>(options: {
  loader: (ctx: { params: { id: string } }) => TLoaderData;
  head?: (ctx: { loaderData: TLoaderData }) => { title: string };
  component: (props: { data: TLoaderData }) => string;
}): void;

export const I02 = () =>
  createRoute({
    loader: ({ params }) => ({ user: { name: params.id } }),
    head: ({ loaderData }) => ({ title: loaderData.user.name }),
    component: ({ data }) => data.user.name.toUpperCase(),
  });

declare function defineStore<TState>(options: {
  state: (initial: number) => TState;
  render: (state: TState) => string;
}): void;

export const I03 = () =>
  defineStore({
    state: (initial) => ({ count: initial }),
    render: (state) => state.count.toFixed(),
  });

// Controls. A callback with no parameters isn't context-sensitive, so TypeScript infers from it
// first wherever it sits (I04). Annotating the later callback's parameter removes the dependency
// (I05).
export const I04 = () =>
  createRoute({
    loader: () => ({ user: { name: "Ada" } }),
    head: ({ loaderData }) => ({ title: loaderData.user.name }),
    component: ({ data }) => data.user.name.toUpperCase(),
  });
export const I05 = () =>
  defineStore({
    state: (initial) => ({ count: initial }),
    render: (state: { count: number }) => state.count.toFixed(),
  });
