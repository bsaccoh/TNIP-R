import axios from 'axios';

/**
 * Runs a Ping latency test by sending a small request to 1.1.1.1 and measuring elapsed time.
 */
export async function runPingTest(): Promise<number> {
  const start = Date.now();
  try {
    await axios.get('https://1.1.1.1', { timeout: 4000 });
  } catch (err: any) {
    // If blocked or network error but still got a response or timeout
  }
  return Date.now() - start;
}

/**
 * Downloads a 5MB payload from Cloudflare speed test, tracking progress and speed.
 * @param onProgress Callback receiving current speed in Mbps and download progress (0.0 to 1.0)
 */
export async function runDownloadTest(
  onProgress: (mbps: number, progress: number) => void
): Promise<number> {
  const url = 'https://speed.cloudflare.com/__down?bytes=5000000'; // 5MB
  const start = Date.now();
  let finalSpeed = 0;

  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      onDownloadProgress: (progressEvent) => {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed > 0 && progressEvent.loaded) {
          // Mbps = (bits) / (seconds * 1000000)
          const mbps = (progressEvent.loaded * 8) / (1000000 * elapsed);
          const progress = progressEvent.total ? progressEvent.loaded / progressEvent.total : 0;
          onProgress(mbps, progress);
          finalSpeed = mbps;
        }
      },
    });
    
    const totalTime = (Date.now() - start) / 1000;
    if (totalTime > 0) {
      finalSpeed = (res.data.byteLength * 8) / (1000000 * totalTime);
    }
  } catch (err: any) {
    if (finalSpeed === 0) throw err;
  }

  return finalSpeed;
}

/**
 * Uploads a 2MB chunk of dummy data, tracking progress and speed.
 * @param onProgress Callback receiving current speed in Mbps and upload progress (0.0 to 1.0)
 */
export async function runUploadTest(
  onProgress: (mbps: number, progress: number) => void
): Promise<number> {
  const url = 'https://speed.cloudflare.com/__up';
  const data = new Uint8Array(2000000); // 2MB
  const start = Date.now();
  let finalSpeed = 0;

  try {
    await axios.post(url, data, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 20000,
      onUploadProgress: (progressEvent) => {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed > 0 && progressEvent.loaded) {
          const mbps = (progressEvent.loaded * 8) / (1000000 * elapsed);
          const progress = progressEvent.total ? progressEvent.loaded / progressEvent.total : 0;
          onProgress(mbps, progress);
          finalSpeed = mbps;
        }
      },
    });

    const totalTime = (Date.now() - start) / 1000;
    if (totalTime > 0) {
      finalSpeed = (2000000 * 8) / (1000000 * totalTime);
    }
  } catch (err: any) {
    if (finalSpeed === 0) throw err;
  }

  return finalSpeed;
}
