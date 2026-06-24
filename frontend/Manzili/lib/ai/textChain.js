import { openrouterChat } from "./openrouter";
import { zaiChat } from "./zai";
import { geminiGenerate, geminiText } from "./gemini";
import { groqChat } from "./groq";
import { bluesmindsChat } from "./bluesminds";

// Canonical text-generation provider chain for Manzili. OpenRouter (free Gemma) is the
// PRIMARY; the rest are fallbacks in order. BluesMinds / DeepSeek is intentionally LAST
// because it's the costliest — it only runs if everything above failed. Each tier's run()
// resolves to a plain string, so callers can parse/validate per tier and break early.
export function textTiers({ system, user, temperature = 0.4 }) {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  return [
    {
      name: "openrouter",
      run: () => openrouterChat({ model: "google/gemma-4-31b-it:free", messages, temperature }),
    },
    {
      name: "z.ai",
      run: () => zaiChat({ model: "glm-4.7-flash", messages, temperature }),
    },
    {
      name: "gemini",
      run: async () =>
        geminiText(
          await geminiGenerate({
            model: "gemini-2.5-flash",
            parts: [{ text: `${system}\n\n${user}` }],
            generationConfig: { temperature },
          }),
        ),
    },
    {
      name: "groq",
      run: () => groqChat({ model: "llama-3.1-8b-instant", messages, temperature }),
    },
    {
      // DeepSeek LAST — most expensive, so only reached as a final fallback.
      name: "bluesminds",
      run: () => bluesmindsChat({ model: "DeepSeek-V4-Flash", messages, temperature }),
    },
  ];
}
