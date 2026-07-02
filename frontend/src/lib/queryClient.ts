import { QueryClient } from "@tanstack/react-query";

/** Shared TanStack Query client — server-state cache for the whole app (spec §3). */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
