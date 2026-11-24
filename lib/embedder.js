/**
 * Configurable local embedding layer for Kiko Notes.
 *
 * Controlled via .env:
 *   EMBEDDING_MODE  = onnx | model2vec | none
 *   EMBEDDING_MODEL = Xenova/multilingual-e5-small (or minishlab/potion-multilingual-128M)
 *   EMBEDDING_DTYPE = q8 | fp32
 *
 * Lazy-loads @huggingface/transformers only when EMBEDDING_MODE !== 'none'.
 * Logs load time and per-call latency so performance can be benchmarked on
 * low-power CPUs (e.g. Celeron N4000).
 */

let _extractorPromise = null;
let _extractorFailed = false;
let _loadedModelKey = null;

function getEmbedderConfig() {
    const mode = (process.env.EMBEDDING_MODE || 'onnx').trim().toLowerCase();
    const defaultModel = mode === 'model2vec'
        ? 'minishlab/potion-multilingual-128M'
        : 'Xenova/multilingual-e5-small';
    const model = (process.env.EMBEDDING_MODEL || defaultModel).trim();
    const dtype = (process.env.EMBEDDING_DTYPE || 'q8').trim().toLowerCase();
    return { mode, model, dtype };
}

function isEnabled() {
    return getEmbedderConfig().mode !== 'none';
}

function getModelKey() {
    const { mode, model, dtype } = getEmbedderConfig();
    if (mode === 'none') return 'none';
    return `${mode}:${model}:${dtype}`;
}

async function getExtractor() {
    const cfg = getEmbedderConfig();
    if (cfg.mode === 'none' || _extractorFailed) return null;

    const key = getModelKey();
    if (_extractorPromise && _loadedModelKey === key) {
        return _extractorPromise;
    }

    _loadedModelKey = key;
    _extractorPromise = (async () => {
        const t0 = Date.now();
        try {
            const { pipeline } = await import('@huggingface/transformers');
            const opts = cfg.mode === 'onnx' ? { dtype: cfg.dtype } : {};
            console.log(`🧠 [Embedder] Loading ${cfg.mode} model "${cfg.model}" (${cfg.dtype})...`);
            const extractor = await pipeline('feature-extraction', cfg.model, opts);
            const elapsed = Date.now() - t0;
            const rssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
            console.log(`✅ [Embedder] Ready in ${elapsed} ms (RSS: ${rssMb} MB)`);
            return extractor;
        } catch (err) {
            _extractorFailed = true;
            console.error(`❌ [Embedder] Failed to load "${cfg.model}":`, err.message);
            return null;
        }
    })();

    return _extractorPromise;
}

/**
 * Format input text according to model conventions (E5 uses query:/passage: prefixes).
 */
function formatInputForModel(text, kind, modelName) {
    const clean = (text || '').trim();
    if (!clean) return '';
    if (modelName.toLowerCase().includes('e5')) {
        return `${kind === 'query' ? 'query' : 'passage'}: ${clean}`;
    }
    return clean;
}

/**
 * Compute an L2-normalized Float32Array embedding for the given text.
 * Returns null if disabled or if inference fails.
 *
 * @param {string} text
 * @param {'query'|'passage'} [kind='passage']
 * @returns {Promise<Float32Array|null>}
 */
async function embedText(text, kind = 'passage') {
    const cfg = getEmbedderConfig();
    if (cfg.mode === 'none') return null;

    const formatted = formatInputForModel(text, kind, cfg.model);
    if (!formatted) return null;

    const extractor = await getExtractor();
    if (!extractor) return null;

    const t0 = Date.now();
    try {
        const output = await extractor(formatted, { pooling: 'mean', normalize: true });
        const vec = output && output.data ? new Float32Array(output.data) : null;
        const ms = Date.now() - t0;
        if (kind === 'query') {
            console.log(`⏱️ [Embedder] query encoded in ${ms} ms (dim=${vec ? vec.length : 0})`);
        }
        return vec;
    } catch (err) {
        console.warn(`⚠️ [Embedder] embedText failed:`, err.message);
        return null;
    }
}

/**
 * Cosine similarity between two Float32Array vectors (assumed L2-normalized,
 * with safe fallback normalization).
 *
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        const va = a[i];
        const vb = b[i];
        dot += va * vb;
        normA += va * va;
        normB += vb * vb;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
}

function serializeVector(vec) {
    return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

function deserializeVector(buf) {
    if (!buf) return null;
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    return new Float32Array(ab);
}

module.exports = {
    getEmbedderConfig,
    getModelKey,
    isEnabled,
    getExtractor,
    embedText,
    cosineSimilarity,
    serializeVector,
    deserializeVector
};
