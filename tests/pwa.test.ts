import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { serviceWorker } from "../src/lib/pwa-worker";
import manifest from "../src/app/manifest";

test("manifesto permite instalar o mesmo app no escopo raiz", () => {
  const app = manifest();
  assert.equal(app.display, "standalone");
  assert.equal(app.scope, "/");
  assert.equal(app.id, "/");
  assert.ok(app.icons?.some((icon) => icon.sizes === "192x192"));
  assert.ok(
    app.icons?.some(
      (icon) => icon.sizes === "512x512" && icon.purpose === "maskable",
    ),
  );
});

test("worker não intercepta mutações, arquivos privados ou pedidos de outras origens", () => {
  const listeners: Record<string, (event: unknown) => void> = {};
  runInNewContext(serviceWorker, {
    self: {
      location: { origin: "https://hc.example" },
      addEventListener: (name: string, fn: (e: unknown) => void) => {
        listeners[name] = fn;
      },
    },
    URL,
  });
  let intercepted = false;
  for (const request of [
    { method: "POST", mode: "navigate", url: "https://hc.example/" },
    {
      method: "GET",
      mode: "cors",
      url: "https://hc.example/media/banners/private",
    },
    { method: "GET", mode: "navigate", url: "https://other.example/" },
  ])
    listeners.fetch({
      request,
      respondWith: () => {
        intercepted = true;
      },
    });
  assert.equal(intercepted, false);
});

test("navegação mantém resposta da rede; sem conexão entrega somente aviso público", async () => {
  const listeners: Record<string, (event: unknown) => void> = {};
  const cached: string[] = [];
  let fail = false;
  const network = new Response("dados privados");
  const offline = new Response("aviso público");
  runInNewContext(serviceWorker, {
    self: {
      location: { origin: "https://hc.example" },
      addEventListener: (name: string, fn: (e: unknown) => void) => {
        listeners[name] = fn;
      },
    },
    URL,
    Response,
    fetch: async () => {
      if (fail) throw new Error("offline");
      return network;
    },
    caches: {
      open: async () => ({
        match: async (path: string) => {
          cached.push(path);
          return offline;
        },
      }),
    },
  });
  const request = {
    method: "GET",
    mode: "navigate",
    url: "https://hc.example/?view=partnerships",
  };
  let result: Promise<Response> | undefined;
  const event = {
    request,
    respondWith: (response: Promise<Response>) => {
      result = response;
    },
  };
  listeners.fetch(event);
  assert.equal(await result, network);
  assert.deepEqual(cached, []);
  fail = true;
  listeners.fetch(event);
  assert.equal(await result, offline);
  assert.deepEqual(cached, ["/offline"]);
});
