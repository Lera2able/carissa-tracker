/**
 * Carissa Tracker API Worker
 *
 * Exposes:
 * - POST /api/ai
 * - POST /api/auth/teacher/login
 * - GET  /api/auth/teacher/session
 * - POST /api/auth/teacher/logout
 * - POST /api/auth/learner/login
 * - GET  /api/auth/learner/session
 * - POST /api/auth/learner/logout
 * - GET  /api/learner-results/teacher
 * - GET  /api/learner-results/me
 * - POST /api/learner-results/upsert
 *
 * Keeps privileged Supabase access on the server and removes browser-side
 * direct access to `carissa_learner_activity_results`.
 */

const DEFAULT_SUPABASE_URL = "https://vousucfboetqtppjywlg.supabase.co";
const COOKIE_NAMES = {
  teacher: "carissa_tracker_teacher_session",
  learner: "carissa_tracker_learner_session",
};
const TEACHER_SESSION_MAX_AGE = 60 * 60 * 12;
const TEACHER_PERSIST_MAX_AGE = 60 * 60 * 24 * 30;
const LEARNER_SESSION_MAX_AGE = 60 * 60 * 8;
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

function getSupabaseUrl(env) {
  return env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

function getServiceRoleKey(env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the Worker.");
  }
  return env.SUPABASE_SERVICE_ROLE_KEY;
}

function getSessionSecret(env) {
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set on the Worker.");
  }
  return env.SESSION_SECRET;
}

function jsonResponse(obj, status = 200, origin = "*", extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-allow-credentials": "true",
      ...extraHeaders,
    },
  });
}

function normalizeOrigin(origin, allowedOrigin) {
  return origin && origin === allowedOrigin ? origin : allowedOrigin;
}

