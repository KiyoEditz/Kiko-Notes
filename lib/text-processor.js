/**
 * Multilingual (Indonesian + English) text normalization, stemming,
 * stopword filtering, and FTS5 query construction.
 *
 * The exact same normalizeText() pipeline is used both at index time
 * (stored in content_norm / text_norm) and at query time so terms match.
 */

const STOPWORDS_ID = new Set([
    'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'dengan', 'pada',
    'adalah', 'atau', 'juga', 'sudah', 'belum', 'akan', 'bisa', 'dapat', 'ada',
    'tidak', 'tak', 'bukan', 'ya', 'iya', 'kah', 'lah', 'pun', 'saja', 'hanya',
    'karena', 'sebab', 'jika', 'kalau', 'bila', 'ketika', 'saat', 'waktu',
    'oleh', 'sebagai', 'seperti', 'tentang', 'antara', 'dalam', 'atas', 'bawah',
    'aku', 'saya', 'gue', 'gw', 'kamu', 'kau', 'lu', 'lo', 'dia', 'mereka',
    'kami', 'kita', 'nya', 'ku', 'mu', 'apa', 'siapa', 'mana', 'kapan', 'mengapa',
    'kenapa', 'bagaimana', 'apakah', 'cukup', 'sangat', 'lebih', 'kurang', 'lagi',
    'masih', 'sedang', 'telah', 'pernah', 'harus', 'wajib', 'mau', 'ingin',
    'milikku', 'milikmu', 'miliknya', 'milik', 'punya', 'nih', 'sih', 'dong', 'deh',
    'kok', 'lho', 'kan', 'yah', 'nah', 'tapi', 'tetapi', 'namun', 'melainkan',
    'agar', 'supaya', 'lalu', 'kemudian', 'terus', 'jadi', 'maka', 'semua', 'banyak'
]);

const STOPWORDS_EN = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where',
    'why', 'how', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may',
    'might', 'must', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your',
    'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them',
    'their', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
    'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'once',
    'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'also', 'now'
]);

// Technical / short domain tokens that must never be stripped or stemmed
const PROTECTED_TOKENS = new Set([
    'ai', 'ml', 'ui', 'ux', 'db', 'id', 'en', 'js', 'ts', 'py', 'v1', 'v2', '1b',
    '2b', '3b', '4b', '7b', '8b', '9b', '14b', '24k', '32b', 'ocr', 'llm', 'gpu',
    'cpu', 'ram', 'vram', 'cuda', 'onnx', 'fts5', 'bm25', 'sql', 'json', 'api',
    'lora', 'qlora', 'gguf', 'fp16', 'fp32', 'int8', 'q4', 'q6', 'q8', 'rrf'
]);

/**
 * Lightweight rule-based Indonesian stemmer.
 * Strips common Indonesian suffixes and prefixes while protecting short roots
 * and technical identifiers.
 *
 * @param {string} word
 * @returns {string}
 */
function stemIndonesian(word) {
    if (!word || word.length <= 4 || PROTECTED_TOKENS.has(word) || /\d/.test(word)) {
        return word;
    }

    let w = word;

    // 1. Strip possessive / particle suffixes
    for (const suf of ['lah', 'kah', 'tah', 'pun', 'nya', 'ku', 'mu']) {
        if (w.length > suf.length + 3 && w.endsWith(suf)) {
            w = w.slice(0, -suf.length);
            break;
        }
    }

    // 2. Strip derivational suffixes
    for (const suf of ['kan', 'an', 'i']) {
        if (w.length > suf.length + 3 && w.endsWith(suf)) {
            w = w.slice(0, -suf.length);
            break;
        }
    }

    // 3. Strip common prefixes
    const prefixes = [
        'meng', 'meny', 'mend', 'men', 'mem', 'me',
        'peng', 'peny', 'pend', 'pen', 'pem', 'pe',
        'ber', 'ter', 'per', 'di', 'ke', 'se'
    ];
    for (const pre of prefixes) {
        if (w.length > pre.length + 3 && w.startsWith(pre)) {
            w = w.slice(pre.length);
            break;
        }
    }

    return w.length >= 2 ? w : word;
}

/**
 * Tokenize and normalize text into an array of canonical terms.
 *
 * @param {string} text
 * @returns {string[]}
 */
function normalizeTokens(text) {
    if (typeof text !== 'string' || !text.trim()) return [];

    const normalized = text.normalize('NFKC').toLowerCase();
    // Match alphanumeric sequences including underscores (e.g. q4_k_m, 1b, 24k)
    const rawTokens = normalized.match(/[a-z0-9_]+/g) || [];
    const result = [];

    for (const raw of rawTokens) {
        const token = raw.replace(/^_+|_+$/g, '');
        if (!token) continue;

        const isNumeric = /^\d+$/.test(token);
        if (token.length === 1 && !isNumeric) continue;

        if (!PROTECTED_TOKENS.has(token) && (STOPWORDS_ID.has(token) || STOPWORDS_EN.has(token))) {
            continue;
        }

        const stemmed = stemIndonesian(token);
        if (stemmed.length === 1 && !isNumeric) continue;
        result.push(stemmed);
    }

    return result;
}

/**
 * Produce a normalized space-separated string for FTS5 indexing.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
    return normalizeTokens(text).join(' ');
}

/**
 * Build a safe SQLite FTS5 MATCH query with synonym expansion.
 * Every term is double-quoted to prevent FTS5 syntax injection.
 *
 * @param {string} text
 * @param {Map<string, string[]>} [synonymMap]
 * @returns {string}
 */
function buildFtsQuery(text, synonymMap = null) {
    const tokens = normalizeTokens(text);
    if (tokens.length === 0) return '';

    const expanded = new Set();
    for (const tok of tokens) {
        expanded.add(tok);
        if (synonymMap && synonymMap.has(tok)) {
            for (const syn of synonymMap.get(tok)) {
                if (syn) expanded.add(syn);
            }
        }
    }

    return Array.from(expanded)
        .slice(0, 24) // cap FTS clause count to keep queries fast on low-power CPUs
        .map(t => `"${t.replace(/"/g, '')}"`)
        .join(' OR ');
}

/**
 * Fast local token count approximation (~3.8 chars per token for mixed ID/EN).
 *
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
    if (typeof text !== 'string' || !text) return 0;
    return Math.max(1, Math.ceil(text.length / 3.8));
}

module.exports = {
    normalizeTokens,
    normalizeText,
    buildFtsQuery,
    estimateTokens,
    stemIndonesian
};
