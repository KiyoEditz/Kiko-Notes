const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const memoryDb = require('./memory-db');

const IMAGES_DIR = path.join(__dirname, '..', 'data', 'images');
const IMAGE_ID_RE = /^[a-f0-9]{64}$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

let _lastBackendMarker = null;
let _lastBackendUrl = null;
let _reconcilePromise = null;

function ensureImagesDir() {
    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function getImageFilePath(id) {
    if (typeof id !== 'string' || !IMAGE_ID_RE.test(id)) return null;
    return path.join(IMAGES_DIR, id.slice(0, 2), `${id}.jpg`);
}

function isJpegBuffer(buf) {
    return Buffer.isBuffer(buf) && buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/**
 * Save a compressed JPEG buffer locally under data/images/<2-hex>/<sha256>.jpg
 * and record it in SQLite `images`. Deduplicates identical hashes.
 */
function saveLocalImage(jpegBuffer, { width = null, height = null, expectedHash = null } = {}) {
    if (!isJpegBuffer(jpegBuffer)) {
        throw new Error('Invalid image: only JPEG bytes are accepted');
    }
    if (jpegBuffer.length > MAX_IMAGE_BYTES) {
        throw new Error(`Image exceeds ${MAX_IMAGE_BYTES} byte limit`);
    }

    const id = crypto.createHash('sha256').update(jpegBuffer).digest('hex');
    if (expectedHash && expectedHash.toLowerCase() !== id) {
        throw new Error('SHA-256 hash mismatch');
    }

    ensureImagesDir();
    const targetPath = getImageFilePath(id);
    const shardDir = path.dirname(targetPath);
    if (!fs.existsSync(shardDir)) fs.mkdirSync(shardDir, { recursive: true });

    if (!fs.existsSync(targetPath)) {
        const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(tmpPath, jpegBuffer);
        fs.renameSync(tmpPath, targetPath);
    }

    const record = memoryDb.upsertImageRecord({
        id,
        width: Number.isFinite(Number(width)) ? Number(width) : null,
        height: Number.isFinite(Number(height)) ? Number(height) : null,
        bytes: jpegBuffer.length
    });

    return {
        id,
        width: record ? record.width : width,
        height: record ? record.height : height,
        bytes: jpegBuffer.length,
        url: `/api/images/${id}`
    };
}

function readLocalImage(id) {
    const fp = getImageFilePath(id);
    if (!fp || !fs.existsSync(fp)) return null;
    return fs.readFileSync(fp);
}

function getSessionMarker() {
    return _lastBackendMarker;
}

function invalidateSessionMarker() {
    _lastBackendMarker = null;
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...opts, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function uploadSingleImage(cleanBaseUrl, apiKey, id, marker, maxRetries = 2) {
    const buf = readLocalImage(id);
    if (!buf) {
        console.warn(`⚠️ [ImageSync] Local file missing for ${id}, skipping upload`);
        return false;
    }

    const url = `${cleanBaseUrl}/images/${id}`;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetchWithTimeout(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'image/jpeg',
                    'Content-Length': String(buf.length)
                },
                body: buf
            }, 30000);

            if (res.ok) {
                if (marker) memoryDb.updateImageSyncedMarker(id, marker);
                return true;
            }
            if (res.status === 413 || res.status === 415 || res.status === 422) {
                console.error(`❌ [ImageSync] Permanent upload error HTTP ${res.status} for ${id}`);
                return false;
            }
        } catch (err) {
            if (attempt === maxRetries) {
                console.warn(`⚠️ [ImageSync] Upload failed for ${id}: ${err.message}`);
                return false;
            }
        }
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
    }
    return false;
}

/**
 * Reconcile local images with the remote Kaggle Gateway:
 * 1. Fetch GET /session (or use knownMarker from heartbeat) to get backend startup marker.
 * 2. If marker changed (or candidateIds have synced_marker !== marker), check POST /images/manifest.
 * 3. Upload only missing JPEGs via raw binary PUT /images/{id} (concurrency 2).
 */
