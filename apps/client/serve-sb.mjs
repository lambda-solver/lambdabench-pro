import { serve, file } from "bun";
const port = parseInt(process.argv[2] || "6006");
serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    try {
      return new Response(file("storybook-static" + path));
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
});
console.log(`Serving storybook-static on http://127.0.0.1:${port}`);
