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

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_e) {
    return fallback;
  }
}

function pdfResponse(pdfBytes, filename, origin = "*", extraHeaders = {}) {
  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
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
  const originalSurname = String(profile.original_surname || surname).trim();
  const originalFirstname = String(profile.original_firstname || firstname).trim();
  return {
    type: "learner",
    username: cleanUser,
    class_name: className,
    surname,
    firstname,
    original_surname: originalSurname,
    original_firstname: originalFirstname,
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

  // One-attempt enforcement (assessments only):
  // For assessment-style activities we block re-submission after completion; the only way to allow
  // another try is for the teacher to reset the mark (deletes result + sets assignment to assigned).
  if (existing?.id && String(existing.result_status || "").trim().toLowerCase() === "completed") {
    let isAssessment = false;
    try {
      const resourceId = assignment.resource_id || null;
      if (resourceId != null) {
        const resourceRows = await supabaseGet(env, "carissa_resources", {
          id: `eq.${resourceId}`,
          select: "title,url",
          limit: "1",
        });
        const resource = Array.isArray(resourceRows) ? resourceRows[0] : null;
        const t = String(resource?.title || "").toLowerCase();
        const u = String(resource?.url || "").toLowerCase();
        isAssessment = t.includes("assessment") || u.includes("assessment");
      }
    } catch (_e) {}
    if (isAssessment) {
      return jsonResponse(
        {
          error:
            "This assessment has already been submitted. If you need another try, please ask your teacher to reset your mark.",
        },
        409,
        corsOrigin
      );
    }
  }

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

  // Term 3 auto-sync (Typing Assessments → Admin "Term 3 assessment" table).
  // We store WPM (/5), Accuracy (/5), and Observation/sign-in (/10) in carissa_elearning_assessments.
  try {
    if (resultStatus === "completed") {
      const resourceId = assignment.resource_id || null;
      let resource = null;
      if (resourceId != null) {
        const resourceRows = await supabaseGet(env, "carissa_resources", {
          id: `eq.${resourceId}`,
          select: "title,url",
          limit: "1",
        });
        resource = Array.isArray(resourceRows) ? resourceRows[0] : null;
      }
      const title = String(resource?.title || "").toLowerCase();
      const url = String(resource?.url || "").toLowerCase();
      const isTypingAssessment = title.includes("typing assessment") || (title.includes("assessment") && url.includes("assessment"));

      if (isTypingAssessment) {
        const notes = String(payload.learner_notes || "");
        const matchNum = (re) => {
          const m = notes.match(re);
          return m ? Number(m[1]) : null;
        };
        const wpm = matchNum(/avg\s*wpm\s*:\s*([0-9]+)/i) ?? matchNum(/wpm\s*:\s*([0-9]+)/i);
        const acc = matchNum(/avg\s*accuracy\s*:\s*([0-9]+)/i) ?? matchNum(/accuracy\s*:\s*([0-9]+)/i) ?? score;

        const wpmScore = (wpm != null && wpm > 15) ? 5 : (wpm != null && wpm >= 10) ? 4 : 3;
        const accScore = (acc >= 90) ? 5 : (acc >= 85) ? 4 : 3;
        const obsScore = 10; // default: learner was able to sign in and complete the assessment

        const term = "Term 3";
        const year = new Date().getFullYear();
        const className = String(session.class_name || "").trim();
        const gradeMatch = className.match(/(\d+)/);
        const gradeNum = gradeMatch ? Number(gradeMatch[1]) : null;
        const phase = (gradeNum != null && gradeNum <= 3) ? "foundation" : "intermediate";
        const dateAssessed = String(payload.submitted_at || new Date().toISOString()).split("T")[0];

        const comments =
          `[AUTO_TYPING_ASSESSMENT]\n` +
          `WPM=${wpm == null ? "" : String(wpm)}\n` +
          `ACC=${String(acc)}\n` +
          `OBS=✓ Signed in\n` +
          `Bands: WPM (<10=3/5, 10–15=4/5, >15=5/5); Accuracy (<85=3/5, 85–90=4/5, 90–100=5/5).`;

        const assessPayload = {
          surname: session.surname,
          firstname: session.firstname,
          class_name: className,
          term,
          year,
          phase,
          date_assessed: dateAssessed,
          assessed_by: "System (Typing Assessment)",
          // DB expects JSON columns to be non-null
          oral_scores: {},
          oral_total: wpmScore,
          prac1_scores: {},
          prac1_total: accScore,
          prac2_scores: {},
          prac2_total: obsScore,
          grand_total: wpmScore + accScore + obsScore,
          comments,
          updated_at: new Date().toISOString(),
        };

        const existingAssessRows = await supabaseGet(env, "carissa_elearning_assessments", {
          class_name: `eq.${className}`,
          surname: `eq.${session.surname}`,
          firstname: `eq.${session.firstname}`,
          term: `eq.${term}`,
          year: `eq.${year}`,
          limit: "1",
        });
        const existingAssess = Array.isArray(existingAssessRows) ? existingAssessRows[0] : null;
        if (existingAssess?.id) {
          await supabasePatch(env, "carissa_elearning_assessments", { id: `eq.${existingAssess.id}` }, assessPayload);
        } else {
          await supabasePost(env, "carissa_elearning_assessments", {
            ...assessPayload,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (_e) {}

  return jsonResponse({ result }, 200, corsOrigin);
}

async function handleLearnerProfileUpdate(request, env, corsOrigin) {
  const session = await getLearnerSession(request, env);
  if (!session) return jsonResponse({ error: "Learner session required." }, 401, corsOrigin);
  const body = await readJsonBody(request);
  const newSurname = String(body?.surname || "").trim();
  const newFirstname = String(body?.firstname || "").trim();
  if (!newSurname || !newFirstname) {
    return jsonResponse({ error: "Missing surname or firstname." }, 400, corsOrigin);
  }

  const oldSurname = String(session.surname || "").trim();
  const oldFirstname = String(session.firstname || "").trim();
  if (newSurname === oldSurname && newFirstname === oldFirstname) {
    return jsonResponse({ ok: true, session }, 200, corsOrigin);
  }

  const className = String(session.class_name || "").trim();
  const username = String(session.username || "").trim().toLowerCase();
  const originalSurname = String(session.original_surname || oldSurname).trim();
  const originalFirstname = String(session.original_firstname || oldFirstname).trim();

  const result = await renameLearnerEverywhere(env, {
    className,
    originalSurname,
    originalFirstname,
    oldSurname,
    oldFirstname,
    newSurname,
    newFirstname,
    learnerUsername: username,
  });

  // 3) Issue a new learner session cookie with the updated name.
  const nextSession = buildSessionPayload(
    {
      ...session,
      surname: newSurname,
      firstname: newFirstname,
      original_surname: originalSurname,
      original_firstname: originalFirstname,
    },
    LEARNER_SESSION_MAX_AGE
  );
  const cookie = await createSessionCookie(env, COOKIE_NAMES.learner, nextSession, LEARNER_SESSION_MAX_AGE);
  return jsonResponse({ ok: true, result, session: nextSession }, 200, corsOrigin, { "Set-Cookie": cookie });
}

async function renameLearnerEverywhere(env, {
  className,
  originalSurname,
  originalFirstname,
  oldSurname,
  oldFirstname,
  newSurname,
  newFirstname,
  learnerNo = "",
  learnerUsername = "",
}) {
  const safeClass = String(className || "").trim();
  const safeOriginalSurname = String(originalSurname || "").trim();
  const safeOriginalFirstname = String(originalFirstname || "").trim();
  const safeOldSurname = String(oldSurname || "").trim();
  const safeOldFirstname = String(oldFirstname || "").trim();
  const safeNewSurname = String(newSurname || "").trim();
  const safeNewFirstname = String(newFirstname || "").trim();
  const safeLearnerNo = String(learnerNo || "").trim();
  const safeLearnerUsername = String(learnerUsername || "").trim().toLowerCase();
  const now = new Date().toISOString();

  if (!safeClass || !safeOriginalSurname || !safeOriginalFirstname || !safeNewSurname || !safeNewFirstname) {
    throw new Error("Missing learner identity details.");
  }

  // 1) Upsert override (stable key = original name from register)
  try {
    const existingRows = await supabaseGet(env, "carissa_learner_overrides", {
      class_name: `eq.${safeClass}`,
      original_surname: `eq.${safeOriginalSurname}`,
      original_firstname: `eq.${safeOriginalFirstname}`,
      limit: "1",
    });
    const existing = Array.isArray(existingRows) ? existingRows[0] : null;
    if (existing?.id) {
      await supabasePatch(env, "carissa_learner_overrides", { id: `eq.${existing.id}` }, {
        new_surname: safeNewSurname,
        new_firstname: safeNewFirstname,
        updated_at: now,
      });
    } else if (safeNewSurname !== safeOriginalSurname || safeNewFirstname !== safeOriginalFirstname) {
      await supabasePost(env, "carissa_learner_overrides", {
        class_name: safeClass,
        original_surname: safeOriginalSurname,
        original_firstname: safeOriginalFirstname,
        new_surname: safeNewSurname,
        new_firstname: safeNewFirstname,
        created_at: now,
        updated_at: now,
      });
    }
  } catch (_e) {
    // If overrides table isn't present, we still proceed with direct table updates below.
  }

  // 2) Cascade rename across the main tables used by the app.
  const patchByOldName = async (table) => {
    try {
      await supabasePatch(
        env,
        table,
        {
          class_name: `eq.${safeClass}`,
          surname: `eq.${safeOldSurname}`,
          firstname: `eq.${safeOldFirstname}`,
        },
        { surname: safeNewSurname, firstname: safeNewFirstname, updated_at: now }
      );
    } catch (_e) {}
  };
  const patchByLearnerNo = async (table, numberField) => {
    if (!safeLearnerNo) return;
    try {
      await supabasePatch(
        env,
        table,
        {
          class_name: `eq.${safeClass}`,
          [numberField]: `eq.${safeLearnerNo}`,
        },
        { surname: safeNewSurname, firstname: safeNewFirstname, updated_at: now }
      );
    } catch (_e) {}
  };
  const patchResults = async () => {
    try {
      if (safeLearnerUsername) {
        await supabasePatch(
          env,
          "carissa_learner_activity_results",
          { class_name: `eq.${safeClass}`, learner_username: `eq.${safeLearnerUsername}` },
          { surname: safeNewSurname, firstname: safeNewFirstname, updated_at: now }
        );
        return;
      }
      await supabasePatch(
        env,
        "carissa_learner_activity_results",
        { class_name: `eq.${safeClass}`, surname: `eq.${safeOldSurname}`, firstname: `eq.${safeOldFirstname}` },
        { surname: safeNewSurname, firstname: safeNewFirstname, updated_at: now }
      );
    } catch (_e) {}
  };

  await Promise.all([
    patchByOldName("carissa_resource_assignments"),
    patchByOldName("carissa_elearning_assessments"),
    patchByOldName("carissa_reading_assessments"),
    patchByOldName("carissa_interventions"),
    patchByOldName("carissa_sasams_marks"),
    patchByLearnerNo("carissa_sasams_marks", "learner_no"),
    patchByOldName("carissa_learner_payments"),
    patchByLearnerNo("carissa_learner_payments", "learner_number"),
    patchResults(),
  ]);

  return {
    class_name: safeClass,
    original_surname: safeOriginalSurname,
    original_firstname: safeOriginalFirstname,
    old_surname: safeOldSurname,
    old_firstname: safeOldFirstname,
    new_surname: safeNewSurname,
    new_firstname: safeNewFirstname,
    learner_no: safeLearnerNo || null,
    learner_username: safeLearnerUsername || null,
  };
}

async function handleTeacherLearnerNameUpdate(request, env, corsOrigin) {
  const session = await getTeacherSession(request, env);
  if (!session) return jsonResponse({ error: "Teacher session required." }, 401, corsOrigin);
  const body = await readJsonBody(request);
  const className = String(body?.class_name || "").trim();
  const originalSurname = String(body?.original_surname || "").trim();
  const originalFirstname = String(body?.original_firstname || "").trim();
  const oldSurname = String(body?.old_surname || originalSurname).trim();
  const oldFirstname = String(body?.old_firstname || originalFirstname).trim();
  const newSurname = String(body?.new_surname || "").trim();
  const newFirstname = String(body?.new_firstname || "").trim();
  const learnerNo = String(body?.learner_no || "").trim();
  const learnerUsername = String(body?.learner_username || "").trim().toLowerCase();

  if (!className || !originalSurname || !originalFirstname || !newSurname || !newFirstname) {
    return jsonResponse({ error: "Missing learner rename details." }, 400, corsOrigin);
  }

  const result = await renameLearnerEverywhere(env, {
    className,
    originalSurname,
    originalFirstname,
    oldSurname,
    oldFirstname,
    newSurname,
    newFirstname,
    learnerNo,
    learnerUsername,
  });
  return jsonResponse({ ok: true, result }, 200, corsOrigin);
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

let _adminAllowCache = { at: 0, emails: [] };
async function getAdminAllowedEmails(env) {
  const now = Date.now();
  if (_adminAllowCache.emails.length && now - _adminAllowCache.at < 5 * 60 * 1000) {
    return _adminAllowCache.emails;
  }
  try {
    const cfg = await supabaseGet(env, "carissa_config", { key: "eq.admin_pin", select: "*", limit: "1" });
    const row = Array.isArray(cfg) ? cfg[0] : null;
    const parsed = safeJsonParse(String(row?.value || "{}"), {});
    const emails = Array.isArray(parsed?.shared_admin_teachers)
      ? parsed.shared_admin_teachers.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)
      : [];
    _adminAllowCache = { at: now, emails };
    return emails;
  } catch (_e) {
    _adminAllowCache = { at: now, emails: [] };
    return [];
  }
}

const CLASS_RACE_CONFIG_PREFIX = "class_race_progress::";
const CLASS_RACE_LOBBY_PREFIX = "class_race_lobby::";
function classRaceConfigKey(roomId, clientId) {
  return `${CLASS_RACE_CONFIG_PREFIX}${String(roomId || "").trim()}::${String(clientId || "").trim()}`;
}
function classRaceLobbyKey(roomId) {
  return `${CLASS_RACE_LOBBY_PREFIX}${String(roomId || "").trim()}`;
}

async function getClassRaceLobby(env, roomId) {
  const lobbyKey = classRaceLobbyKey(roomId);
  const rows = await supabaseGet(env, "carissa_config", {
    key: `eq.${lobbyKey}`,
    select: "value",
    limit: "1",
  }).catch(() => []);
  const raw = Array.isArray(rows) && rows.length ? rows[0]?.value : null;
  return safeJsonParse(String(raw || "{}"), null);
}

async function upsertClassRaceLobby(env, roomId, patch = {}) {
  const lobbyKey = classRaceLobbyKey(roomId);
  const current = (await getClassRaceLobby(env, roomId)) || {};
  const next = {
    room_id: roomId,
    status: "waiting",
    admin_client_id: "",
    admin_name: "",
    round_id: "",
    countdown_started_at: null,
    go_at: null,
    difficulty: "easy",
    ...current,
    ...patch,
    room_id: roomId,
    updated_at: new Date().toISOString(),
  };

  const exists = await supabaseGet(env, "carissa_config", {
    key: `eq.${lobbyKey}`,
    select: "key",
    limit: "1",
  }).catch(() => []);

  if (Array.isArray(exists) && exists.length) {
    await supabasePatch(env, "carissa_config", { key: `eq.${lobbyKey}` }, { value: JSON.stringify(next) });
  } else {
    await supabasePost(env, "carissa_config", { key: lobbyKey, value: JSON.stringify(next) }, "return=minimal");
  }
  return next;
}

async function handleClassRaceHeartbeat(request, env, corsOrigin) {
  const body = await readJsonBody(request);
  const roomId = String(body?.room_id || "").trim();
  const clientId = String(body?.client_id || "").trim();
  const racerName = String(body?.racer_name || "Learner").trim().slice(0, 40);
  if (!roomId || !clientId) {
    return jsonResponse({ error: "Missing room_id or client_id." }, 400, corsOrigin);
  }

  const rowKey = classRaceConfigKey(roomId, clientId);
  const payload = {
    room_id: roomId,
    client_id: clientId,
    racer_name: racerName || "Learner",
    progress: Math.max(0, Math.min(100, Number(body?.progress || 0))),
    wpm: Math.max(0, Math.min(300, Math.round(Number(body?.wpm || 0)))),
    accuracy: Math.max(0, Math.min(100, Math.round(Number(body?.accuracy || 100)))),
    status: String(body?.status || "racing").trim().toLowerCase(),
    difficulty: String(body?.difficulty || "easy").trim().toLowerCase(),
    updated_at: new Date().toISOString(),
  };

  const existing = await supabaseGet(env, "carissa_config", {
    key: `eq.${rowKey}`,
    select: "key",
    limit: "1",
  });

  if (Array.isArray(existing) && existing.length) {
    await supabasePatch(env, "carissa_config", { key: `eq.${rowKey}` }, { value: JSON.stringify(payload) });
  } else {
    await supabasePost(env, "carissa_config", { key: rowKey, value: JSON.stringify(payload) }, "return=minimal");
  }

  const lobby = await getClassRaceLobby(env, roomId);
  let nextLobby = lobby;
  if (!lobby || !String(lobby.admin_client_id || "").trim()) {
    nextLobby = await upsertClassRaceLobby(env, roomId, {
      admin_client_id: clientId,
      admin_name: racerName || "Learner",
      difficulty: String(body?.difficulty || "easy").trim().toLowerCase() || "easy",
      status: "waiting",
    });
  }

  return jsonResponse({ ok: true, lobby: nextLobby || null }, 200, corsOrigin);
}

async function handleClassRaceRoom(request, env, corsOrigin) {
  const url = new URL(request.url);
  const roomId = String(url.searchParams.get("room_id") || "").trim();
  if (!roomId) return jsonResponse({ error: "Missing room_id." }, 400, corsOrigin);

  const prefix = classRaceConfigKey(roomId, "");
  const rows = await supabaseGet(env, "carissa_config", {
    key: `like.${prefix}*`,
    select: "key,value",
    limit: "60",
  }).catch(() => []);

  const minTs = Date.now() - (2 * 60 * 1000);
  const liveRows = (Array.isArray(rows) ? rows : [])
    .map((row) => safeJsonParse(String(row?.value || "{}"), null))
    .filter((row) => row && String(row.room_id || "") === roomId)
    .filter((row) => {
      const ts = Date.parse(String(row.updated_at || ""));
      return Number.isFinite(ts) && ts >= minTs;
    })
    .sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0))
    .slice(0, 25);

  let lobby = await getClassRaceLobby(env, roomId);
  const adminId = String(lobby?.admin_client_id || "").trim();
  const adminStillLive = !!(adminId && liveRows.some((row) => String(row?.client_id || "") === adminId));
  const lobbyGoAt = Date.parse(String(lobby?.go_at || ""));
  const countdownExpired = Number.isFinite(lobbyGoAt) ? lobbyGoAt < (Date.now() - 10000) : true;
  if ((!lobby || !adminId) && liveRows.length) {
    const first = liveRows[0];
    lobby = await upsertClassRaceLobby(env, roomId, {
      admin_client_id: String(first?.client_id || "").trim(),
      admin_name: String(first?.racer_name || "Learner").trim().slice(0, 40),
      difficulty: String(first?.difficulty || "easy").trim().toLowerCase() || "easy",
      status: "waiting",
    });
  } else if (lobby && !adminStillLive && countdownExpired && liveRows.length) {
    const first = liveRows[0];
    lobby = await upsertClassRaceLobby(env, roomId, {
      admin_client_id: String(first?.client_id || "").trim(),
      admin_name: String(first?.racer_name || "Learner").trim().slice(0, 40),
      difficulty: String(first?.difficulty || lobby?.difficulty || "easy").trim().toLowerCase() || "easy",
      status: "waiting",
    });
  }

  return jsonResponse({ rows: liveRows, lobby: lobby || null }, 200, corsOrigin);
}

async function handleClassRaceLobbyStart(request, env, corsOrigin) {
  const body = await readJsonBody(request);
  const roomId = String(body?.room_id || "").trim();
  const clientId = String(body?.client_id || "").trim();
  const racerName = String(body?.racer_name || "Learner").trim().slice(0, 40);
  const difficulty = String(body?.difficulty || "easy").trim().toLowerCase() || "easy";
  if (!roomId || !clientId) {
    return jsonResponse({ error: "Missing room_id or client_id." }, 400, corsOrigin);
  }

  let lobby = await getClassRaceLobby(env, roomId);
  if (!lobby || !String(lobby.admin_client_id || "").trim()) {
    lobby = await upsertClassRaceLobby(env, roomId, {
      admin_client_id: clientId,
      admin_name: racerName || "Learner",
      difficulty,
      status: "waiting",
    });
  }

  if (String(lobby.admin_client_id || "").trim() !== clientId) {
    return jsonResponse({ error: "Only the room admin can start the race.", lobby }, 403, corsOrigin);
  }

  const now = Date.now();
  const nextLobby = await upsertClassRaceLobby(env, roomId, {
    admin_client_id: clientId,
    admin_name: racerName || "Learner",
    difficulty,
    status: "countdown",
    round_id: `r_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    countdown_started_at: new Date(now).toISOString(),
    go_at: new Date(now + 3200).toISOString(),
  });
  return jsonResponse({ ok: true, lobby: nextLobby }, 200, corsOrigin);
}

async function requireAdminTeacher(request, env, corsOrigin) {
  const session = await getTeacherSession(request, env);
  if (!session) return { ok: false, res: jsonResponse({ error: "Teacher session required." }, 401, corsOrigin) };
  const allowed = await getAdminAllowedEmails(env);
  if (!allowed.includes(String(session.email || "").trim().toLowerCase())) {
    return { ok: false, res: jsonResponse({ error: "Admin access required." }, 403, corsOrigin) };
  }
  return { ok: true, session };
}

async function handleLearnWorldPurgeRemovedGames(request, env, corsOrigin) {
  const auth = await requireAdminTeacher(request, env, corsOrigin);
  if (!auth.ok) return auth.res;

  const DEFAULT_TITLES = [
    "maths quest (grade 1)",
    "blend detective (grade 1)",
    "word maker (grade 1)",
    "sight word safari (grade 1)",
    "letter hunt (grade 1)",
  ];

  const body = await readJsonBody(request);
  const titlesRaw = Array.isArray(body?.titles) ? body.titles : DEFAULT_TITLES;
  const titles = [...new Set(titlesRaw.map((t) => String(t || "").trim().toLowerCase()).filter(Boolean))];
  if (!titles.length) return jsonResponse({ error: "No titles provided." }, 400, corsOrigin);

  // 1) Resolve resource ids by title (case-insensitive)
  const or = titles.map((t) => `title.ilike.${t}`).join(",");
  const resourceRows = await supabaseGet(env, "carissa_resources", {
    or: `(${or})`,
    select: "id,title",
    limit: "20000",
  });
  const resources = Array.isArray(resourceRows) ? resourceRows : [];
  const resourceIds = [...new Set(resources.map((r) => r?.id).filter((x) => x != null))];
  if (!resourceIds.length) {
    return jsonResponse({ ok: true, titles, resources_found: 0, assignments_found: 0, results_deleted: 0, assignments_deleted: 0 }, 200, corsOrigin);
  }

  // 2) Find all existing assignments for those resources.
  const asnRows = await supabaseGet(env, "carissa_resource_assignments", {
    resource_id: `in.(${resourceIds.join(",")})`,
    select: "id",
    limit: "20000",
  });
  const assignmentIds = (Array.isArray(asnRows) ? asnRows : [])
    .map((r) => r?.id)
    .filter((x) => x != null);
  if (!assignmentIds.length) {
    return jsonResponse(
      { ok: true, titles, resources_found: resourceIds.length, assignments_found: 0, results_deleted: 0, assignments_deleted: 0, resource_ids: resourceIds },
      200,
      corsOrigin
    );
  }

  // 3) Delete linked results first (chunked).
  let resultsDeleted = 0;
  for (let i = 0; i < assignmentIds.length; i += 80) {
    const chunk = assignmentIds.slice(i, i + 80);
    // Count results so we can report what changed.
    const resRows = await supabaseGet(env, "carissa_learner_activity_results", {
      assignment_id: `in.(${chunk.join(",")})`,
      select: "id",
      limit: "20000",
    });
    resultsDeleted += Array.isArray(resRows) ? resRows.length : 0;

    await supabaseDelete(env, "carissa_learner_activity_results", {
      assignment_id: `in.(${chunk.join(",")})`,
    }, "return=minimal");
  }

  // 4) Delete the assignments.
  for (let i = 0; i < assignmentIds.length; i += 80) {
    const chunk = assignmentIds.slice(i, i + 80);
    await supabaseDelete(env, "carissa_resource_assignments", {
      id: `in.(${chunk.join(",")})`,
    }, "return=minimal");
  }

  return jsonResponse(
    {
      ok: true,
      titles,
      resources_found: resourceIds.length,
      assignments_found: assignmentIds.length,
      results_deleted: resultsDeleted,
      assignments_deleted: assignmentIds.length,
      resource_ids: resourceIds,
    },
    200,
    corsOrigin
  );
}

function wpmBandScore(wpm) {
  if (wpm != null && wpm > 15) return 5;
  if (wpm != null && wpm >= 10) return 4;
  return 3;
}
function accBandScore(acc) {
  if (acc >= 90) return 5;
  if (acc >= 85) return 4;
  return 3;
}
function parseWpmFromNotes(notes) {
  const s = String(notes || "");
  const m = s.match(/avg\s*wpm\s*:\s*([0-9]+)/i) || s.match(/wpm\s*:\s*([0-9]+)/i);
  return m ? Number(m[1]) : null;
}
function parseAccFromNotes(notes) {
  const s = String(notes || "");
  const m = s.match(/avg\s*accuracy\s*:\s*([0-9]+)/i) || s.match(/accuracy\s*:\s*([0-9]+)/i);
  return m ? Number(m[1]) : null;
}
function phaseFromClassName(className) {
  const m = String(className || "").match(/(\d+)/);
  const g = m ? Number(m[1]) : null;
  return g != null && g <= 3 ? "foundation" : "intermediate";
}

async function handleTerm3TypingSync(request, env, corsOrigin) {
  const auth = await requireAdminTeacher(request, env, corsOrigin);
  if (!auth.ok) return auth.res;
  const url = new URL(request.url);
  const className = String(url.searchParams.get("class_name") || "").trim();
  if (!className) return jsonResponse({ error: "Missing class_name." }, 400, corsOrigin);

  const year = new Date().getFullYear();
  const term = "Term 3";

  // 1) Find all assignments for this class.
  const asnRows = await supabaseGet(env, "carissa_resource_assignments", {
    class_name: `eq.${className}`,
    select: "id,resource_id,class_name,surname,firstname",
    limit: "20000",
  });
  const asn = Array.isArray(asnRows) ? asnRows : [];
  if (!asn.length) return jsonResponse({ ok: true, scanned: 0, inserted: 0, updated: 0 }, 200, corsOrigin);

  // 2) Find which resource_ids are typing assessments.
  const resourceIds = [...new Set(asn.map((r) => r.resource_id).filter((x) => x != null))];
  let typingResourceIds = new Set();
  for (let i = 0; i < resourceIds.length; i += 80) {
    const chunk = resourceIds.slice(i, i + 80);
    const resRows = await supabaseGet(env, "carissa_resources", {
      id: `in.(${chunk.join(",")})`,
      select: "id,title,url",
      limit: "20000",
    });
    (Array.isArray(resRows) ? resRows : []).forEach((r) => {
      const t = String(r?.title || "").toLowerCase();
      const u = String(r?.url || "").toLowerCase();
      if (t.includes("typing assessment") || (t.includes("assessment") && u.includes("assessment"))) {
        typingResourceIds.add(r.id);
      }
    });
  }

  const typingAssignments = asn.filter((r) => r.resource_id != null && typingResourceIds.has(r.resource_id));
  if (!typingAssignments.length) {
    return jsonResponse({ ok: true, scanned: 0, inserted: 0, updated: 0 }, 200, corsOrigin);
  }

  // 3) Pull completed results for those assignments.
  let scanned = 0;
  let inserted = 0;
  let updated = 0;
  const obsScore = 10; // default (sign-in observation)

  for (let i = 0; i < typingAssignments.length; i += 80) {
    const chunk = typingAssignments.slice(i, i + 80);
    const ids = chunk.map((r) => r.id).join(",");
    const resRows = await supabaseGet(env, "carissa_learner_activity_results", {
      assignment_id: `in.(${ids})`,
      result_status: "eq.completed",
      select: "assignment_id,class_name,surname,firstname,score,learner_notes,submitted_at",
      limit: "20000",
    });
    const results = Array.isArray(resRows) ? resRows : [];
    for (const r of results) {
      scanned++;
      const wpm = parseWpmFromNotes(r.learner_notes);
      const acc = parseAccFromNotes(r.learner_notes) ?? Number(r.score || 0);
      const wpmScore = wpmBandScore(wpm);
      const accScore = accBandScore(acc);
      const dateAssessed = String(r.submitted_at || new Date().toISOString()).split("T")[0];
      const comments =
        `[AUTO_TYPING_ASSESSMENT]\n` +
        `WPM=${wpm == null ? "" : String(wpm)}\n` +
        `ACC=${String(acc)}\n` +
        `OBS=✓ Signed in\n` +
        `Bands: WPM (<10=3/5, 10–15=4/5, >15=5/5); Accuracy (<85=3/5, 85–90=4/5, 90–100=5/5).`;

      const assessPayload = {
        surname: r.surname,
        firstname: r.firstname,
        class_name: className,
        term,
        year,
        phase: phaseFromClassName(className),
        date_assessed: dateAssessed,
        assessed_by: "System (Typing Assessment)",
        // DB expects JSON columns to be non-null
        oral_scores: {},
        oral_total: wpmScore,
        prac1_scores: {},
        prac1_total: accScore,
        prac2_scores: {},
        prac2_total: obsScore,
        grand_total: wpmScore + accScore + obsScore,
        comments,
        updated_at: new Date().toISOString(),
      };

      const existingAssessRows = await supabaseGet(env, "carissa_elearning_assessments", {
        class_name: `eq.${className}`,
        surname: `eq.${String(r.surname || "").trim()}`,
        firstname: `eq.${String(r.firstname || "").trim()}`,
        term: `eq.${term}`,
        year: `eq.${year}`,
        select: "id",
        limit: "1",
      });
      const existingAssess = Array.isArray(existingAssessRows) ? existingAssessRows[0] : null;
      if (existingAssess?.id) {
        await supabasePatch(env, "carissa_elearning_assessments", { id: `eq.${existingAssess.id}` }, assessPayload);
        updated++;
      } else {
        await supabasePost(env, "carissa_elearning_assessments", {
          ...assessPayload,
          created_at: new Date().toISOString(),
        });
        inserted++;
      }
    }
  }

  return jsonResponse({ ok: true, scanned, inserted, updated }, 200, corsOrigin);
}

function learnerUsernameFor(className, learnerNumber) {
  const slug = classSlug(String(className || ""));
  const num = String(Number(learnerNumber) || 0).padStart(2, "0");
  return `${slug}-${num}`.toLowerCase();
}

async function handlePaymentsList(request, env, corsOrigin) {
  const auth = await requireAdminTeacher(request, env, corsOrigin);
  if (!auth.ok) return auth.res;
  const url = new URL(request.url);
  const requestedClass = String(url.searchParams.get("class_name") || "").trim();
  const params = requestedClass ? { class_name: `eq.${requestedClass}` } : {};
  const rows = await supabaseGet(env, "carissa_learner_payments", {
    ...params,
    order: "paid_at.desc",
  });
  return jsonResponse({ payments: rows || [] }, 200, corsOrigin);
}

async function handlePaymentsSet(request, env, corsOrigin) {
  const auth = await requireAdminTeacher(request, env, corsOrigin);
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(request);
  const className = String(body?.class_name || "").trim();
  const learnerNumber = Number(body?.learner_number);
  const surname = String(body?.surname || "").trim();
  const firstname = String(body?.firstname || "").trim();
  const amount = Number(body?.amount || 50) || 50;
  const paidToRaw = String(body?.paid_to || "").trim().toLowerCase();
  const paidTo =
    paidToRaw === "lerato"
      ? "lerato"
      : paidToRaw === "office"
        ? "office"
        : paidToRaw === "eft"
          ? "eft"
          : "";
  const paid = body?.paid === false ? false : true;

  if (!className || !learnerNumber || !surname || !firstname) {
    return jsonResponse({ error: "Missing class_name, learner_number, surname, or firstname." }, 400, corsOrigin);
  }
  if (paid && !paidTo) {
    return jsonResponse({ error: "Choose where the payment was made (office, lerato, or eft)." }, 400, corsOrigin);
  }

  const username = learnerUsernameFor(className, learnerNumber);

  // Fetch existing row
  const existingRows = await supabaseGet(env, "carissa_learner_payments", {
    class_name: `eq.${className}`,
    learner_number: `eq.${learnerNumber}`,
    limit: "1",
  });
  const existing = Array.isArray(existingRows) ? existingRows[0] : null;

  if (!paid) {
    if (existing?.id) {
      await supabaseDelete(env, "carissa_learner_payments", { id: `eq.${existing.id}` }, "return=minimal");
    }
    return jsonResponse({ ok: true, removed: true }, 200, corsOrigin);
  }

  const payload = {
    class_name: className,
    learner_number: learnerNumber,
    learner_username: username,
    surname,
    firstname,
    amount,
    paid_to: paidTo,
    paid_at: existing?.paid_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let saved;
  try {
    if (existing?.id) {
      const rows = await supabasePatch(env, "carissa_learner_payments", { id: `eq.${existing.id}` }, payload);
      saved = Array.isArray(rows) ? rows[0] : null;
    } else {
      const rows = await supabasePost(env, "carissa_learner_payments", {
        ...payload,
        created_at: new Date().toISOString(),
      });
      saved = Array.isArray(rows) ? rows[0] : null;
    }
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("carissa_learner_payments_paid_to_check") || msg.toLowerCase().includes("paid_to")) {
      return jsonResponse(
        {
          error:
            "EFT is not enabled in the database yet. Please run the Supabase SQL patch 'learner_payments_add_eft.sql' once, then try again.",
        },
        400,
        corsOrigin
      );
    }
    throw e;
  }

  return jsonResponse({ ok: true, payment: saved || payload }, 200, corsOrigin);
}

function money(amount) {
  const n = Number(amount) || 0;
  return `R${n}`;
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function handlePaymentsReportPdf(request, env, corsOrigin) {
  const auth = await requireAdminTeacher(request, env, corsOrigin);
  if (!auth.ok) return auth.res;

  const rows = (await supabaseGet(env, "carissa_learner_payments", { order: "class_name.asc,learner_number.asc" })) || [];
  const payments = Array.isArray(rows) ? rows : [];

  // Totals
  const totalAll = payments.reduce((s, p) => s + (Number(p.amount) || 50), 0);
  const totalOffice = payments
    .filter((p) => String(p.paid_to || "").toLowerCase() === "office")
    .reduce((s, p) => s + (Number(p.amount) || 50), 0);
  const totalLerato = payments
    .filter((p) => String(p.paid_to || "").toLowerCase() === "lerato")
    .reduce((s, p) => s + (Number(p.amount) || 50), 0);
  const totalEft = payments
    .filter((p) => String(p.paid_to || "").toLowerCase() === "eft")
    .reduce((s, p) => s + (Number(p.amount) || 50), 0);

  const byGrade = {};
  for (const p of payments) {
    const g = String(p.class_name || "Unknown").trim() || "Unknown";
    byGrade[g] = byGrade[g] || { grade: g, total: 0, count: 0, rows: [] };
    byGrade[g].total += Number(p.amount) || 50;
    byGrade[g].count += 1;
    byGrade[g].rows.push(p);
  }
  const grades = Object.keys(byGrade).sort((a, b) => a.localeCompare(b));

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Try to embed crest from the public tracker site
  let crest = null;
  try {
    const crestUrl = env.PDF_CREST_URL || "https://tracker.carissaprimary.co.za/school-crest.png";
    const res = await fetch(crestUrl);
    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      crest = await pdfDoc.embedPng(bytes);
    }
  } catch (_e) {}

  const PAGE_W = 595.28; // A4 points
  const PAGE_H = 841.89;
  const M = 48;
  const HEADER_H = 118;
  const CREST_MAX_W = 44;
  const CREST_MAX_H = 56;

  const drawHeader = (page, title) => {
    const yTop = PAGE_H - M;
    const headerBottom = yTop - HEADER_H;

    // Crest
    let crestW = 0;
    if (crest) {
      const scale = Math.min(CREST_MAX_W / crest.width, CREST_MAX_H / crest.height, 1);
      crestW = crest.width * scale;
      const crestH = crest.height * scale;
      const crestBottomY = yTop - 58;
      page.drawImage(crest, { x: M + 2, y: crestBottomY, width: crestW, height: crestH });
    }

    const textLeft = M + crestW + 14;
    const textRight = PAGE_W - M;
    const textWidth = textRight - textLeft;
    const schoolName = "CARISSA PRIMARY SCHOOL";
    const line1 = "23 Hofmeyer Street, Witbank, 1035  •  P.O. Box 430, Witbank, 1035";
    const line2 = "Tel: (013) 656 1286  •  E-mail: info@carissaprimary.co.za  •  Web: www.carissaprimary.co.za";

    const schoolNameSize = 17;
    const schoolNameWidth = fontBold.widthOfTextAtSize(schoolName, schoolNameSize);
    page.drawText(schoolName, {
      x: textLeft + Math.max(0, (textWidth - schoolNameWidth) / 2),
      y: yTop - 18,
      size: schoolNameSize,
      font: fontBold,
      color: rgb(0.05, 0.36, 0.43),
    });

    page.drawLine({
      start: { x: textLeft, y: yTop - 25 },
      end: { x: textRight, y: yTop - 25 },
      thickness: 1,
      color: rgb(0.66, 0.83, 0.88),
    });

    const line1Size = 9.5;
    const line1Width = font.widthOfTextAtSize(line1, line1Size);
    page.drawText(line1, {
      x: textLeft + Math.max(0, (textWidth - line1Width) / 2),
      y: yTop - 40,
      size: line1Size,
      font,
      color: rgb(0.28, 0.29, 0.29),
    });

    const line2Size = 9.2;
    const line2Width = font.widthOfTextAtSize(line2, line2Size);
    page.drawText(line2, {
      x: textLeft + Math.max(0, (textWidth - line2Width) / 2),
      y: yTop - 54,
      size: line2Size,
      font,
      color: rgb(0.28, 0.29, 0.29),
    });

    page.drawLine({
      start: { x: M, y: yTop - 63 },
      end: { x: PAGE_W - M, y: yTop - 63 },
      thickness: 2,
      color: rgb(0.16, 0.54, 0.66),
    });

    page.drawText(title, {
      x: M,
      y: yTop - 87,
      size: 17,
      font: fontBold,
      color: rgb(0.11, 0.2, 0.36),
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    page.drawText(`Generated: ${dateStr}`, {
      x: PAGE_W - M - 142,
      y: yTop - 87,
      size: 10,
      font,
      color: rgb(0.35, 0.42, 0.5),
    });
    page.drawLine({
      start: { x: M, y: headerBottom },
      end: { x: PAGE_W - M, y: headerBottom },
      thickness: 1,
      color: rgb(0.88, 0.9, 0.93),
    });
    return headerBottom;
  };

  // Cover / summary page
  {
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let headerBottom = drawHeader(page, "eLearning Donations Report (R50)");

    let y = headerBottom - 36;
    const summary = [
      ["Total paid learners", String(payments.length)],
      ["Total collected", money(totalAll)],
      ["Office collected", money(totalOffice)],
      ["Lerato collected", money(totalLerato)],
      ["EFT collected", money(totalEft)],
    ];
    page.drawText("Summary", { x: M, y, size: 13, font: fontBold, color: rgb(0.17, 0.27, 0.41) });
    y -= 18;
    for (const [k, v] of summary) {
      page.drawText(k, { x: M, y, size: 11, font, color: rgb(0.18, 0.22, 0.27) });
      page.drawText(v, { x: PAGE_W - M - 160, y, size: 11, font: fontBold, color: rgb(0.09, 0.48, 0.24) });
      y -= 16;
    }

    y -= 12;
    page.drawText("Collected per grade", { x: M, y, size: 13, font: fontBold, color: rgb(0.17, 0.27, 0.41) });
    y -= 18;

    // Table headers
    const colX = [M, M + 220, M + 340, PAGE_W - M - 110];
    page.drawText("Grade", { x: colX[0], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
    page.drawText("Paid learners", { x: colX[1], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
    page.drawText("Total", { x: colX[2], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
    y -= 12;
    page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1, color: rgb(0.88, 0.9, 0.93) });
    y -= 12;

    for (const g of grades) {
      const row = byGrade[g];
      if (y < M + 80) {
        // Continue grade totals on a new page if needed
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        headerBottom = drawHeader(page, "Collected per grade (continued)");
        y = headerBottom - 28;
        page.drawText("Grade", { x: colX[0], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
        page.drawText("Paid learners", { x: colX[1], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
        page.drawText("Total", { x: colX[2], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
        y -= 12;
        page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1, color: rgb(0.88, 0.9, 0.93) });
        y -= 12;
      }
      page.drawText(g, { x: colX[0], y, size: 10.5, font, color: rgb(0.18, 0.22, 0.27) });
      page.drawText(String(row.count), { x: colX[1], y, size: 10.5, font, color: rgb(0.18, 0.22, 0.27) });
      page.drawText(money(row.total), { x: colX[2], y, size: 10.5, font: fontBold, color: rgb(0.09, 0.48, 0.24) });
      y -= 14;
    }
  }

  // Detail pages per grade
  for (const g of grades) {
    const group = byGrade[g];
    const sorted = (group.rows || []).slice().sort((a, b) => {
      const na = Number(a.learner_number) || 0;
      const nb = Number(b.learner_number) || 0;
      return na - nb;
    });
    const chunks = chunkArray(sorted, 28);
    for (let ci = 0; ci < chunks.length; ci++) {
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      const headerBottom = drawHeader(page, `${g} — Paid learners (${group.count})`);
      let y = headerBottom - 36;

      page.drawText(`Total collected for ${g}: ${money(group.total)}`, {
        x: M,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.09, 0.48, 0.24),
      });
      y -= 22;

      const colX = [M, M + 70, M + 250, M + 380, PAGE_W - M - 80];
      page.drawText("#", { x: colX[0], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
      page.drawText("Surname", { x: colX[1], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
      page.drawText("First name", { x: colX[2], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
      page.drawText("Paid to", { x: colX[3], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
      page.drawText("Amount", { x: colX[4], y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.32) });
      y -= 12;
      page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1, color: rgb(0.88, 0.9, 0.93) });
      y -= 12;

      for (const p of chunks[ci]) {
        page.drawText(String(p.learner_number || ""), { x: colX[0], y, size: 10, font, color: rgb(0.18, 0.22, 0.27) });
        page.drawText(String(p.surname || ""), { x: colX[1], y, size: 10, font, color: rgb(0.18, 0.22, 0.27) });
        page.drawText(String(p.firstname || ""), { x: colX[2], y, size: 10, font, color: rgb(0.18, 0.22, 0.27) });
        page.drawText(String(p.paid_to || ""), { x: colX[3], y, size: 10, font, color: rgb(0.18, 0.22, 0.27) });
        page.drawText(money(p.amount || 50), { x: colX[4], y, size: 10, font: fontBold, color: rgb(0.09, 0.48, 0.24) });
        y -= 14;
      }
    }
  }

  // Footer page numbers (added last so they are correct)
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;
  for (let i = 0; i < pageCount; i++) {
    const page = pages[i];
    page.drawText(`Page ${i + 1} of ${pageCount}`, {
      x: PAGE_W - M - 90,
      y: M - 18,
      size: 9,
      font,
      color: rgb(0.45, 0.5, 0.56),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfResponse(pdfBytes, "elearning_donations_report.pdf", corsOrigin);
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
    if (url.pathname === "/api/learner/profile/update") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleLearnerProfileUpdate(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Profile update failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/learner/name/update") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleTeacherLearnerNameUpdate(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Learner rename failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/payments/list") {
      if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handlePaymentsList(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Payments list failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/payments/set") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handlePaymentsSet(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Payments update failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/payments/report.pdf") {
      if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handlePaymentsReportPdf(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Payments PDF failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/assessments/term3/sync") {
      if (request.method !== "POST" && request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleTerm3TypingSync(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Term 3 sync failed" }, 500, corsOrigin);
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
    if (url.pathname === "/api/class-race/heartbeat") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleClassRaceHeartbeat(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Class race heartbeat failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/class-race/room") {
      if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleClassRaceRoom(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Class race room failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/class-race/lobby/start") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleClassRaceLobbyStart(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "Class race lobby start failed" }, 500, corsOrigin);
      }
    }
    if (url.pathname === "/api/learnworld/purge-removed") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsOrigin);
      try {
        return await handleLearnWorldPurgeRemovedGames(request, env, corsOrigin);
      } catch (error) {
        return jsonResponse({ error: error?.message || "LearnWorld purge failed" }, 500, corsOrigin);
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
