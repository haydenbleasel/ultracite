"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export const SearchButton = () => {
  const { setOpenSearch } = useSearchContext();

  return (
    <Button
      className="justify-between gap-8 bg-card pr-1.5 font-normal text-muted-foreground shadow-none"
      onClick={() => setOpenSearch(true)}
      size="sm"
      type="button"
      variant="outline"
    >
      <span>Search...</span>
      <Kbd className="border bg-transparent font-medium">⌘K</Kbd>
    </Button>
  );
};
