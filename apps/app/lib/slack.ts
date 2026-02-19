import "server-only";
import { env } from "./env";

interface SlackMessagePayload {
  attachments?: Array<{
    color?: string;
    title?: string;
    text?: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
  }>;
  channel?: string;
  icon_emoji?: string;
  icon_url?: string;
  text: string;
  username?: string;
}

export interface SlackMessageOptions {
  channel?: string;
  icon_emoji?: string;
  icon_url?: string;
  username?: string;
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
    text: message,
    channel: `#${env.SLACK_CHANNEL}`,
    username: "ultracite-bot",
  };

  try {
    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
};
