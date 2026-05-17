import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { MENU_CATALOG } from "./server/menu-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_API_KEY = getEnv("GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_AI_API_KEY");
const ELEVENLABS_API_KEY = getEnv("ELEVENLABS_API_KEY", "ELEVEN_API_KEY", "XI_API_KEY");
const GEMINI_MODEL = getEnv("GEMINI_MODEL") || "gemini-2.5-flash";
const ELEVENLABS_MODEL_ID = getEnv("ELEVENLABS_MODEL_ID") || "scribe_v2";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, "");
    if (value) return value;
  }
  return "";
}

function requireVoiceKeys(res) {
  if (!ELEVENLABS_API_KEY || !GEMINI_API_KEY) {
    res.status(503).json({
      error:
        "Voice ordering is not configured. Add ELEVENLABS_API_KEY and GEMINI_API_KEY to .env, then restart the server."
    });
    return false;
  }
  return true;
}

function getMenuPrompt(transcript = "") {
  const menuSummary = MENU_CATALOG.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price
  }));
  const transcriptBlock = transcript ? `\n\nCustomer transcript:\n"${transcript}"` : "";
  return `Menu catalog:\n${JSON.stringify(menuSummary, null, 2)}${transcriptBlock}`;
}

function getOrderSystemPrompt() {
  return `You are the ordering assistant for New Bean, a neighborhood cafe.
Given a customer's spoken order and the menu catalog, return ONLY valid JSON matching this schema:
{
  "transcript": string,
  "actions": [
    { "type": "add" | "remove" | "set", "productId": string, "quantity": number }
  ],
  "message": string
}

Rules:
- Map spoken item names to the closest menu product id (e.g. "bagels" -> "bagel", "avo toast" -> "avocado-toast").
- If the customer says "add 2 bagels", return { "type": "add", "productId": "bagel", "quantity": 2 }.
- quantity must be a positive integer.
- If nothing matches the menu, return empty actions and a short friendly message.
- transcript should be your best transcription of the customer audio, or the provided transcript if text is supplied.`;
}

function getOrderResponseSchema() {
  return {
    type: "object",
    properties: {
      transcript: { type: "string" },
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["add", "remove", "set"] },
            productId: { type: "string" },
            quantity: { type: "integer" }
          },
          required: ["type", "productId", "quantity"]
        }
      },
      message: { type: "string" }
    },
    required: ["actions", "message"]
  };
}

async function transcribeAudioWithElevenLabs(buffer, mimeType) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs fallback is not configured.");
  }

  const formData = new FormData();
  formData.append("model_id", ELEVENLABS_MODEL_ID);
  formData.append("file", new Blob([buffer], { type: mimeType || "audio/webm" }), "order.webm");

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
    body: formData
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload.detail?.message || payload.detail || payload.message || response.statusText;
    throw new Error(`ElevenLabs transcription failed: ${detail}`);
  }

  const text = payload.text?.trim() || payload.transcripts?.[0]?.text?.trim();
  if (!text) throw new Error("Could not understand the recording. Please try again.");
  return text;
}

async function parseTranscriptWithGemini(transcript) {
  return parseOrderWithGeminiParts({
    model: GEMINI_MODEL,
    parts: [{ text: getMenuPrompt(transcript) }],
    fallbackTranscript: transcript
  });
}

async function parseOrderWithGeminiParts({ model, parts, fallbackTranscript }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: getOrderSystemPrompt() }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: getOrderResponseSchema()
        }
      })
    }
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload.error?.message || response.statusText;
    throw new Error(`Gemini order parsing failed: ${detail}`);
  }

  const rawText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
  let parsed;

  try {
    parsed = JSON.parse(rawText.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw new Error("Could not parse the order. Please try again.");
  }

  return normalizeOrder(parsed, fallbackTranscript);
}

function normalizeOrder(parsed, fallbackTranscript) {
  const validIds = new Set(MENU_CATALOG.map((item) => item.id));
  const actions = (parsed.actions || [])
    .filter((action) => validIds.has(action.productId) && Number.isInteger(action.quantity) && action.quantity > 0)
    .map((action) => ({
      type: action.type === "remove" || action.type === "set" ? action.type : "add",
      productId: action.productId,
      quantity: action.quantity
    }));

  return {
    transcript: typeof parsed.transcript === "string" && parsed.transcript.trim() ? parsed.transcript.trim() : fallbackTranscript,
    actions,
    message: typeof parsed.message === "string" ? parsed.message : "Order updated."
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    voiceEnabled: Boolean(ELEVENLABS_API_KEY && GEMINI_API_KEY),
    voiceMode: "elevenlabs-transcription-gemini-cart",
    elevenLabsModel: ELEVENLABS_MODEL_ID,
    geminiModel: GEMINI_MODEL
  });
});

app.get("/api/menu", (_req, res) => {
  res.json(MENU_CATALOG);
});

app.post("/api/voice-order", upload.single("audio"), async (req, res) => {
  if (!requireVoiceKeys(res)) return;

  if (!req.file?.buffer?.length) {
    res.status(400).json({ error: "No audio received. Hold the mic button and speak your order." });
    return;
  }

  try {
    const transcript = await transcribeAudioWithElevenLabs(req.file.buffer, req.file.mimetype);
    const order = await parseTranscriptWithGemini(transcript);
    res.json({ ...order, transcript });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Voice order failed."
    });
  }
});

app.listen(PORT, () => {
  console.log(`New Bean running at http://localhost:${PORT}`);
  console.log(`Voice ordering uses ElevenLabs ${ELEVENLABS_MODEL_ID} and Gemini ${GEMINI_MODEL}`);
  if (!ELEVENLABS_API_KEY || !GEMINI_API_KEY) {
    console.warn("Voice ordering disabled - set ELEVENLABS_API_KEY and GEMINI_API_KEY in .env");
  }
});
