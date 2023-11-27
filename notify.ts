export async function notify(message: string): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL;
  console.log({ message });
  if (webhookUrl === undefined) {
    return;
  }
  try {
    const requestBody = {
      content: message,
    };

    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    };

    const response = await fetch(webhookUrl, requestOptions);

    if (!response.ok) {
      throw new Error(
        `Failed to send message to Discord webhook: ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error sending message to Discord webhook:", error);
  }
}
