/*
 * STUB: stands in for the eleven modules ExplorerNavNotebooks.tsx imports in Supabase Studio
 * (React's useMemo and useState, Next.js's router, @uidotdev/usehooks, Supabase Studio's common
 * hooks, ShimmeringLoader, InfiniteList, the explorer layout's wrapper, item and provider, the
 * notebooks query and the tabs state) at supabase/supabase@09f80f528ec47569841408a81668dff90525c48a.
 * The hooks return values read from globalThis.__scenario; the components are inert stand-ins.
 * Types are reduced to what the file uses. Not part of the source.
 */
declare global {
  // biome-ignore lint/style/noNamespace: JSX's own namespace
  namespace JSX {
    type Element = unknown;
    type IntrinsicElements = Record<string, Record<string, unknown>>;
    interface ElementChildrenAttribute {
      children: unknown;
    }
  }
  var __scenario: Scenario | undefined;
  var __calls: string[] | undefined;
}

export interface NotebookRow {
  id: string;
  name: string;
}
interface Scenario {
  pathname: string;
  ref?: string;
  id?: string;
  search: string;
  isPending: boolean;
  pages?: { content: NotebookRow[] }[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}
const scenario = (): Scenario =>
  globalThis.__scenario ?? {
    hasNextPage: false,
    isFetchingNextPage: false,
    isPending: false,
    pathname: "/",
    search: "",
  };
const record = (name: string) => globalThis.__calls?.push(name);

// react
export const useMemo = <T,>(fn: () => T, _deps: unknown[]): T => fn();
export const useState = <T,>(initial: T): [T, (v: T) => void] => {
  record("useState");
  return [(scenario().search as unknown as T) ?? initial, () => {}];
};
// next/router, common, @uidotdev/usehooks
export const useRouter = () => ({ pathname: scenario().pathname });
export const useParams = () => ({ id: scenario().id, ref: scenario().ref });
export const useDebounce = <T,>(value: T, _ms: number): T => value;
// the notebooks query
export const useNotebooksInfiniteQuery = (args: {
  projectRef: string | undefined;
  limit: number;
  name: string;
}) => {
  record(`useNotebooksInfiniteQuery(${args.name})`);
  const s = scenario();
  return {
    data: s.pages ? { pages: s.pages } : undefined,
    fetchNextPage: () => {},
    hasNextPage: s.hasNextPage,
    isFetchingNextPage: s.isFetchingNextPage,
    isPending: s.isPending,
  };
};
// the explorer provider and the tabs state
export const useExplorerDeleteItem = () => ({
  onSelectDelete: (_item: {
    id: string;
    type: "notebook" | "chat";
    name: string;
  }) => {},
});
export const useTabsStateSnapshot = () => ({
  makeTabPermanent: (_id: string) => {},
});
export const createTabId = (type: string, o: { id: string }) =>
  `${type}-${o.id}`;
// components: inert stand-ins (each returns null)
const stub = <P,>(name: string) => {
  const c = (_props: P): JSX.Element => null;
  Object.defineProperty(c, "name", { value: name });
  (c as unknown as { __stub: boolean }).__stub = true;
  return c;
};
export interface RowComponentBaseProps<T> {
  item: T;
  style?: unknown;
}
export const GenericSkeletonLoader = stub<Record<string, never>>(
  "GenericSkeletonLoader"
);
export const LoaderForIconMenuItems = stub<Record<string, never>>(
  "LoaderForIconMenuItems"
);
export const ExplorerNavResourceWrapper = stub<{
  type: string;
  search: string;
  setSearch: (s: string) => void;
  children?: unknown;
}>("ExplorerNavResourceWrapper");
export const ExplorerNavItem = stub<Record<string, unknown>>("ExplorerNavItem");
export const InfiniteListDefault = stub<{
  className?: string;
  items: NotebookRow[];
  itemProps: Record<string, unknown>;
  ItemComponent: unknown;
  LoaderComponent: unknown;
  getItemKey: (index: number) => string;
  getItemSize: (index: number) => number;
  gap?: number;
  hasNextPage: boolean;
  isLoadingNextPage: boolean;
  onLoadNextPage: () => void;
}>("InfiniteListDefault");
