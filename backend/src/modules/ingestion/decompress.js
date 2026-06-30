import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { extract } from 'tar-stream';

const gunzip = promisify(zlib.gunzip);

/**
 * Expand an uploaded/pulled file into one or more CSV entries.
 * Supports: plain .csv, gzip .csv.gz, and .tar.gz / .tgz archives (the Huawei
 * daily pmexport packaging). Returns [{ name, buffer }] of CSV members only.
 */
export async function expandToCsvEntries(fileName, buffer) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    const tar = await gunzip(buffer);
    return untarCsvs(tar);
  }
  if (lower.endsWith('.tar')) {
    return untarCsvs(buffer);
  }
  if (lower.endsWith('.gz')) {
    const csv = await gunzip(buffer);
    return [{ name: fileName.replace(/\.gz$/i, ''), buffer: csv }];
  }
  // plain csv (or unknown — let the parser decide)
  return [{ name: fileName, buffer }];
}

function untarCsvs(tarBuffer) {
  return new Promise((resolve, reject) => {
    const entries = [];
    const ex = extract();
    ex.on('entry', (header, stream, next) => {
      if (header.type !== 'file' || !/\.csv$/i.test(header.name)) {
        stream.resume();
        stream.on('end', next);
        return;
      }
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => { entries.push({ name: header.name.split('/').pop(), buffer: Buffer.concat(chunks) }); next(); });
      stream.on('error', reject);
    });
    ex.on('finish', () => resolve(entries));
    ex.on('error', reject);
    ex.end(tarBuffer);
  });
}
