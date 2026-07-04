import { apiMutate, apiRequest } from "../api/api-client";
import type { ConversationDetailData, ConversationSummary, Message, Meta } from "./conversation-types";

export async function startScout(internProfileId: number, body: string): Promise<{ conversation_id: number }> {
  return (await apiMutate<{ data: { conversation_id: number } }>("/api/v1/conversations", jsonPost({ conversation: { intern_profile_id: internProfileId, body } }))).data;
}
export function getConversations(page: number): Promise<{ data: ConversationSummary[]; meta: Meta }> {
  return apiRequest(`/api/v1/conversations?page=${page}`);
}
export async function getConversation(id: number, page: number): Promise<ConversationDetailData> {
  return (await apiRequest<{ data: ConversationDetailData }>(`/api/v1/conversations/${id}?page=${page}`)).data;
}
export async function sendMessage(id: number, body: string): Promise<Message> {
  return (await apiMutate<{ data: Message }>(`/api/v1/conversations/${id}/messages`, jsonPost({ message: { body } }))).data;
}

function jsonPost(body: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
