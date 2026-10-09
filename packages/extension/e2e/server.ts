import { createServer, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

/** Serves the built site and records the Human-Txt header of every request. */
export function serveSite(root: string) {
  const seenHeaders: (string | undefined)[] = [];
  const server: Server = createServer(async (req, res) => {
    seenHeaders.push(req.headers["human-txt"] as string | undefined);
    const path = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(root, path);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return {
    seenHeaders,
    listen: () => new Promise<number>((r) => server.listen(0, () => r((server.address() as { port: number }).port))),
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
