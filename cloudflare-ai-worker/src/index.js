/**
 * Carissa Tracker AI proxy (Cloudflare Worker)
 *
 * Exposes POST /api/ai for the in-dashboard "TRAE Assistant" panel.
 * Keeps the OpenAI key on the server (never in the browser).
 */

function jsonResponse(obj, status = 200, origin = "*") {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://tracker.carissaprimary.co.za";
    const origin = request.headers.get("Origin") || "";
    const corsOrigin = origin === allowedOrigin ? origin : allowedOrigin;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": corsOrigin,
          "access-control-allow-methods": "POST,OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/ai") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse(
        { error: "OPENAI_API_KEY is not set on the Worker." },
        500,
        corsOrigin
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsOrigin);
    }

    const message = String(body?.message || "").trim();
    const attachments = Array.isArray(body?.attachments)
      ? body.attachments
          .filter((item) => item && item.url)
          .slice(0, 5)
          .map((item) => ({
            name: String(item.name || "Attachment").slice(0, 200),
            type: String(item.type || "application/octet-stream").slice(0, 120),
            size: Number(item.size || 0) || 0,
            url: String(item.url || ""),
          }))
      : [];

    if (!message && attachments.length === 0) {
      return jsonResponse({ error: "Missing `message`" }, 400, corsOrigin);
    }

    const attachmentSummary = attachments.length
      ? "Attached files:\n" +
        attachments
          .map(
            (file) =>
              `- ${file.name} (${file.type || "file"}, ${file.size || 0} bytes): ${file.url}`
          )
          .join("\n")
      : "";

    const userText = [
      message ? `User request:\n${message}` : "User request:\nPlease review the attached file(s).",
      attachmentSummary,
    ]
      .filter(Boolean)
      .join("\n\n");

    const imageInputs = attachments
      .filter(
        (file) =>
          /^image\//i.test(file.type) &&
          /supabase\.co\/storage\/v1\/object\/public\//i.test(file.url)
      )
      .slice(0, 3)
      .map((file) => ({
        type: "image_url",
        image_url: { url: file.url },
      }));

    const userContent = imageInputs.length
      ? [{ type: "text", text: userText }, ...imageInputs]
      : userText;

    // Short, safe system prompt: helpful for your school tracker, no secrets.
    const systemPrompt =
      "You are TRAE, the assistant for the Carissa Primary School Learner Tracker admin dashboard. " +
      "Be concise and practical. If asked to change code, explain the steps clearly. " +
      "Do not reveal any API keys, tokens, or private data. " +
      "When files are attached, refer to them by name and URL. " +
      "Images may be provided directly for visual review, while non-image files are shared as links only. " +
      "If you are unsure, ask a short clarification question.";

    // OpenAI Chat Completions (simple + widely supported)
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return jsonResponse(
        { error: "OpenAI request failed", details: errText.slice(0, 1200) },
        502,
        corsOrigin
      );
    }

    const data = await resp.json();
    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No response was returned.";

    return jsonResponse({ answer }, 200, corsOrigin);
  },
};
