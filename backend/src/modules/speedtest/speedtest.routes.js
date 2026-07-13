import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// GET /speedtest/download?size=10  (size in MB, default 10, max 50)
// Streams random bytes — the mobile client measures throughput.
router.get('/download', (req, res) => {
  const sizeMB = Math.min(Math.max(Number(req.query.size) || 10, 1), 50);
  const totalBytes = sizeMB * 1024 * 1024;
  const chunkSize = 64 * 1024; // 64 KB chunks

  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Length': totalBytes,
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
  });

  let sent = 0;
  function sendChunk() {
    while (sent < totalBytes) {
      const remaining = totalBytes - sent;
      const size = Math.min(chunkSize, remaining);
      const chunk = crypto.randomBytes(size);
      const canContinue = res.write(chunk);
      sent += size;
      if (!canContinue) {
        res.once('drain', sendChunk);
        return;
      }
    }
    res.end();
  }
  sendChunk();
});

// POST /speedtest/upload
// Accepts raw body and discards it — the mobile client measures upload throughput.
router.post('/upload', (req, res) => {
  let bytes = 0;
  req.on('data', (chunk) => { bytes += chunk.length; });
  req.on('end', () => {
    res.json({ received: bytes });
  });
});

// GET /speedtest/ping
// Returns immediately — the client measures round-trip time.
router.get('/ping', (_req, res) => {
  res.json({ ts: Date.now() });
});

export default router;
