import { Redirect, type Href } from "expo-router";

import { useAuthStore } from "../store/authStore";

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  // Wait for AsyncStorage to rehydrate before deciding where to go.
  if (!hydrated) return null;

  return <Redirect href={(user ? "/(tabs)" : "/onboarding") as Href} />;
}
