import "server-only";
import { env } from "./env";

interface SlackMessagePayload {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  attachments?: {
    color?: string;
    title?: string;
    text?: string;
    fields?: {
      title: string;
      value: string;
      short?: boolean;
    }[];
  }[];
}

export interface SlackMessageOptions {
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
}

/**
 * Sends a message to Slack using a webhook URL
 * @param message - The message text to send
 * @param webhookUrl - The Slack webhook URL
 * @param options - Optional configuration for the message
 * @returns Promise that resolves to success status and response data
 */
export const sendSlackMessage = async (
  message: string
): Promise<{ success: boolean; error?: string }> => {
  const payload: SlackMessagePayload = {
    channel: `#${env.SLACK_CHANNEL}`,
    text: message,
    username: "ultracite-bot",
  };

  try {
    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `HTTP ${response.status}: ${errorText}`,
        success: false,
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { error: errorMessage, success: false };
  }
};
