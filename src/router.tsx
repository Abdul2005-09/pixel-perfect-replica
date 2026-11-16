import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient();

  // Prevent the browser from briefly restoring an old scroll position (for example,
  // the footer) when the site is opened from an external link.
  if (typeof window !== "undefined") {
    window.history.scrollRestoration = "manual";
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: false,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
