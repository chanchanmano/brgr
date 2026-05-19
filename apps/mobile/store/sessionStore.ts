import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

import type { Message } from "../types/order";

type SessionStore = {
  sessionId: string;
  messages: Message[];
  addMessage: (msg: Message) => void;
  clearChat: () => void;
};

function welcomeMessage(): Message {
  return {
    id: uuidv4(),
    role: "penny",
    text: "Hi, I'm Penny. Tell me what sounds good and I'll shape the order.",
    ts: Date.now()
  };
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      sessionId: uuidv4(),
      messages: [welcomeMessage()],
      addMessage: (msg) =>
        set((state) => ({
          messages: [...state.messages, msg]
        })),
      clearChat: () =>
        set({
          messages: [welcomeMessage()]
        })
    }),
    {
      name: "brgr-session",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessionId: state.sessionId
      })
    }
  )
);

