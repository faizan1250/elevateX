// controllers/assistantController.js
const AssistantThread = require("../models/AssistantThread");
const Skill = require("../models/Skill");
const { countTokens } = require("../library/llmtoken");
const { streamFromLLM } = require("../library/llmstream");

/* ---------- threads ---------- */

exports.listThreads = async (req, res) => {
  try {
    const { skillId } = req.params;

    const threads = await AssistantThread.find({ skillId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("_id title lastMessageAt updatedAt")
      .lean();

    res.json({
      threads: threads.map(t => ({
        id: String(t._id),
        title: t.title || "Conversation",
        lastMessageAt: t.lastMessageAt || t.updatedAt
      }))
    });
  } catch (err) {
    console.error("listThreads error:", err);
    res.status(500).json({ message: "Failed to list threads" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    const thread = await AssistantThread.findById(threadId)
      .select("messages")
      .lean();
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    res.json({ messages: thread.messages });
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ message: "Failed to get messages" });
  }
};

exports.createThread = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { firstMessage } = req.body || {};
    const t = await AssistantThread.create({
      skillId,
      title: firstMessage?.slice(0, 80) || "Conversation",
      lastMessageAt: new Date(),
      messages: firstMessage
        ? [{ role: "user", content: firstMessage, tokens: countTokens(firstMessage) }]
        : []
    });
    res.status(201).json({ id: String(t._id), title: t.title });
  } catch (err) {
    console.error("createThread error:", err);
    res.status(500).json({ message: "Failed to create thread" });
  }
};

exports.renameThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { title } = req.body || {};
    await AssistantThread.updateOne({ _id: threadId }, { $set: { title } });
    res.json({ ok: true });
  } catch (err) {
    console.error("renameThread error:", err);
    res.status(500).json({ message: "Failed to rename thread" });
  }
};

/* ---------- SSE chat ---------- */
exports.querySSE = async (req, res) => {
  // 1) SSE headers first, or everything buffers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // nginx: stop buffering
  // If you’re cross-origin, uncomment:
  // res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.flushHeaders?.();

  const send = (obj) => {
    try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch {}
  };

  // Keep-alive so proxies don’t kill idle streams
  const heartbeat = setInterval(() => send({ event: "ping", t: Date.now() }), 15000);
  let aborted = false;
  req.on("close", () => { aborted = true; clearInterval(heartbeat); });

  try {
    const { skillId } = req.params;
    let { threadId, message, preset } = req.body || {};

    const genAI = req.app.get("genAI");
    if (!genAI) {
      send({ error: "AI not initialized" });
      return res.end();
    }

    // 2) Load skill context
    const skill = await Skill.findById(skillId).lean();
    if (!skill) { send({ error: "Skill not found" }); return res.end(); }

    // 3) Preset resolution
    const presets = {
      beginner: `Explain ${skill.name} to a complete beginner. Use what/why/how, then a tiny example.`,
      practice: `Give one practical exercise for ${skill.name} with acceptance criteria and a subtle gotcha.`,
      mistakes: `List 5 common mistakes when learning ${skill.name} and how to avoid them.`,
      advanced: `Teach an advanced technique in ${skill.name}, include when NOT to use it.`,
      realworld: `Show a compact case study using ${skill.name} in production. Steps and pitfalls.`,
      roadmap: `Create a 14-day learning roadmap for ${skill.name} with daily tasks and estimated time.`,
    };
    if (!message && preset && presets[preset]) message = presets[preset];
    if (!message) { send({ error: "message is required" }); return res.end(); }

    // 4) Thread plumbing
    let thread = threadId ? await AssistantThread.findById(threadId) : null;
    if (!thread) {
      thread = await AssistantThread.create({
        skillId,
        title: message.slice(0, 80),
        lastMessageAt: new Date(),
        messages: []
      });
      threadId = thread._id;
    }

    // Save user message
    thread.messages.push({ role: "user", content: message, tokens: countTokens(message) });
    thread.lastMessageAt = new Date();
    await thread.save();

    if (aborted) return;

    // Tell the client we actually started (useful in curl/network tab)
    send({ event: "start", threadId: String(threadId) });

    // 5) Build context (llmstream maps roles for Gemini)
    const systemPrompt = [
      {
        role: "system",
        content:
          `You are a precise AI Learning Assistant for the skill "${skill.name}". ` +
          `Respond concisely with clear sections and minimal runnable examples when relevant.`
      }
    ];
    const history = thread.messages.slice(-12);

    // 6) Primary path: stream tokens
    let full = "";
    let chunkCount = 0;
    const stream = await streamFromLLM(genAI, [
      ...systemPrompt,
      ...history.map(m => ({ role: m.role, content: m.content })),
    ]);

    for await (const chunk of stream) {
      if (aborted) break;
      full += chunk;
      chunkCount++;
      send({ token: chunk });
    }

    // 7) Rescue path: if streaming produced ZERO chunks, do a one-shot non-streaming call
    if (!aborted && chunkCount === 0) {
      try {
        // local helper to map roles for Gemini (system/user -> user, assistant -> model)
        const mapToGemini = (msgs = []) =>
          msgs.filter(x => x && x.content).map(x => ({
            role: x.role === "assistant" ? "model" : "user",
            parts: [{ text: String(x.content) }]
          }));

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const resp = await model.generateContent({
          contents: mapToGemini([
            ...systemPrompt,
            ...history.map(m => ({ role: m.role, content: m.content })),
          ]),
          generationConfig: { maxOutputTokens: 1024, temperature: 0.3 }
        });

        const fallbackText =
          (resp.response && typeof resp.response.text === "function" && resp.response.text()) || "";

        if (fallbackText && fallbackText.trim()) {
          full = fallbackText;
          // drip it out so the UI shows something
          send({ token: full });
        }
      } catch (fallbackErr) {
        console.warn("Fallback generation failed:", fallbackErr?.message || fallbackErr);
      }
    }

    // 8) Persist reply if we have any text at all
    if (!aborted && full && full.trim().length) {
      thread.messages.push({ role: "assistant", content: full, tokens: countTokens(full) });
      thread.lastMessageAt = new Date();
      await thread.save();
      send({ done: true, threadId: String(threadId) });
    } else if (!aborted) {
      console.warn("LLM produced no text", { threadId: String(threadId), chunks: chunkCount, len: full?.length || 0 });
      send({ error: "No response from AI" });
    }
  } catch (e) {
    console.error("querySSE error:", e);
    if (!aborted) send({ error: e.message || "generation failed" });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
};