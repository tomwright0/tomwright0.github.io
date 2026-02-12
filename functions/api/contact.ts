interface Env {
  DISCORD_WEBHOOK_URL: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const headers = { "Content-Type": "application/json" };

  let body: { name?: string; message?: string; honeypot?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers,
    });
  }

  const { name, message, honeypot } = body;

  // Silently accept if honeypot is filled (don't tip off bots)
  if (honeypot) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ error: "Name is required." }), {
      status: 400,
      headers,
    });
  }

  if (!message || !message.trim()) {
    return new Response(JSON.stringify({ error: "Message is required." }), {
      status: 400,
      headers,
    });
  }

  if (message.trim().length > 260) {
    return new Response(
      JSON.stringify({ error: "Message exceeds 260 character limit." }),
      { status: 400, headers }
    );
  }

  const webhookUrl = context.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return new Response(
      JSON.stringify({ error: "Contact form is not configured." }),
      { status: 500, headers }
    );
  }

  const discordPayload = {
    embeds: [
      {
        title: "New Contact Form Message",
        color: 0x006cac,
        fields: [
          { name: "Name", value: name.trim(), inline: true },
          { name: "Message", value: message.trim() },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!discordRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send message. Please try again." }),
        { status: 502, headers }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again." }),
      { status: 502, headers }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
