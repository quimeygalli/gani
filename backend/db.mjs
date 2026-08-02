import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SESSIONS_TABLE ?? "agent-sessions";

export async function loadSession(sessionId) {
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { sessionId } }));
  return r.Item ?? null;
}

export async function saveSession(sessionId, data) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { sessionId, ...data, ttl: Math.floor(Date.now() / 1000) + 7 * 86400 },
  }));
}

export async function loadHistory(sessionId) {
  const item = await loadSession("chat#" + sessionId);
  return item ? JSON.parse(item.messages) : [];
}

export async function saveHistory(sessionId, messages) {
  await saveSession("chat#" + sessionId, { messages: JSON.stringify(messages) });
}

export async function loadPrefs(userId) {
  const item = await loadSession("prefs#" + userId);
  return item ?? null;
}

export async function savePrefs(userId, prefs) {
  await saveSession("prefs#" + userId, prefs);
}

export async function loadBlocks(userId) {
  const item = await loadSession("blocks#" + userId);
  return item ? JSON.parse(item.blocks) : [];
}

export async function saveBlocks(userId, blocks) {
  await saveSession("blocks#" + userId, { blocks: JSON.stringify(blocks) });
}