function parseCookies(header = "") {
  const out = {};
  for (const part of String(header).split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    out[name] = rest.join("=");
  }
  return out;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signValue(secret, value) {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(sig);
}

async function encodeSignedSession(env, payload) {
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await signValue(getSessionSecret(env), body);
  return `${body}.${sig}`;
}

async function decodeSignedSession(env, rawToken) {
  if (!rawToken || !String(rawToken).includes(".")) return null;
  const [body, sig] = String(rawToken).split(".", 2);
  const expected = await signValue(getSessionSecret(env), body);
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    if (!parsed?.exp || Number(parsed.exp) < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function createSessionCookie(env, name, payload, maxAge) {
  const token = await encodeSignedSession(env, payload);
  return `${name}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie(name) {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function classSlug(className) {
  return String(className || "")
    .toLowerCase()
    .replace(/grade\s*/i, "g")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^g/, "g");
}

function deriveLearnerIdentity(username, pin, profile = {}) {
  const cleanUser = String(username || "").trim().toLowerCase();
  const cleanPin = String(pin || "").trim();
  const match = cleanUser.match(/^(g[a-z0-9]+)-(\d{2})$/i);
  if (!match) return null;
  const learnerNumber = Number.parseInt(match[2], 10);
  if (!learnerNumber || cleanPin !== String(learnerNumber).padStart(4, "0")) return null;
  const className = String(profile.class_name || "").trim();
  if (!className || classSlug(className) !== match[1].toLowerCase()) return null;
  const surname = String(profile.surname || "").trim();
  const firstname = String(profile.firstname || "").trim();
  if (!surname || !firstname) return null;
  return {
    type: "learner",
    username: cleanUser,
    class_name: className,
    surname,
    firstname,
    learner_number: learnerNumber,
  };
}

function sanitizeTeacherSession(rows, email) {
  const classNames = [
    ...new Set(
      rows
        .map((row) => String(row?.class_name || "").trim())
        .filter(Boolean)
    ),
  ];
  const merged = rows[0] || {};
  const activeClass = classNames[0] || merged.class_name || null;
  return {
    type: "teacher",
    email: String(email || merged.email || "").trim().toLowerCase(),
    first_name: merged.first_name || null,
    surname: merged.surname || null,
    class_name: activeClass ? String(activeClass).trim() : null,
    class_names: classNames,
    active_class_name: activeClass ? String(activeClass).trim() : null,
    login_enabled: true,
  };
}

function buildSessionPayload(base, maxAge) {
  const now = Math.floor(Date.now() / 1000);
  return {
    ...base,
    issued_at: now,
    exp: now + maxAge,
  };
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

async function supabaseRequest(env, method, path, { params = {}, body, prefer } = {}) {
  const url = new URL(`${getSupabaseUrl(env)}/rest/v1/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value);
  });
  const headers = {
    apikey: getServiceRoleKey(env),
    Authorization: `Bearer ${getServiceRoleKey(env)}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;
  const resp = await fetch(url.toString(), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await resp.text().catch(() => "");
  if (!resp.ok) {
    throw new Error(`Supabase ${method} failed: ${text || resp.status}`);
  }
  return text ? JSON.parse(text) : null;
}

async function supabaseGet(env, path, params = {}) {
  return supabaseRequest(env, "GET", path, { params });
}

async function supabasePost(env, path, payload, prefer = "return=representation") {
  return supabaseRequest(env, "POST", path, { body: payload, prefer });
}

async function supabasePatch(env, path, params, payload) {
  const parsedParams = typeof params === "string"
    ? Object.fromEntries(new URLSearchParams(params).entries())
    : params;
  return supabaseRequest(env, "PATCH", path, {
    params: parsedParams,
    body: payload,
    prefer: "return=representation",
  });
}

async function supabaseDelete(env, path, params, prefer = "return=representation") {
  const parsedParams = typeof params === "string"
    ? Object.fromEntries(new URLSearchParams(params).entries())
    : params;
  return supabaseRequest(env, "DELETE", path, { params: parsedParams, prefer });
}

async function getTeacherSession(request, env) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  return decodeSignedSession(env, cookies[COOKIE_NAMES.teacher]);
}

async function getLearnerSession(request, env) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  return decodeSignedSession(env, cookies[COOKIE_NAMES.learner]);
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleTeacherLogin(request, env, corsOrigin) {
  const body = await readJsonBody(request);
  const email = String(body?.email || "").trim().toLowerCase();
  const pin = String(body?.pin || "").trim();
  const persist = !!body?.persist;
  if (!email || !pin) {
    return jsonResponse({ error: "Missing teacher email or PIN." }, 400, corsOrigin);
  }
  const rows = await supabaseGet(env, "carissa_teacher_registrations", {
    email: `ilike.${email}`,
    pin: `eq.${pin}`,
    login_enabled: "eq.true",
    order: "created_at.desc",
  });
  if (!Array.isArray(rows) || !rows.length) {
    return jsonResponse({ error: "Invalid teacher login." }, 401, corsOrigin);
  }
  const maxAge = persist ? TEACHER_PERSIST_MAX_AGE : TEACHER_SESSION_MAX_AGE;
  const session = buildSessionPayload(sanitizeTeacherSession(rows, email), maxAge);
  const cookie = await createSessionCookie(env, COOKIE_NAMES.teacher, session, maxAge);
  return jsonResponse({ session }, 200, corsOrigin, { "Set-Cookie": cookie });
}

async function handleTeacherSession(request, env, corsOrigin) {
  const session = await getTeacherSession(request, env);
  return jsonResponse({ session: session || null }, session ? 200 : 401, corsOrigin);
}

async function handleTeacherLogout(_request, _env, corsOrigin) {
  return jsonResponse({ ok: true }, 200, corsOrigin, {
    "Set-Cookie": clearCookie(COOKIE_NAMES.teacher),
  });
}

async function handleLearnerLogin(request, env, corsOrigin) {
  const body = await readJsonBody(request);
  const learner = deriveLearnerIdentity(body?.username, body?.pin, body?.profile);
  if (!learner) {
    return jsonResponse({ error: "Invalid learner login." }, 401, corsOrigin);
  }
  const session = buildSessionPayload(learner, LEARNER_SESSION_MAX_AGE);
  const cookie = await createSessionCookie(env, COOKIE_NAMES.learner, session, LEARNER_SESSION_MAX_AGE);
  return jsonResponse({ session }, 200, corsOrigin, { "Set-Cookie": cookie });
}

async function handleLearnerSession(request, env, corsOrigin) {
  const session = await getLearnerSession(request, env);
  return jsonResponse({ session: session || null }, session ? 200 : 401, corsOrigin);
}

async function handleLearnerLogout(_request, _env, corsOrigin) {
  return jsonResponse({ ok: true }, 200, corsOrigin, {
    "Set-Cookie": clearCookie(COOKIE_NAMES.learner),
  });
}

async function fetchAllLearnerResults(env) {
  const rows = await supabaseGet(env, "carissa_learner_activity_results", {
    select: "*",
    order: "updated_at.desc",
  });
  return Array.isArray(rows) ? rows : [];
}

async function handleTeacherResults(request, env, corsOrigin) {
  const session = await getTeacherSession(request, env);
  if (!session) return jsonResponse({ error: "Teacher session required." }, 401, corsOrigin);
  const url = new URL(request.url);
  const requestedClass = String(url.searchParams.get("class_name") || "").trim();
  if (requestedClass && !session.class_names.includes(requestedClass)) {
    return jsonResponse({ error: "You do not have access to that class." }, 403, corsOrigin);
  }
  const rows = await fetchAllLearnerResults(env);
  const allowed = rows.filter((row) =>
    session.class_names.includes(String(row.class_name || "").trim())
  );
  const filtered = requestedClass
    ? allowed.filter((row) => String(row.class_name || "").trim() === requestedClass)
    : allowed;
  return jsonResponse({ results: filtered }, 200, corsOrigin);
}

async function handleLearnerResults(request, env, corsOrigin) {
  const session = await getLearnerSession(request, env);
  if (!session) return jsonResponse({ error: "Learner session required." }, 401, corsOrigin);
  const rows = await fetchAllLearnerResults(env);
  const filtered = rows.filter((row) =>
    String(row.learner_username || "").trim().toLowerCase() === session.username &&
    String(row.class_name || "").trim() === session.class_name &&
    String(row.surname || "").trim().toLowerCase() === String(session.surname || "").trim().toLowerCase() &&
    String(row.firstname || "").trim().toLowerCase() === String(session.firstname || "").trim().toLowerCase()
  );
  return jsonResponse({ results: filtered }, 200, corsOrigin);
}

async function handleLearnerResultUpsert(request, env, corsOrigin) {
  const session = await getLearnerSession(request, env);
  if (!session) return jsonResponse({ error: "Learner session required." }, 401, corsOrigin);
  const body = await readJsonBody(request);
  const assignmentId = String(body?.assignment_id || "").trim();
  if (!assignmentId) {
    return jsonResponse({ error: "Missing assignment_id." }, 400, corsOrigin);
  }
  const assignmentRows = await supabaseGet(env, "carissa_resource_assignments", {
    id: `eq.${assignmentId}`,
    select: "*",
    limit: "1",
  });
  const assignment = Array.isArray(assignmentRows) ? assignmentRows[0] : null;
  if (!assignment) {
    return jsonResponse({ error: "Assignment not found." }, 404, corsOrigin);
  }
  const sameLearner =
    String(assignment.class_name || "").trim() === session.class_name &&
    String(assignment.surname || "").trim().toLowerCase() === String(session.surname || "").trim().toLowerCase() &&
    String(assignment.firstname || "").trim().toLowerCase() === String(session.firstname || "").trim().toLowerCase();
  if (!sameLearner) {
    return jsonResponse({ error: "This assignment does not belong to the current learner." }, 403, corsOrigin);
  }
  const score = Math.max(0, Number.parseInt(body?.score ?? 0, 10) || 0);
  const maxScore = Math.max(1, Number.parseInt(body?.max_score ?? 100, 10) || 100);
  const resultStatus = String(body?.result_status || "in_progress").trim() === "completed"
    ? "completed"
    : "in_progress";
  const payload = {
    assignment_id: assignment.id,
    learner_username: session.username,
    class_name: session.class_name,
    surname: session.surname,
    firstname: session.firstname,
    resource_id: assignment.resource_id || body?.resource_id || null,
    result_status: resultStatus,
    score,
    max_score: maxScore,
    learner_notes: body?.learner_notes ? String(body.learner_notes).slice(0, 5000) : null,
    submitted_at: body?.submitted_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const existingRows = await supabaseGet(env, "carissa_learner_activity_results", {
    assignment_id: `eq.${assignment.id}`,
    learner_username: `eq.${session.username}`,
    limit: "1",
  });
  const existing = Array.isArray(existingRows) ? existingRows[0] : null;
  let savedRows;
  if (existing?.id) {
    savedRows = await supabasePatch(env, "carissa_learner_activity_results", { id: `eq.${existing.id}` }, payload);
  } else {
    savedRows = await supabasePost(env, "carissa_learner_activity_results", {
      ...payload,
      created_at: new Date().toISOString(),
    });
  }
  const result = Array.isArray(savedRows) ? savedRows[0] || payload : payload;

  // Keep assignment progress consistent for teacher dashboards.
  try {
    await supabasePatch(env, "carissa_resource_assignments", { id: `eq.${assignment.id}` }, {
      status: resultStatus === "completed" ? "completed" : "in_progress",
      updated_at: new Date().toISOString(),
    });
  } catch (_e) {}
  return jsonResponse({ result }, 200, corsOrigin);
}

async function handleTeacherResultReset(request, env, corsOrigin) {
  const session = await getTeacherSession(request, env);
  if (!session) return jsonResponse({ error: "Teacher session required." }, 401, corsOrigin);
  const body = await readJsonBody(request);
  const assignmentId = String(body?.assignment_id || "").trim();
  if (!assignmentId) {
    return jsonResponse({ error: "Missing assignment_id." }, 400, corsOrigin);
  }

  const assignmentRows = await supabaseGet(env, "carissa_resource_assignments", {
    id: `eq.${assignmentId}`,
    select: "*",
    limit: "1",
  });
  const assignment = Array.isArray(assignmentRows) ? assignmentRows[0] : null;
  if (!assignment) {
    return jsonResponse({ error: "Assignment not found." }, 404, corsOrigin);
  }
  const assignmentClass = String(assignment.class_name || "").trim();
  if (!assignmentClass || !session.class_names.includes(assignmentClass)) {
    return jsonResponse({ error: "You do not have access to that assignment." }, 403, corsOrigin);
  }

  // Delete learner result(s) for this assignment. (Normally 1 row per assignment.)
  await supabaseDelete(env, "carissa_learner_activity_results", {
    assignment_id: `eq.${assignment.id}`,
  }, "return=minimal");

  // Reset assignment status back to assigned (so the teacher sees it as awaiting mark again).
  try {
    await supabasePatch(env, "carissa_resource_assignments", { id: `eq.${assignment.id}` }, {
      status: "assigned",
      updated_at: new Date().toISOString(),
    });
  } catch (_e) {}

  return jsonResponse({ ok: true }, 200, corsOrigin);
}

async function fetchReadingRecords(env, className, term) {
  const rows = await supabaseGet(env, "carissa_reading_assessments", {
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

  const records = await fetchReadingRecords(env, className, term);
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

async function applyReadingUpdates(env, pendingAction) {
  if (!pendingAction || pendingAction.type !== "reading_updates") {
    return { answer: "There is no pending reading update to apply." };
  }

  const className = String(pendingAction.className || "").trim();
  const term = String(pendingAction.term || "").trim();
  const updates = Array.isArray(pendingAction.updates) ? pendingAction.updates : [];

  if (!className || !term || !updates.length) {
    return { answer: "The pending reading update is incomplete, so I did not apply anything." };
  }

  const records = await fetchReadingRecords(env, className, term);
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

    const patched = await supabasePatch(env, "carissa_reading_assessments", { id: `eq.${row.id}` }, {
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
    const corsOrigin = normalizeOrigin(origin, allowedOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": corsOrigin,
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-allow-credentials": "true",
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/api/auth/teacher/login") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleTeacherLogin(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Teacher login failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/auth/teacher/session") {
      if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleTeacherSession(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Teacher session failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/auth/teacher/logout") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      return handleTeacherLogout(request, env, corsOrigin);
    }
    if (url.pathname === "/api/auth/learner/login") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleLearnerLogin(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Learner login failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/auth/learner/session") {
      if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleLearnerSession(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Learner session failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/auth/learner/logout") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      return handleLearnerLogout(request, env, corsOrigin);
    }
    if (url.pathname === "/api/learner-results/teacher") {
      if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleTeacherResults(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Teacher results failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/learner-results/me") {
      if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleLearnerResults(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Learner results failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/learner-results/upsert") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleLearnerResultUpsert(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Result upsert failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/learner-results/reset") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleTeacherResultReset(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Result reset failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname !== "/api/ai") {
      return new Response("Not found", {
        status: 404,
        headers: { "access-control-allow-origin": corsOrigin },
      });
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
        ? await applyReadingUpdates(env, body?.pendingAction)
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
