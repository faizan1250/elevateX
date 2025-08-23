// routes/assistant.js
const r = require("express").Router();
const express = require("express");
const requireAuth  = require("../../middleware/auth");
const ctrl = require("../controllers/assistantController");
r.use(express.json());
r.post('/:skillId/debug-stream', (req, res) => {
  console.log('HIT /debug-stream', req.params.skillId, new Date().toISOString());

  // absolutely first
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');     // nginx
  res.setHeader('Transfer-Encoding', 'chunked'); // belt + suspenders
  // CORS for direct calls while debugging (remove later or lock to your FE origin)
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.flushHeaders?.();

  // write immediately so the client sees something
  res.write(`data: ${JSON.stringify({ token: 'init ' })}\n\n`);

  // send a padding comment ~2KB to punch through some proxy buffers
  res.write(':' + ' '.repeat(2048) + '\n\n');

  // heartbeat to keep the connection alive
  const hb = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 15000);

  let i = 0;
  const iv = setInterval(() => {
    i++;
    res.write(`data: ${JSON.stringify({ token: `chunk-${i} ` })}\n\n`);
    if (i === 5) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      clearInterval(iv);
      clearInterval(hb);
      res.end();
    }
  }, 300);

  req.on('close', () => {
    clearInterval(iv);
    clearInterval(hb);
    try { res.end(); } catch {}
  });
});
r.get("/:skillId/threads", requireAuth, ctrl.listThreads);
r.get("/:skillId/threads/:threadId/messages", requireAuth, ctrl.getMessages);

r.post("/:skillId/query", requireAuth, ctrl.querySSE);             // SSE stream
r.post("/:skillId/threads", requireAuth, ctrl.createThread);       // optional explicit create
r.post("/:skillId/threads/:threadId/rename", requireAuth, ctrl.renameThread); // optional

module.exports = r;
