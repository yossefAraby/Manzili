import { NextResponse } from "next/server";
import { geminiGenerate, geminiText } from "@/lib/ai/gemini";
import { stripDataUrlPrefix } from "@/lib/ai/providers";
import { groqTranscribe } from "@/lib/ai/groq";

const PROMPT =
  "Transcribe this voice memo verbatim. Then, on a new line prefixed with 'Intent:', " +
  "summarize in one sentence what the speaker wants customized. Output nothing else.";

export async function POST(request) {
  try {
    const { audioDataUrl, mimeType } = await request.json();
    if (!audioDataUrl) {
      return NextResponse.json({ error: "audioDataUrl required" }, { status: 400 });
    }

    const stripped = stripDataUrlPrefix(audioDataUrl);
    const data = stripped.data;
    const mt = mimeType || stripped.mimeType || "audio/webm";

    // Tier 1: Gemini (also produces an "Intent:" summary in the same response).
    try {
      const content = await geminiGenerate({
        model: "gemini-2.5-flash",
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: mt, data } },
        ],
      });
      const transcript = geminiText(content);
      if (transcript) return NextResponse.json({ transcript });
    } catch (e) {
      console.warn("[ai/transcribe] gemini failed:", e?.message || e);
    }

    // Tier 2: Groq Whisper. Whisper only returns the transcription itself, no
    // intent summary — that's fine; the synth-prompt model can extract intent
    // from the raw transcript.
    const audioBuffer = Buffer.from(data, "base64");
    const transcript = await groqTranscribe({
      audioBuffer,
      mimeType: mt,
      model: "whisper-large-v3",
    });
    return NextResponse.json({ transcript });
  } catch (e) {
    console.error("[ai/transcribe]", e);
    return NextResponse.json({ error: e.message || "transcribe failed" }, { status: 500 });
  }
}
