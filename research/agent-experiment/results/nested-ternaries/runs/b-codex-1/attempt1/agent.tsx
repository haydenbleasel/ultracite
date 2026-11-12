/*
 * Source:    supabase/supabase — apps/studio/components/layouts/ExplorerLayout/
 *            ExplorerNavNotebooks.tsx, lines 21-114 (the whole file but its imports)
 * Commit:    09f80f528ec47569841408a81668dff90525c48a
 * Permalink: https://github.com/supabase/supabase/blob/09f80f528ec47569841408a81668dff90525c48a/apps/studio/components/layouts/ExplorerLayout/ExplorerNavNotebooks.tsx#L21-L114
 * Components: NotebookListItem and ExplorerNavNotebooks, Supabase Studio's list of a project's SQL
 *   notebooks in the explorer sidebar.
 * The lines below the stub import are copied, with their formatting changed. The import marked
 *   STUB replaces lines 1-19, eleven imports; stubs.tsx stands in for them.
 *
 * License of the source repository: Apache License 2.0 (supabase/supabase/LICENSE). Licensed under the
 * Apache License, Version 2.0; you may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0. This file is a copy of a Supabase file with its
 * imports replaced, as marked.
 */
// STUB: replaces lines 1-19 of the original (eleven imports; see stubs.tsx).
import {
  createTabId,
  ExplorerNavItem,
  ExplorerNavResourceWrapper,
  GenericSkeletonLoader,
  InfiniteListDefault,
  LoaderForIconMenuItems,
  useDebounce,
  useExplorerDeleteItem,
  useMemo,
  useNotebooksInfiniteQuery,
  useParams,
  useRouter,
  useState,
  useTabsStateSnapshot,
} from "./stubs";
import type { NotebookRow, RowComponentBaseProps } from "./stubs";

const NOTEBOOK_ROW_HEIGHT = 28;

type NotebookListItemProps = RowComponentBaseProps<NotebookRow> & {
  projectRef: string | undefined;
  activeNotebookId: string | undefined;
  onSelectDelete: (item: {
    id: string;
    type: "notebook" | "chat";
    name: string;
  }) => void;
};

const NotebookListItem = ({
  item: notebook,
  style,
  projectRef,
  activeNotebookId,
  onSelectDelete,
}: NotebookListItemProps) => {
  const isActive = activeNotebookId === notebook.id;
  const tabs = useTabsStateSnapshot();

  return (
    <ExplorerNavItem
      name={notebook.name}
      type="notebook"
      isActive={isActive}
      style={style}
      href={`/project/${projectRef}/explorer/notebook/${notebook.id}`}
      onDoubleClick={() =>
        tabs.makeTabPermanent(createTabId("notebook", { id: notebook.id }))
      }
      onSelectDelete={() =>
        onSelectDelete({
          id: notebook.id,
          type: "notebook",
          name: notebook.name,
        })
      }
    />
  );
};

export const ExplorerNavNotebooks = () => {
  const router = useRouter();
  const { ref, id } = useParams();
  const { onSelectDelete } = useExplorerDeleteItem();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const {
    data: notebooksData,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotebooksInfiniteQuery({
    projectRef: ref,
    limit: 100,
    name: search.length === 0 ? search : debouncedSearch,
  });

  const notebooks = useMemo(() => {
    const items = notebooksData?.pages.flatMap((page) => page.content) ?? [];
    return items;
  }, [notebooksData?.pages]);

  const activeNotebookId = router.pathname.includes("/explorer/notebook/")
    ? id
    : undefined;

  const itemProps = useMemo(
    () => ({ projectRef: ref, activeNotebookId, onSelectDelete }),
    [ref, activeNotebookId, onSelectDelete]
  );

  let content;
  if (isPending) {
    content = <GenericSkeletonLoader />;
  } else if (notebooks.length === 0) {
    content = (
      <p className="text-foreground-lighter px-2 py-2 text-xs">
        {search ? "No notebooks found" : "No notebooks created yet"}
      </p>
    );
  } else {
    content = (
      <InfiniteListDefault
        className="h-full w-full"
        items={notebooks}
        itemProps={itemProps}
        ItemComponent={NotebookListItem}
        LoaderComponent={LoaderForIconMenuItems}
        getItemKey={(index) => notebooks[index]?.id ?? `notebook-${index}`}
        getItemSize={() => NOTEBOOK_ROW_HEIGHT}
        gap={1}
        hasNextPage={hasNextPage}
        isLoadingNextPage={isFetchingNextPage}
        onLoadNextPage={fetchNextPage}
      />
    );
  }

  return (
    <ExplorerNavResourceWrapper
      type="notebook"
      search={search}
      setSearch={setSearch}
    >
      <div className="flex min-h-0 flex-1 flex-col p-3">
        {content}
      </div>
    </ExplorerNavResourceWrapper>
  );
};
