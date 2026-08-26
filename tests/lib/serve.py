"""Serve the built site the way GitHub Pages does, with a 404.html fallback.

Usage: python3 tests/lib/serve.py [port]
"""
import http.server
import os
import sys

ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".output",
    "public",
)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path) and not os.path.exists(os.path.join(path, "index.html")):
            self.path = "/404.html"
        elif not os.path.isdir(path) and not os.path.exists(path):
            self.path = "/404.html"
        return super().send_head()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8943
    if not os.path.isdir(ROOT):
        sys.exit("No build found at %s. Run: bun run build" % ROOT)
    http.server.HTTPServer(("127.0.0.1", port), Handler).serve_forever()