async function reconcileWithBackend({ baseUrl, apiKey, candidateIds = null, knownMarker = null, force = false } = {}) {
    if (!baseUrl || baseUrl.includes('your-colab-url')) return { ok: false, reason: 'no_base_url' };
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const key = apiKey || 'sk-kaggle-local';

    if (_reconcilePromise && !force) {
        return _reconcilePromise;
    }

    _reconcilePromise = (async () => {
        try {
            let marker = knownMarker;
            let capabilities = { image_ref: true, manifest: true };

            if (!marker || force || _lastBackendUrl !== cleanBase) {
                const sessRes = await fetchWithTimeout(`${cleanBase}/session`, {
                    headers: { 'Authorization': `Bearer ${key}` }
                }, 10000);
                if (!sessRes.ok) {
                    return { ok: false, reason: `session_http_${sessRes.status}` };
                }
                const sess = await sessRes.json();
                marker = sess.marker || null;
                if (sess.capabilities) capabilities = sess.capabilities;
            }

            if (!marker) return { ok: false, reason: 'no_marker' };

            const allRecords = memoryDb.getAllImageRecords();
            const targetIds = Array.isArray(candidateIds) && candidateIds.length > 0
                ? Array.from(new Set(candidateIds.filter(id => IMAGE_ID_RE.test(id))))
                : allRecords.map(r => r.id);

            const markerChanged = (_lastBackendMarker !== marker) || (_lastBackendUrl !== cleanBase);
            _lastBackendMarker = marker;
            _lastBackendUrl = cleanBase;

            if (targetIds.length === 0) {
                return { ok: true, marker, uploaded: 0, skipped: 0 };
            }

            // Check which candidateIds still need verification
            const recordMap = new Map(allRecords.map(r => [r.id, r]));
            const needCheck = force || markerChanged
                ? targetIds
                : targetIds.filter(id => {
                    const rec = recordMap.get(id);
                    return !rec || rec.synced_marker !== marker;
                });

            if (needCheck.length === 0) {
                return { ok: true, marker, uploaded: 0, skipped: targetIds.length };
            }

            let missingIds = needCheck;
            if (capabilities.manifest) {
                try {
                    const manRes = await fetchWithTimeout(`${cleanBase}/images/manifest`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${key}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ids: needCheck })
                    }, 15000);
                    if (manRes.ok) {
                        const manData = await manRes.json();
                        if (Array.isArray(manData.missing)) {
                            missingIds = manData.missing;
                            const missingSet = new Set(missingIds);
                            for (const id of needCheck) {
                                if (!missingSet.has(id)) {
                                    memoryDb.updateImageSyncedMarker(id, marker);
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`⚠️ [ImageSync] Manifest check failed, falling back to direct upload:`, err.message);
                }
            }

            let uploaded = 0;
            const CONCURRENCY = 2;
            for (let i = 0; i < missingIds.length; i += CONCURRENCY) {
                const batch = missingIds.slice(i, i + CONCURRENCY);
                const results = await Promise.all(
                    batch.map(id => uploadSingleImage(cleanBase, key, id, marker))
                );
                uploaded += results.filter(Boolean).length;
            }

            if (uploaded > 0 || markerChanged) {
                console.log(`🖼️ [ImageSync] Marker=${marker.slice(0, 8)}… checked=${needCheck.length}, uploaded=${uploaded}`);
            }

            return { ok: true, marker, uploaded, checked: needCheck.length };
        } catch (err) {
            console.warn(`⚠️ [ImageSync] Reconcile failed:`, err.message);
            return { ok: false, error: err.message };
        } finally {
            _reconcilePromise = null;
        }
    })();

    return _reconcilePromise;
}

module.exports = {
    IMAGES_DIR,
    IMAGE_ID_RE,
    MAX_IMAGE_BYTES,
    saveLocalImage,
    readLocalImage,
    getImageFilePath,
    getSessionMarker,
    invalidateSessionMarker,
    reconcileWithBackend
};
