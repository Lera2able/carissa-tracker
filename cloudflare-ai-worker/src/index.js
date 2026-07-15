/**
 * Carissa Tracker AI proxy (Cloudflare Worker)
 *
 * Exposes POST /api/ai for the admin "TRAE Assistant" panel.
 * Keeps the OpenAI key on the server and can perform safe reading-score updates.
 */

const SUPABASE_URL = "https://vousucfboetqtppjywlg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdXN1Y2Zib2V0cXRwcGp5d2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjE1NTIsImV4cCI6MjA5MzkzNzU1Mn0.bdwEPpWrazC1KDVG58MnbBy6Lr4YhO8gUyEuK1VykU4";
const READING_AGE_KEY = [
  { w: 12, age: 6.0 },
  { w: 30, age: 7.0 },
  { w: 50, age: 8.0 },
  { w: 70, age: 9.0 },
  { w: 80, age: 10.083 },
  { w: 92, age: 11.0 },
  { w: 102, age: 12.0 },
  { w: 115, age: 13.0 },
  { w: 121, age: 13.75 },
];

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

function normalizeReadingName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function readingAgeFromWords(n) {
  if (n == null || Number.isNaN(Number(n)) || Number(n) < 0) return null;
  const words = Number(n);
  if (words === 0) return "<6y 0m";
  if (words < READING_AGE_KEY[0].w) return "<6y 0m";
  if (words >= READING_AGE_KEY[READING_AGE_KEY.length - 1].w) return "13y 9m+";
  let age = READING_AGE_KEY[0].age;
  for (let i = 0; i < READING_AGE_KEY.length - 1; i++) {
    const current = READING_AGE_KEY[i];
    const next = READING_AGE_KEY[i + 1];
    if (words >= current.w && words < next.w) {
      const ratio = (words - current.w) / (next.w - current.w);
      age = current.age + ratio * (next.age - current.age);
      break;
    }
  }
  const years = Math.floor(age);
  const months = Math.round((age - years) * 12);
  return months === 12 ? `${years + 1}y 0m` : `${years}y ${months}m`;
}

function readingKey(className, surname, firstname, term = "") {
  return [
    normalizeReadingName(className),
    normalizeReadingName(surname),
    normalizeReadingName(firstname),
    normalizeReadingName(term),
  ].join("||");
}

function sanitizeAttachments(rawAttachments) {
  return Array.isArray(rawAttachments)
    ? rawAttachments
        .filter((item) => item && item.url)
        .slice(0, 5)
        .map((item) => ({
          name: String(item.name || "Attachment").slice(0, 200),
          type: String(item.type || "application/octet-stream").slice(0, 120),
          size: Number(item.size || 0) || 0,
          url: String(item.url || ""),
        }))
    : [];
}

function buildAttachmentSummary(attachments) {
  if (!attachments.length) return "";
  return (
    "Attached files:\n" +
    attachments
      .map(
        (file) =>
          `- ${file.name} (${file.type || "file"}, ${file.size || 0} bytes): ${file.url}`
      )
      .join("\n")
  );
}

function buildImageInputs(attachments) {
  return attachments
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
}

function parseClassAndTerm(message) {
  const msg = String(message || "");
  const classMatch = msg.match(/grade\s*([rR]|\d+(?:\.\d+)?)/i);
  const termMatch = msg.match(/term\s*([1-4])/i);
  return {
    className: classMatch ? `Grade ${String(classMatch[1]).toUpperCase()}` : null,
    term: termMatch ? `Term ${termMatch[1]}` : null,
  };
}

function wantsReadingSheetUpdate(message, attachments) {
  const msg = String(message || "").toLowerCase();
  const hasReadingIntent =
    /(1[\s-]*minute|one[\s-]*minute|reading)/i.test(msg) &&
    /(update|change|fix|score|scores|mark|marks)/i.test(msg);
  const hasSheetLikeAttachment = attachments.some((file) => /^image\//i.test(file.type));
  return hasReadingIntent && hasSheetLikeAttachment;
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }
  return null;
}

