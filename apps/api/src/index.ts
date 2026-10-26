import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3001);

serve(
  {
    fetch: createApp().fetch,
    port,
    hostname: "0.0.0.0",
  },
  (info) => {
    console.log(`api listening on ${info.port}`);
  },
);
