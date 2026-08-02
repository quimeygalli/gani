import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({});
const MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const CONFIGURE_SYSTEM = `You are an empathetic, efficient time-management assistant. Interview the user about their daily routine.

Guidelines:
1. Ask clear, direct, short questions (1-2 at a time).
2. Gather: day start/end times, main activity categories, fixed commitments, high-energy hours.
3. Once you have enough detail, end your reply with CONFIG_COMPLETE followed by a raw JSON block:

CONFIG_COMPLETE
{
  "day_start": "08:00",
  "day_end": "22:00",
  "peak_hours": ["09:00-12:00"],
  "categories": ["Study", "Coding", "Rest"]
}`;

const SCHEDULE_SYSTEM = `You are a time-blocking scheduler. Given user preferences, return a JSON array of time blocks for today.
Each object must have: title (string), category (string), start_time (ISO 8601), end_time (ISO 8601).
Return ONLY the raw JSON array — no markdown, no explanation.`;

async function callBedrock(system, messages) {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system,
      messages,
    }),
  }));
  const body = JSON.parse(Buffer.from(res.body).toString());
  return body.content[0].text;
}

export async function chatConfigure(history, userMessage) {
  const messages = [...history, { role: "user", content: userMessage }];
  const reply = await callBedrock(CONFIGURE_SYSTEM, messages);

  const isComplete = reply.includes("CONFIG_COMPLETE");
  let scheduleConfig = null;
  let cleanReply = reply;

  if (isComplete) {
    const match = reply.match(/\{[\s\S]+\}/);
    if (match) {
      try { scheduleConfig = JSON.parse(match[0]); } catch {}
    }
    cleanReply = reply.replace("CONFIG_COMPLETE", "").replace(/\{[\s\S]+\}/, "").trim()
      || "Perfect! I have everything I need. Your schedule is ready to generate.";
  }

  const updatedHistory = [...messages, { role: "assistant", content: reply }];
  return { message: cleanReply, isComplete, scheduleConfig, updatedHistory };
}

export async function generateSchedule(prefs) {
  const today = new Date().toISOString().split("T")[0];
  const prompt = `Today is ${today}. Generate a time-blocked schedule:
Day: ${prefs.day_start} to ${prefs.day_end}
Peak hours: ${JSON.stringify(prefs.peak_hours)}
Categories: ${JSON.stringify(prefs.categories)}
Create 6-10 blocks covering the full day.`;

  const raw = await callBedrock(SCHEDULE_SYSTEM, [{ role: "user", content: prompt }]);
  const clean = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  return JSON.parse(clean);
}
