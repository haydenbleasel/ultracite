/*
 * Source:    excalidraw/excalidraw — packages/excalidraw/components/TTDDialog/useTTDChatStorage.ts,
 *            line 1 and lines 10-192 (the whole file but its other imports)
 * Commit:    4c00f31ddcc20086bac1020428819fe0b9a30bce (2026-10-08T11:11:53+02:00)
 * Permalink: https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/excalidraw/components/TTDDialog/useTTDChatStorage.ts#L77-L155
 * Hook:      useTTDChatStorage(), the saved-chat history of Excalidraw's text-to-diagram dialog.
 * Line 1 and lines 10-192 are copied, with their formatting changed. The stubs above them replace the
 * other imports (lines 2-8). Anything marked STUB is not part of the original source.
 *
 * License of the source repository (excalidraw/excalidraw/LICENSE), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2020 Excalidraw
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { useCallback, useEffect, useRef } from "react";
// STUB (not part of the original source): what lines 2-8 import, reduced to what this file uses.
// randomId (@excalidraw/common) returns increasing ids. atom, useAtom and getDefaultStore stand in
// for jotai through ../../editor-jotai: one shared store whose atoms are read with
// useSyncExternalStore and set like useState's setter (stable, as jotai's is). chatHistoryAtom is ./TTDContext.tsx L13-L17's
// atom, and the types are ./types.ts L27-L72's, reduced to the fields this file reads.
import { useSyncExternalStore } from "react";

let lastId = 0;
const randomId = () => `id-${++lastId}`;

interface Atom<T> {
  init: T;
}
type SetAtom<T> = (next: T | ((prev: T) => T)) => void;
const atomValues = new Map<Atom<unknown>, unknown>();
const atomListeners = new Set<() => void>();
const atom = <T>(init: T): Atom<T> => ({ init });
const defaultStore = {
  get: <T>(a: Atom<T>): T =>
    atomValues.has(a) ? (atomValues.get(a) as T) : a.init,
  set: <T>(a: Atom<T>, next: T | ((prev: T) => T)) => {
    const prev = atomValues.has(a) ? (atomValues.get(a) as T) : a.init;
    const value =
      typeof next === "function" ? (next as (p: T) => T)(prev) : next;
    if (!Object.is(prev, value)) {
      atomValues.set(a, value);
      for (const l of atomListeners) {
        l();
      }
    }
  },
};
export const getDefaultStore = () => defaultStore;
const subscribeToAtoms = (l: () => void) => {
  atomListeners.add(l);
  return () => {
    atomListeners.delete(l);
  };
};
const useAtom = <T>(a: Atom<T>): [T, SetAtom<T>] => {
  const value = useSyncExternalStore(subscribeToAtoms, () =>
    defaultStore.get(a)
  );
  // jotai's setter is stable for a given atom, as useState's is
  const set = useCallback<SetAtom<T>>((next) => defaultStore.set(a, next), [a]);
  return [value, set];
};

namespace TChat {
  export interface ChatMessage {
    id: string;
    timestamp: Date;
    isGenerating?: boolean;
    type: "user" | "assistant" | "warning";
    content?: string;
  }
  export interface ChatHistory {
    id: string;
    messages: ChatMessage[];
    currentPrompt: string;
  }
}
interface SavedChat {
  id: string;
  title: string;
  messages: TChat.ChatMessage[];
  currentPrompt: string;
  timestamp: number;
}
type SavedChats = SavedChat[];
interface TTDPersistenceAdapter {
  loadChats(): Promise<SavedChats>;
  saveChats(chats: SavedChats): Promise<void>;
}
export const chatHistoryAtom = atom<TChat.ChatHistory>({
  currentPrompt: "",
  id: randomId(),
  messages: [],
});
// ── end of STUB ────────────────────────────────────────────────────────

interface UseTTDChatStorageProps {
  persistenceAdapter: TTDPersistenceAdapter;
}

interface UseTTDChatStorageReturn {
  savedChats: SavedChats;
  saveCurrentChat: () => Promise<void>;
  deleteChat: (chatId: string) => Promise<SavedChats>;
  restoreChat: (chat: SavedChat) => SavedChat;
  createNewChatId: () => Promise<string>;
}

const generateChatTitle = (firstMessage: string): string => {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 50) {
    return trimmed;
  }
  return `${trimmed.slice(0, 47)}...`;
};

// Shared atom for saved chats - starts empty, populated via onLoadChats
export const savedChatsAtom = atom<SavedChats>([]);
export const isLoadingChatsAtom = atom<boolean>(false);
export const chatsLoadedAtom = atom<boolean>(false);

export const useTTDChatStorage = ({
  persistenceAdapter,
}: UseTTDChatStorageProps): UseTTDChatStorageReturn => {
  const [chatHistory] = useAtom(chatHistoryAtom);
  const [savedChats, setSavedChats] = useAtom(savedChatsAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingChatsAtom);
  const [chatsLoaded, setChatsLoaded] = useAtom(chatsLoadedAtom);

  // Ref to track latest savedChats for async operations
  const savedChatsRef = useRef(savedChats);
  savedChatsRef.current = savedChats;

  const lastMessageInHistory =
    chatHistory?.messages[chatHistory?.messages.length - 1];

  // Load chats on-demand
  const loadChats = useCallback(async () => {
    if (chatsLoaded || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const chats = await persistenceAdapter.loadChats();
      setSavedChats(chats);
      setChatsLoaded(true);
    } catch (error) {
      console.warn("Failed to load chats:", error);
      setSavedChats([]);
      setChatsLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    chatsLoaded,
    isLoading,
    setSavedChats,
    setIsLoading,
    setChatsLoaded,
    persistenceAdapter,
  ]);

  // INITIAL LOAD
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const saveCurrentChat = useCallback(async () => {
    if (chatHistory.messages.length === 0) {
      return;
    }

    const firstUserMessage = chatHistory.messages.find(
      (msg) => msg.type === "user"
    );
    if (!firstUserMessage || typeof firstUserMessage.content !== "string") {
      return;
    }

    const title = generateChatTitle(firstUserMessage.content);

    const currentSavedChats = savedChatsRef.current;
    const existingChat = currentSavedChats.find(
      (chat) => chat.id === chatHistory.id
    );

    const messagesChanged =
      !existingChat ||
      existingChat.messages.length !== chatHistory.messages.length ||
      existingChat.messages.some(
        (msg, i) =>
          msg.id !== chatHistory.messages[i]?.id ||
          msg.content !== chatHistory.messages[i]?.content
      );

    const chatToSave: SavedChat = {
      currentPrompt: chatHistory.currentPrompt,
      id: chatHistory.id,
      messages: chatHistory.messages
        .filter((msg) => msg.type === "user" || msg.type === "assistant")
        .map((msg) => ({
          ...msg,
          timestamp:
            msg.timestamp instanceof Date
              ? msg.timestamp
              : new Date(msg.timestamp),
        })),
      timestamp: messagesChanged
        ? Date.now()
        : (existingChat?.timestamp ?? Date.now()),
      title,
    };

    const updatedChats = [
      ...currentSavedChats.filter((chat) => chat.id !== chatHistory.id),
      chatToSave,
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    setSavedChats(updatedChats);

    try {
      await persistenceAdapter.saveChats(updatedChats);
    } catch (error) {
      console.warn("Failed to save chats:", error);
    }
  }, [chatHistory, setSavedChats, persistenceAdapter]);

  const previousAutoSaveTrigger = useRef<{
    isGenerating: boolean | undefined;
    lastMessageId: string | undefined;
    messageCount: number;
  } | null>(null);

  // Auto-save when generation completes
  useEffect(() => {
    const trigger = {
      isGenerating: lastMessageInHistory?.isGenerating,
      lastMessageId: lastMessageInHistory?.id,
      messageCount: chatHistory.messages?.length,
    };
    const previous = previousAutoSaveTrigger.current;
    previousAutoSaveTrigger.current = trigger;

    if (
      previous &&
      previous.messageCount === trigger.messageCount &&
      previous.lastMessageId === trigger.lastMessageId &&
      previous.isGenerating === trigger.isGenerating
    ) {
      return;
    }

    if (!trigger.isGenerating) {
      saveCurrentChat();
    }
  }, [
    chatHistory.messages?.length,
    lastMessageInHistory?.id,
    lastMessageInHistory?.isGenerating,
    saveCurrentChat,
  ]);

  const deleteChat = useCallback(
    async (chatId: string): Promise<SavedChats> => {
      const updatedChats = savedChatsRef.current.filter(
        (chat) => chat.id !== chatId
      );
      setSavedChats(updatedChats);

      try {
        await persistenceAdapter.saveChats(updatedChats);
      } catch (error) {
        console.warn("Failed to save after delete:", error);
      }

      return updatedChats;
    },
    [setSavedChats, persistenceAdapter]
  );

  const restoreChat = useCallback(
    (chat: SavedChat): SavedChat =>
      // Save is handled by the caller after state update
      chat,
    []
  );

  const createNewChatId = useCallback(async (): Promise<string> => {
    await saveCurrentChat();
    return randomId();
  }, [saveCurrentChat]);

  return {
    createNewChatId,
    deleteChat,
    restoreChat,
    saveCurrentChat,
    savedChats,
  };
};
