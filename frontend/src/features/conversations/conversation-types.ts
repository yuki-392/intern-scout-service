export type Message = { id: number; sender_name: string; body: string; kind: string; created_at: string; mine: boolean };
export type Meta = { current_page: number; total_pages: number; total_count: number; per_page: number };
export type ConversationSummary = { id: number; counterpart_name: string; latest_message_excerpt: string; latest_message_kind: string; latest_sender_name: string; last_messaged_at: string };
export type ConversationDetailData = { id: number; counterpart_name: string; can_send: boolean; messages: Message[]; meta: Meta };
