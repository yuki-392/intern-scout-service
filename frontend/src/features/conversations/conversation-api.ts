import { prefetchCsrfToken } from "../auth/auth-api";
import { notifyIfSessionExpired } from "../auth/session-expiration";
import type { ConversationDetailData, ConversationSummary, Message, Meta } from "./conversation-types";

export async function startScout(internProfileId: number, body: string): Promise<{ conversation_id: number }> {
  return (await mutate("/api/v1/conversations", { conversation: { intern_profile_id: internProfileId, body } })).data;
}
export async function getConversations(page: number): Promise<{ data: ConversationSummary[]; meta: Meta }> {
  return request(`/api/v1/conversations?page=${page}`);
}
export async function getConversation(id: number, page: number): Promise<ConversationDetailData> {
  const payload = await request(`/api/v1/conversations/${id}?page=${page}`);
  return payload.data;
}
export async function sendMessage(id: number, body: string): Promise<Message> {
  const payload = await mutate(`/api/v1/conversations/${id}/messages`, { message: { body } });
  return payload.data;
}
async function request(path: string) {
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin" });
  return parse(response);
}
async function mutate(path: string, body: object) {
  const token = await prefetchCsrfToken();
  const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(body) });
  return parse(response);
}
async function parse(response: Response) { notifyIfSessionExpired(response); const body = await response.json(); if (!response.ok) throw { status: response.status, ...body }; return body; }
