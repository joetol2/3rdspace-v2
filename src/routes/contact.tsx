import { createFileRoute, redirect } from "@tanstack/react-router";

// Request the Space and Contact are now one combined page. Keep this route
// as a redirect so existing /contact links (e.g. from the homepage) still work.
export const Route = createFileRoute("/contact")({
  beforeLoad: () => {
    throw redirect({ to: "/request", hash: "contact" });
  },
});