async function openAIChat(env, messages, options = {}) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || "gpt-4o-mini",
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 700,
      messages,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    const err = new Error("OpenAI request failed");
    err.details = errText.slice(0, 1200);
    throw err;
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  return Array.isArray(content)
    ? content.map((part) => part?.text || "").join("\n").trim()
    : String(content || "").trim();
}

async function supabaseGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value);
  });
  const resp = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!resp.ok) {
    throw new Error(`Supabase GET failed: ${await resp.text()}`);
  }
  return resp.json();
}

async function supabasePatch(path, query, payload) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${query}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error(`Supabase PATCH failed: ${await resp.text()}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : [];
}

async function fetchReadingRecords(className, term) {
  const rows = await supabaseGet("carissa_reading_assessments", {
    class_name: `eq.${className}`,
    term: `eq.${term}`,
    select:
      "id,class_name,surname,firstname,term,words_correct,reading_age,date_assessed,created_at",
    order: "surname.asc,firstname.asc",
  });
  const latestByKey = {};
  for (const row of rows) {
    const key = readingKey(row.class_name, row.surname, row.firstname, row.term || "");
    const current = latestByKey[key];
    const rowDate = new Date(row.date_assessed || row.created_at || 0);
    if (!current || rowDate > new Date(current.date_assessed || current.created_at || 0)) {
      latestByKey[key] = row;
    }
  }
  return Object.values(latestByKey);
}

async function extractReadingRowsFromImages(env, { message, attachments, className, term, records }) {
  const roster = records
    .map((row) => `${row.surname}, ${row.firstname}`)
    .sort((a, b) => a.localeCompare(b))
    .join("\n");

  const imageInputs = buildImageInputs(attachments);
  if (!imageInputs.length) {
    return { rows: [] };
  }

  const extractionText = [
    `Extract one-minute reading scores for ${className}, ${term}.`,
    "Use the roster below to standardize names exactly.",
    "Return ONLY valid JSON with this shape:",
    '{"rows":[{"surname":"SURNAME","firstname":"First","words_correct":123}]}',
    "Rules:",
    "- Omit any learner if the name or score is unclear.",
    "- Use integer words_correct values only.",
    "- Prefer the roster spelling instead of the image spelling if they differ slightly.",
    "- Do not include commentary or markdown.",
    `User request: ${message || "Please review the attached reading sheet."}`,
    `Roster:\n${roster}`,
  ].join("\n\n");

  const content = await openAIChat(
    env,
    [
      {
        role: "system",
        content:
          "You extract structured learner scores from school reading mark sheets. Return strict JSON only.",
      },
      {
        role: "user",
        content: [{ type: "text", text: extractionText }, ...imageInputs],
      },
    ],
    { temperature: 0, max_tokens: 1400 }
  );

  return extractJson(content) || { rows: [] };
}

function summarizeUpdateResult(className, term, extractedRows, updatedRows, unchangedRows, unmatchedRows) {
  const lines = [];
  if (updatedRows.length) {
    lines.push(
      `Updated ${updatedRows.length} ${className} ${term} one-minute reading score(s).`
    );
    lines.push(
      updatedRows
        .slice(0, 12)
        .map(
          (row) =>
            `- ${row.firstname} ${row.surname}: ${row.before} → ${row.after} words/min`
        )
        .join("\n")
    );
  } else if (extractedRows.length) {
    lines.push(
      `No score changes were needed for ${className} ${term}. The uploaded sheet matches the current saved results.`
    );
  } else {
    lines.push(
      `I could not confidently read any scores from the attached sheet for ${className} ${term}. Please upload a clearer image or crop the table area.`
    );
  }

  if (unchangedRows.length && updatedRows.length) {
    lines.push(`${unchangedRows.length} learner record(s) already matched the sheet and were left unchanged.`);
  }

  if (unmatchedRows.length) {
    lines.push(
      `I found ${unmatchedRows.length} row(s) on the image that I could not match safely to the current ${className} ${term} roster:`
    );
    lines.push(
      unmatchedRows
        .slice(0, 8)
        .map(
          (row) =>
            `- ${row.firstname || "Unknown"} ${row.surname || ""}`.trim() +
            (row.words_correct != null ? ` (${row.words_correct})` : "")
        )
        .join("\n")
    );
  }

  return lines.filter(Boolean).join("\n\n");
}

function summarizePreviewResult(className, term, proposedUpdates, unchangedRows, unmatchedRows) {
  const lines = [
    `I found ${proposedUpdates.length} proposed change(s) for ${className} ${term}.`,
    "Please review them, then click `Apply changes` if they look correct.",
    proposedUpdates
      .slice(0, 12)
      .map(
        (row) => `- ${row.firstname} ${row.surname}: ${row.before} → ${row.after} words/min`
      )
      .join("\n"),
  ];

  if (unchangedRows.length) {
    lines.push(
      `${unchangedRows.length} learner record(s) already match the attached sheet and will not be changed.`
    );
  }

  if (unmatchedRows.length) {
    lines.push(
      `I could not safely match ${unmatchedRows.length} row(s) from the image to the current roster. They will be ignored unless you correct them manually.`
    );
  }

  return lines.filter(Boolean).join("\n\n");
}

function buildReadingUpdatePreview(className, term, proposedUpdates, unchangedRows, unmatchedRows) {
  return {
    answer: summarizePreviewResult(className, term, proposedUpdates, unchangedRows, unmatchedRows),
    pendingAction: {
      type: "reading_updates",
      className,
      term,
      updates: proposedUpdates.map((row) => ({
        id: row.id,
        surname: row.surname,
        firstname: row.firstname,
        before: row.before,
        after: row.after,
      })),
    },
  };
}

async function buildReadingUpdateProposal(env, message, attachments) {
  const { className, term } = parseClassAndTerm(message);
  if (!className || !term) {
    return {
      answer:
        "I can update reading scores from an attached sheet, but I still need both the class and term in the message, for example `Update Grade 5.2 Term 2 reading from this image.`",
    };
  }

  const records = await fetchReadingRecords(className, term);
  if (!records.length) {
    return {
      answer: `I could not find any existing one-minute reading records for ${className} ${term}.`,
    };
  }

  const extracted = await extractReadingRowsFromImages(env, {
    message,
    attachments,
    className,
    term,
    records,
  });

  const extractedRows = Array.isArray(extracted?.rows)
    ? extracted.rows
        .map((row) => ({
          surname: String(row?.surname || "").trim(),
          firstname: String(row?.firstname || "").trim(),
          words_correct: Number.parseInt(row?.words_correct, 10),
        }))
        .filter(
          (row) =>
            row.surname &&
            row.firstname &&
            Number.isFinite(row.words_correct) &&
            row.words_correct >= 0
        )
    : [];

  const recordMap = new Map(
    records.map((row) => [readingKey(className, row.surname, row.firstname, term), row])
  );

  const proposedUpdates = [];
  const updatedRows = [];
  const unchangedRows = [];
  const unmatchedRows = [];

  for (const row of extractedRows) {
    const key = readingKey(className, row.surname, row.firstname, term);
    const existing = recordMap.get(key);
    if (!existing) {
      unmatchedRows.push(row);
      continue;
    }
    if (Number(existing.words_correct) === row.words_correct) {
      unchangedRows.push(row);
      continue;
    }
    proposedUpdates.push({
      id: existing.id,
      surname: existing.surname,
      firstname: existing.firstname,
      before: Number(existing.words_correct),
      after: row.words_correct,
    });
  }

  const safetyLimit = Math.max(5, Math.ceil(records.length * 0.15));
  if (proposedUpdates.length > safetyLimit) {
    return {
      answer: [
        `I found ${proposedUpdates.length} possible score differences for ${className} ${term}, which is too many to update safely from one photo.`,
        "I did not change any records.",
        "Please upload a clearer cropped image of the score column, or send the exact learner names and corrected scores.",
        "Possible differences I detected:",
        proposedUpdates
          .slice(0, 10)
          .map(
            (row) =>
              `- ${row.firstname} ${row.surname}: ${row.before} → ${row.after} words/min`
          )
          .join("\n"),
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  if (!proposedUpdates.length) {
    return {
      answer: summarizeUpdateResult(
        className,
        term,
        extractedRows,
        [],
        unchangedRows,
        unmatchedRows
      ),
    };
  }

  return buildReadingUpdatePreview(
    className,
    term,
    proposedUpdates,
    unchangedRows,
    unmatchedRows
  );
}

async function applyReadingUpdates(pendingAction) {
  if (!pendingAction || pendingAction.type !== "reading_updates") {
    return { answer: "There is no pending reading update to apply." };
  }

  const className = String(pendingAction.className || "").trim();
  const term = String(pendingAction.term || "").trim();
  const updates = Array.isArray(pendingAction.updates) ? pendingAction.updates : [];

  if (!className || !term || !updates.length) {
    return { answer: "The pending reading update is incomplete, so I did not apply anything." };
  }

  const records = await fetchReadingRecords(className, term);
  const recordMap = new Map(records.map((row) => [String(row.id), row]));

  const updatedRows = [];
  const unchangedRows = [];
  const unmatchedRows = [];

  for (const row of updates) {
    const existing = recordMap.get(String(row.id || ""));
    if (!existing) {
      unmatchedRows.push({
        surname: row.surname,
        firstname: row.firstname,
        words_correct: row.after,
      });
      continue;
    }
    const currentWords = Number(existing.words_correct);
    const beforeWords = Number(row.before);
    const afterWords = Number(row.after);

    if (currentWords === afterWords) {
      unchangedRows.push({
        surname: existing.surname,
        firstname: existing.firstname,
        words_correct: currentWords,
      });
      continue;
    }

    if (currentWords !== beforeWords) {
      unmatchedRows.push({
        surname: existing.surname,
        firstname: existing.firstname,
        words_correct: afterWords,
      });
      continue;
    }

    const patched = await supabasePatch("carissa_reading_assessments", `id=eq.${row.id}`, {
      words_correct: afterWords,
      reading_age: readingAgeFromWords(afterWords),
      updated_at: new Date().toISOString(),
    });
    if (patched?.[0]) {
      updatedRows.push({
        surname: existing.surname,
        firstname: existing.firstname,
        before: beforeWords,
        after: afterWords,
      });
    }
  }

  return {
    answer: summarizeUpdateResult(
      className, term, updates, updatedRows, unchangedRows, unmatchedRows
    ),
  };
}

async function handleGeneralAssistant(env, message, attachments) {
  const attachmentSummary = buildAttachmentSummary(attachments);
  const userText = [
    message ? `User request:\n${message}` : "User request:\nPlease review the attached file(s).",
    attachmentSummary,
  ]
    .filter(Boolean)
    .join("\n\n");

  const imageInputs = buildImageInputs(attachments);
  const userContent = imageInputs.length
    ? [{ type: "text", text: userText }, ...imageInputs]
    : userText;

  const systemPrompt =
    "You are TRAE, the assistant for the Carissa Primary School Learner Tracker admin dashboard. " +
    "Be warm, concise, and practical. " +
    "If the user asks for a change that has already been applied, say so clearly. " +
    "When files are attached, refer to them by name and explain what you can or cannot do with them. " +
    "Do not reveal any API keys, tokens, or private data. " +
    "If you are unsure, ask a short clarification question.";

  const answer = await openAIChat(
    env,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    { temperature: 0.3, max_tokens: 700 }
  );

  return { answer: answer || "No response was returned." };
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

    const action = String(body?.action || "").trim();
    const message = String(body?.message || "").trim();
    const attachments = sanitizeAttachments(body?.attachments);
    if (!message && attachments.length === 0) {
      if (action !== "apply_reading_updates") {
        return jsonResponse({ error: "Missing `message`" }, 400, corsOrigin);
      }
    }

    try {
      const result = action === "apply_reading_updates"
        ? await applyReadingUpdates(body?.pendingAction)
        : wantsReadingSheetUpdate(message, attachments)
        ? await buildReadingUpdateProposal(env, message, attachments)
        : await handleGeneralAssistant(env, message, attachments);

      return jsonResponse(result, 200, corsOrigin);
    } catch (error) {
      return jsonResponse(
        {
          error: error?.message || "Request failed",
          details: error?.details || null,
        },
        502,
        corsOrigin
      );
    }
  },
};
