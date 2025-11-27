"use client";

import { useI18n } from "fumadocs-ui/contexts/i18n";
import { CheckIcon, LanguagesIcon } from "lucide-react";
import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const LanguageSelector = () => {
  const { locale, locales, onChange } = useI18n();
  const [open, setOpen] = React.useState(false);

  if (!locales) {
    return null;
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        aria-label="Select language"
        className="flex items-center justify-center rounded-md p-2 hover:bg-muted"
      >
        <LanguagesIcon className="size-4.5" />
        <span className="sr-only">Select language</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <Command>
          <CommandInput className="h-9" placeholder="Search language..." />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandList className="max-h-52 overflow-y-auto">
            {locales
              .sort((a, b) => a.locale.localeCompare(b.locale))
              .map((lang) => (
                <CommandItem
                  className="flex cursor-pointer items-center justify-between"
                  disabled={locale === lang.locale}
                  key={lang.locale}
                  onSelect={() => {
                    if (locale !== lang.locale) {
                      onChange?.(lang.locale);
                      setOpen(false);
                    }
                  }}
                  value={lang.name}
                >
                  <span>{lang.name}</span>
                  {locale === lang.locale && <CheckIcon className="size-4" />}
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
