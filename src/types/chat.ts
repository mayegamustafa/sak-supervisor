export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  participant_names: Record<string, string>;
  last_message: string;
  last_message_at: string;
  updated_at: string;
}
