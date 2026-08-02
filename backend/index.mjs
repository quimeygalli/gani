import { readFileSync } from "fs";
import { chatConfigure, generateSchedule } from "./agent.mjs";
import { loadHistory, saveHistory, loadPrefs, savePrefs, loadBlocks, saveBlocks } from "./db.mjs";

const DEMO_USER = "demo";
const DEMO_SESSION = "demo-session";

const FRONTEND_HTML = readFileSync(new URL("./frontend.html", import.meta.url), "utf8");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const method = event.httpMethod ?? event.requestContext?.http?.method;
  const path = event.path ?? event.rawPath ?? "/";

  if (method === "OPTIONS") return json(200, {});

  // Serve frontend for any GET that isn't an API call
  if (method === "GET" && !path.includes("/api/")) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: FRONTEND_HTML,
    };
  }

  try {
    // POST /api/chat/configure/
    if (method === "POST" && path.includes("/chat/configure")) {
      const { message } = JSON.parse(event.body ?? "{}");
      if (!message) return json(400, { error: "message required" });

      const history = await loadHistory(DEMO_SESSION);
      const result = await chatConfigure(history, message);
      await saveHistory(DEMO_SESSION, result.updatedHistory);

      if (result.isComplete && result.scheduleConfig) {
        await savePrefs(DEMO_USER, result.scheduleConfig);
      }

      return json(200, {
        message: result.message,
        is_complete: result.isComplete,
        schedule_config: result.scheduleConfig,
      });
    }

    // POST /api/schedule/generate/
    if (method === "POST" && path.includes("/schedule/generate")) {
      const prefs = await loadPrefs(DEMO_USER);
      if (!prefs) return json(400, { error: "Run chat setup first" });

      const blocks = await generateSchedule(prefs);
      const withIds = blocks.map((b, i) => ({ id: i + 1, ...b, is_completed: false, order: i }));
      await saveBlocks(DEMO_USER, withIds);
      return json(200, withIds);
    }

    // GET /api/timeblocks/
    if (method === "GET" && path.includes("/timeblocks") && !path.match(/\/timeblocks\/\d+/)) {
      const blocks = await loadBlocks(DEMO_USER);
      return json(200, blocks);
    }

    // PATCH /api/timeblocks/<id>/
    if (method === "PATCH" && path.match(/\/timeblocks\/\d+/)) {
      const id = parseInt(path.match(/\/timeblocks\/(\d+)/)[1]);
      const patch = JSON.parse(event.body ?? "{}");
      const blocks = await loadBlocks(DEMO_USER);
      const updated = blocks.map(b => b.id === id ? { ...b, ...patch } : b);
      await saveBlocks(DEMO_USER, updated);
      return json(200, updated.find(b => b.id === id));
    }

    return json(404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message });
  }
}
