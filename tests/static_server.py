"""Serve the production build beneath a Pages-like repository path for tests."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT: Path = Path("dist").resolve()
BASE: str = "/aircraft-fuel-system-lab/"


class PagesHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        request_path: str = unquote(urlsplit(path).path)
        if not request_path.startswith(BASE):
            return str(ROOT / "__missing__")
        candidate: Path = (ROOT / (request_path[len(BASE):] or "index.html")).resolve()
        if not candidate.is_relative_to(ROOT):
            return str(ROOT / "__missing__")
        return str(candidate)

    def log_message(self, format: str, *args: object) -> None:
        pass


if __name__ == "__main__":
    server: ThreadingHTTPServer = ThreadingHTTPServer(("127.0.0.1", 3128), PagesHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
