/*
 * Nested-ternaries subject B: conditional rendering where no statement can go.
 *
 * Source:    supabase/supabase — apps/studio/components/layouts/ExplorerLayout/
 *            ExplorerNavNotebooks.tsx, lines 21-114 (the whole file but its imports)
 * Commit:    09f80f528ec47569841408a81668dff90525c48a
 * Permalink: https://github.com/supabase/supabase/blob/09f80f528ec47569841408a81668dff90525c48a/apps/studio/components/layouts/ExplorerLayout/ExplorerNavNotebooks.tsx#L21-L114
 * Components: NotebookListItem and ExplorerNavNotebooks, Supabase Studio's list of a project's SQL
 *   notebooks in the explorer sidebar: a loader while the query is pending, a message when there
 *   are no notebooks (one text for a search with no results, another for none created), otherwise
 *   an infinite list.
 * Rules it hits: see examples.json (measured with nested-ternaries-examples.cjs).
 * Why it needs a restructure: the nested ternary is a JSX child inside two wrappers
 *   (ExplorerNavResourceWrapper and a div), where no statement can go. Early returns from the
 *   component would have to repeat both wrappers. The usual fixes move the decision above the
 *   return (a variable set by if/else, or a helper that returns early) or into a child component.
 * What the project did: the chain arrived with supabase/supabase#49254 (2893c783d5, 2026-08-20,
 *   "Hook up APIs for Notebooks CRUD") and survived #49321 ("Set up infinite loading for notebooks"),
 *   #49368, #50188, #50453, #50558 and #50701 (14bda8a5cf, 2026-09-22) unchanged (gh api, read-only).
 * Behaviour to preserve: for every scenario (pending or not; no, one or many notebooks over one or
 *   more pages; search empty or not; a notebook route open or not), the rendered tree: the wrapper
 *   and its props once, the loader while pending, the empty message with its search-dependent text,
 *   and the list with every prop; and the hooks, called in the same order every render (a child
 *   component must not call them conditionally).
 * Expected response: compute the content above the return (`let content` set by if/else, or a
 *   small helper that returns early) and render `{content}` inside the wrappers, or extract a child
 *   component that takes isPending, notebooks, search and the list props.
 * Tempting responses: `{notebooks.length && <InfiniteListDefault … />}`, which renders 0 when the list
 *   is empty; three && conditions that drop `!isPending` from the later ones; early returns that
 *   repeat the wrappers; a child component that calls the query hook itself.
 * Gaming moves (measured in examples.json): suppression comments; an IIFE in the JSX; a helper that
 *   wraps the inner ternary; the inner ternary moved into a variable.
 * The lines below the stub import are copied verbatim. The import (marked STUB) replaces lines 1-19,
 *   eleven imports; nested-ternaries-b-stubs.tsx stands in for them.
 *
 * License of the source repository (supabase/supabase/LICENSE), Apache License 2.0 (in full in
 * research/corpus/examples/licenses/supabase-LICENSE). This file is a copy of a Supabase file with
 * its imports replaced, as marked.
 */
// STUB: replaces lines 1-19 of the original (eleven imports; see nested-ternaries-b-stubs.tsx).
import {
  createTabId,
  ExplorerNavItem,
  ExplorerNavResourceWrapper,
  GenericSkeletonLoader,
  InfiniteListDefault,
  LoaderForIconMenuItems,
  type NotebookRow,
  type RowComponentBaseProps,
  useDebounce,
  useExplorerDeleteItem,
  useMemo,
  useNotebooksInfiniteQuery,
  useParams,
  useRouter,
  useState,
  useTabsStateSnapshot,
} from "./nested-ternaries-b-stubs";

const NOTEBOOK_ROW_HEIGHT = 28

type NotebookListItemProps = RowComponentBaseProps<NotebookRow> & {
  projectRef: string | undefined
  activeNotebookId: string | undefined
  onSelectDelete: (item: { id: string; type: 'notebook' | 'chat'; name: string }) => void
}

const NotebookListItem = ({
  item: notebook,
  style,
  projectRef,
  activeNotebookId,
  onSelectDelete,
}: NotebookListItemProps) => {
  const isActive = activeNotebookId === notebook.id
  const tabs = useTabsStateSnapshot()

  return (
    <ExplorerNavItem
      name={notebook.name}
      type="notebook"
      isActive={isActive}
      style={style}
      href={`/project/${projectRef}/explorer/notebook/${notebook.id}`}
      onDoubleClick={() => tabs.makeTabPermanent(createTabId('notebook', { id: notebook.id }))}
      onSelectDelete={() =>
        onSelectDelete({ id: notebook.id, type: 'notebook', name: notebook.name })
      }
    />
  )
}

export const ExplorerNavNotebooks = () => {
  const router = useRouter()
  const { ref, id } = useParams()
  const { onSelectDelete } = useExplorerDeleteItem()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

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
  })

  const notebooks = useMemo(() => {
    const items = notebooksData?.pages.flatMap((page) => page.content) ?? []
    return items
  }, [notebooksData?.pages])

  const activeNotebookId = router.pathname.includes('/explorer/notebook/') ? id : undefined

  const itemProps = useMemo(
    () => ({ projectRef: ref, activeNotebookId, onSelectDelete }),
    [ref, activeNotebookId, onSelectDelete]
  )

  return (
    <ExplorerNavResourceWrapper type="notebook" search={search} setSearch={setSearch}>
      <div className="flex flex-1 min-h-0 flex-col p-3">
        {isPending ? (
          <GenericSkeletonLoader />
        ) : notebooks.length === 0 ? (
          <p className="px-2 py-2 text-xs text-foreground-lighter">
            {search ? 'No notebooks found' : 'No notebooks created yet'}
          </p>
        ) : (
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
        )}
      </div>
    </ExplorerNavResourceWrapper>
  )
}

