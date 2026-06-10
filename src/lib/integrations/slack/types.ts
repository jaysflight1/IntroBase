export type SlackConversationType =
  | "channel"
  | "private_channel"
  | "mpim"
  | "dm";

export interface SlackConversation {
  id: string;
  name?: string;
  is_channel?: boolean;
  is_group?: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
}

export interface SlackUser {
  id: string;
  name?: string;
  real_name?: string;
  profile?: {
    real_name?: string;
    display_name?: string;
    email?: string;
  };
  deleted?: boolean;
}

export interface SlackMessageEvent {
  type: "message";
  team?: string;
  channel: string;
  user?: string;
  username?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  subtype?: string;
  bot_id?: string;
  deleted_ts?: string;
  message?: SlackMessageEvent;
  previous_message?: SlackMessageEvent;
}
