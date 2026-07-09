import { createFileRoute, redirect } from "@tanstack/react-router";

// Details and Guidelines are now one combined page. Keep this route as a
// redirect so existing /guidelines links (e.g. from the footer) still work.
export const Route = createFileRoute("/guidelines")({
  beforeLoad: () => {
    throw redirect({ to: "/details", hash: "guidelines" });
  },
});
