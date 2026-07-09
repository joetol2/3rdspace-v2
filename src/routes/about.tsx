import { createFileRoute, redirect } from "@tanstack/react-router";

// The About page was renamed to Mission. Keep this route as a redirect so
// existing /about links (bookmarks, external links) still work.
export const Route = createFileRoute("/about")({
  beforeLoad: () => {
    throw redirect({ to: "/mission" });
  },
});
