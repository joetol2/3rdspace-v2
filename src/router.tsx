import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // GitHub Pages serves each route as a real directory + index.html
    // (e.g. /calendar/index.html), so every internal link needs a
    // trailing slash to resolve on a hard navigation. This makes every
    // <Link>-generated href consistent without having to update each one
    // by hand.
    trailingSlash: "always",
  });

  return router;
};
