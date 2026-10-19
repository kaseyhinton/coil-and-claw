import type { CheckupResult } from "./db/schema";

const responseSchema = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["great", "watch", "concern"] },
    summary: { type: "STRING" },
    observations: { type: "ARRAY", items: { type: "STRING" } },
    tips: { type: "ARRAY", items: { type: "STRING" } },
    vetRecommended: { type: "BOOLEAN" },
  },
  required: ["status", "summary", "observations", "tips", "vetRecommended"],
};

const systemPrompt = `You are a warm, knowledgeable exotic-pet care assistant for the "Coil & Claw" app.
Owners of snakes, tarantulas and other exotic pets send you a photo plus their pet's records.
Look carefully at the photo for potential problems (e.g. stuck shed, retained eye caps, mites, mouth rot,
scale rot, burns, dehydration, weight issues, premolt/molt signs, abdomen size, injuries, enclosure or
substrate issues) and review the feeding and growth history for anything unusual.
Be friendly and encouraging but honest. Keep observations and tips short and concrete (one sentence each).
status: "great" = nothing concerning, "watch" = minor things to keep an eye on, "concern" = likely problem.
Set vetRecommended to true if anything warrants an exotic vet visit. You are not a vet; never claim a diagnosis.
If the photo does not clearly show the pet, say so in the summary and base advice on the records.`;

const FALLBACK_MODEL = "gemini-flash-lite-latest";
const RETRYABLE = new Set([429, 500, 503]);

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function runCheckup(opts: {
  apiKey: string;
  model: string;
  context: string;
  image?: { data: ArrayBuffer; mimeType: string };
}): Promise<CheckupResult> {
  const parts: unknown[] = [{ text: opts.context }];
  if (opts.image) {
    parts.push({ inline_data: { mime_type: opts.image.mimeType, data: toBase64(opts.image.data) } });
  }

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.4,
    },
  });

  // Gemini regularly sheds load with 429/503s, so retry briefly and then fall back to a lighter model.
  const attempts = [opts.model, opts.model, FALLBACK_MODEL];
  let res: Response | undefined;
  for (const [i, model] of attempts.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1500 * i));
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
      body,
    });
    if (!RETRYABLE.has(res.status)) break;
  }

  if (!res!.ok) {
    console.error("Gemini error", res!.status, (await res!.text()).slice(0, 500));
    throw new Error(
      RETRYABLE.has(res!.status)
        ? "Our AI vet is swamped right now. Please try again in a minute."
        : `The AI check-up failed (error ${res!.status}).`,
    );
  }
  const json = (await res!.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response");
  return JSON.parse(text) as CheckupResult;
}
