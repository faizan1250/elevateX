// library/llmstream.js
function toGeminiContents(messages = []) {
  return messages
    .filter(m => m && m.content)
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user", // system -> user, assistant -> model
      parts: [{ text: String(m.content) }]
    }));
}

exports.streamFromLLM = async function streamFromLLM(genAI, messages) {
  if (!genAI) throw new Error("AI not initialized");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Native streaming path
  if (typeof model.generateContentStream === "function") {
    const result = await model.generateContentStream({
      contents: toGeminiContents(messages),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.3 }
    });

    return (async function* () {
      let emitted = false;
      for await (const chunk of result.stream) {
        let txt = "";
        try { txt = typeof chunk.text === "function" ? chunk.text() : ""; } catch {}
        if (txt) { emitted = true; yield txt; }
      }
      // If chunks were empty, try final aggregate text
      try {
        const final = await result.response;
        const finalText = typeof final.text === "function" ? final.text() : "";
        if (!emitted && finalText) yield finalText;
      } catch {}
    })();
  }

  // Fallback: non-streaming -> fake chunks
  const resp = await model.generateContent({
    contents: toGeminiContents(messages),
    generationConfig: { maxOutputTokens: 1024, temperature: 0.3 }
  });
  const finalText =
    (resp.response && typeof resp.response.text === "function" && resp.response.text()) || "";

  return (async function* () {
    const s = String(finalText || "");
    const size = 160;
    for (let i = 0; i < s.length; i += size) yield s.slice(i, i + size);
  })();
};
