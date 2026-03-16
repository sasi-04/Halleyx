"use client";

import { create } from "zustand";

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface AiChatState {
  messages: AiMessage[];
  addMessage: (msg: AiMessage) => void;
  clear: () => void;
}

export const useAiChatStore = create<AiChatState>((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  clear: () => set({ messages: [] }),
}));

