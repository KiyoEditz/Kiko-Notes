const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const {
    normalizeText,
    buildFtsQuery,
    estimateTokens
} = require('./text-processor');
const embedder = require('./embedder');

let db = null;
let _bgEmbedRunning = false;

function getSelectedMessageContent(msg) {
    if (!msg) return '';
    if (Array.isArray(msg.alternates) && msg.selectedAlternate !== undefined) {
        return msg.alternates[msg.selectedAlternate] ?? msg.content ?? '';
    }
    return msg.content ?? '';
}

function toEpochMs(isoOrNum) {
    if (typeof isoOrNum === 'number' && Number.isFinite(isoOrNum)) return isoOrNum;
    if (typeof isoOrNum === 'string') {
        const parsed = Date.parse(isoOrNum);
        if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
}

function initMemoryDb(dbPath) {
    if (db) return db;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id         TEXT PRIMARY KEY,
            title      TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id         TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            msg_id          TEXT NOT NULL,
            role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content         TEXT NOT NULL,
            content_norm    TEXT NOT NULL,
            token_estimate  INTEGER NOT NULL DEFAULT 0,
            created_at      INTEGER NOT NULL,
            UNIQUE(chat_id, msg_id)
        );

        CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, id);

        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
            content_norm,
            content='messages',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
        );

        CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content_norm) VALUES (new.id, new.content_norm);
        END;
        CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content_norm) VALUES('delete', old.id, old.content_norm);
        END;
        CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content_norm) VALUES('delete', old.id, old.content_norm);
            INSERT INTO messages_fts(rowid, content_norm) VALUES (new.id, new.content_norm);
        END;

        CREATE TABLE IF NOT EXISTS facts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id      TEXT NOT NULL DEFAULT '1',
            text            TEXT NOT NULL,
            text_norm       TEXT NOT NULL,
            category        TEXT DEFAULT '',
            source_msg_ids  TEXT DEFAULT '[]',
            status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded')),
            superseded_by   INTEGER REFERENCES facts(id),
            created_at      INTEGER NOT NULL,
            updated_at      INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_facts_persona_status ON facts(persona_id, status);

        CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
            text_norm,
            content='facts',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
        );

        CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
            INSERT INTO facts_fts(rowid, text_norm) VALUES (new.id, new.text_norm);
        END;
        CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
            INSERT INTO facts_fts(facts_fts, rowid, text_norm) VALUES('delete', old.id, old.text_norm);
        END;
        CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON facts BEGIN
            INSERT INTO facts_fts(facts_fts, rowid, text_norm) VALUES('delete', old.id, old.text_norm);
            INSERT INTO facts_fts(rowid, text_norm) VALUES (new.id, new.text_norm);
        END;

        CREATE TABLE IF NOT EXISTS synonyms (
            term     TEXT NOT NULL,
            group_id INTEGER NOT NULL,
            PRIMARY KEY (term, group_id)
        );

        CREATE TABLE IF NOT EXISTS embeddings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            target_type TEXT NOT NULL CHECK (target_type IN ('message', 'fact')),
            target_id   INTEGER NOT NULL,
            model_name  TEXT NOT NULL,
            dim         INTEGER NOT NULL,
            vector      BLOB NOT NULL,
            created_at  INTEGER NOT NULL,
            UNIQUE(target_type, target_id, model_name)
        );

        CREATE INDEX IF NOT EXISTS idx_embeddings_lookup ON embeddings(target_type, model_name, target_id);

        CREATE TABLE IF NOT EXISTS images (
            id            TEXT PRIMARY KEY,
            width         INTEGER,
            height        INTEGER,
            bytes         INTEGER NOT NULL,
            created_at    INTEGER NOT NULL,
            caption       TEXT,
            synced_marker TEXT
        );
    `);

    seedDefaultSynonyms();
    return db;
}

function seedDefaultSynonyms() {
    const count = db.prepare('SELECT COUNT(*) AS cnt FROM synonyms').get().cnt;
    if (count > 0) return;

    const groups = [
        ['latih', 'training', 'train', 'finetune'],
        ['gambar', 'image', 'foto', 'picture', 'img'],
        ['ingatan', 'memory', 'memori', 'ingat'],
        ['cepat', 'fast', 'ngebut', 'ringan'],
        ['berat', 'heavy', 'lambat', 'slow'],
        ['hapus', 'delete', 'remove', 'buang'],
        ['simpan', 'save', 'dump', 'export']
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO synonyms(term, group_id) VALUES (?, ?)');
    groups.forEach((terms, idx) => {
        const groupId = idx + 1;
        for (const raw of terms) {
            const norm = normalizeText(raw);
            if (norm) stmt.run(norm, groupId);
        }
    });
}

function loadSynonymMap() {
    const rows = db.prepare('SELECT term, group_id FROM synonyms').all();
    const byGroup = new Map();
    for (const r of rows) {
        if (!byGroup.has(r.group_id)) byGroup.set(r.group_id, []);
        byGroup.get(r.group_id).push(r.term);
    }
    const map = new Map();
    for (const terms of byGroup.values()) {
        for (const t of terms) {
            map.set(t, terms.filter(other => other !== t));
        }
    }
    return map;
}

function syncChatToDb(chat) {
    if (!db || !chat || !chat.id) return;

    const createdAt = toEpochMs(chat.createdAt);
    const updatedAt = toEpochMs(chat.updatedAt);

    db.prepare(`
        INSERT INTO conversations(id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            updated_at = excluded.updated_at
    `).run(chat.id, chat.title || 'New Chat', createdAt, updatedAt);

    const msgs = Array.isArray(chat.messages) ? chat.messages : [];
    const existingRows = db.prepare('SELECT id, msg_id, content FROM messages WHERE chat_id = ?').all(chat.id);
    const existingByMsgId = new Map(existingRows.map(r => [r.msg_id, r]));
    const activeMsgIds = new Set();

    const insertStmt = db.prepare(`
        INSERT INTO messages(chat_id, msg_id, role, content, content_norm, token_estimate, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStmt = db.prepare(`
        UPDATE messages
        SET role = ?, content = ?, content_norm = ?, token_estimate = ?
        WHERE id = ?
    `);
    const deleteEmbStmt = db.prepare(`DELETE FROM embeddings WHERE target_type = 'message' AND target_id = ?`);

    for (const m of msgs) {
        if (!m || !m.id || (m.role !== 'user' && m.role !== 'assistant')) continue;
        const content = getSelectedMessageContent(m);
        if (!content.trim()) continue;

        activeMsgIds.add(m.id);
        const existing = existingByMsgId.get(m.id);
        const norm = normalizeText(content);
        const tokEst = estimateTokens(content);
        const msgTime = toEpochMs(m.timestamp || chat.updatedAt);

        if (!existing) {
            insertStmt.run(chat.id, m.id, m.role, content, norm, tokEst, msgTime);
        } else if (existing.content !== content) {
            updateStmt.run(m.role, content, norm, tokEst, existing.id);
            deleteEmbStmt.run(existing.id);
        }
    }

    const deleteMsgStmt = db.prepare('DELETE FROM messages WHERE id = ?');
    for (const row of existingRows) {
        if (!activeMsgIds.has(row.msg_id)) {
            deleteEmbStmt.run(row.id);
            deleteMsgStmt.run(row.id);
        }
    }

    scheduleBackgroundEmbeddings();
}

function deleteChatFromDb(chatId) {
    if (!db || !chatId) return;
    const rows = db.prepare('SELECT id FROM messages WHERE chat_id = ?').all(chatId);
    const delEmb = db.prepare(`DELETE FROM embeddings WHERE target_type = 'message' AND target_id = ?`);
    for (const r of rows) delEmb.run(r.id);
    db.prepare('DELETE FROM conversations WHERE id = ?').run(chatId);
}

function importFromJsonFiles({ chatsDir, memoryFilePath }) {
    if (!db) return;

    if (chatsDir && fs.existsSync(chatsDir)) {
        const files = fs.readdirSync(chatsDir).filter(f => f.endsWith('.json'));
        for (const f of files) {
            try {
                const chat = JSON.parse(fs.readFileSync(path.join(chatsDir, f), 'utf8'));
                if (chat && chat.id) syncChatToDb(chat);
            } catch { /* skip malformed */ }
        }
    }

    const factCount = db.prepare('SELECT COUNT(*) AS cnt FROM facts').get().cnt;
    if (factCount === 0 && memoryFilePath && fs.existsSync(memoryFilePath)) {
        try {
            const mem = JSON.parse(fs.readFileSync(memoryFilePath, 'utf8'));
            const now = Date.now();
            const insertFact = db.prepare(`
                INSERT INTO facts(persona_id, text, text_norm, category, source_msg_ids, status, created_at, updated_at)
                VALUES (?, ?, ?, 'imported', '[]', 'active', ?, ?)
            `);
            if (mem && mem.personaMemories && typeof mem.personaMemories === 'object') {
                for (const [pid, slot] of Object.entries(mem.personaMemories)) {
                    for (const fText of (slot.facts || [])) {
                        if (typeof fText === 'string' && fText.trim()) {
                            insertFact.run(String(pid), fText.trim(), normalizeText(fText), now, now);
                        }
                    }
                }
            } else if (mem && Array.isArray(mem.facts)) {
                const pid = String(mem.personaId || '1');
                for (const fText of mem.facts) {
                    if (typeof fText === 'string' && fText.trim()) {
                        insertFact.run(pid, fText.trim(), normalizeText(fText), now, now);
                    }
                }
            }
        } catch { /* skip malformed */ }
    }
}

function getActiveFacts(personaId = '1') {
    if (!db) return [];
    return db.prepare(`
        SELECT id, persona_id, text, category, source_msg_ids, created_at, updated_at
        FROM facts
        WHERE persona_id = ? AND status = 'active'
        ORDER BY updated_at DESC, id DESC
    `).all(String(personaId || '1'));
}

function replaceFactsForPersona(personaId, factStrings) {
    if (!db) return [];
    const pid = String(personaId || '1');
    const cleanList = (Array.isArray(factStrings) ? factStrings : [])
        .map(s => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean);

    const existing = getActiveFacts(pid);
    const desiredNorms = new Set(cleanList.map(t => normalizeText(t)));
    const existingNorms = new Set(existing.map(r => r.text_norm || normalizeText(r.text)));
    const now = Date.now();

    const supersedeStmt = db.prepare(`UPDATE facts SET status = 'superseded', updated_at = ? WHERE id = ?`);
    for (const row of existing) {
        const norm = normalizeText(row.text);
        if (!desiredNorms.has(norm)) {
            supersedeStmt.run(now, row.id);
        }
    }

    const insertStmt = db.prepare(`
        INSERT INTO facts(persona_id, text, text_norm, category, source_msg_ids, status, created_at, updated_at)
        VALUES (?, ?, ?, 'manual', '[]', 'active', ?, ?)
    `);
    for (const text of cleanList) {
        const norm = normalizeText(text);
        if (!existingNorms.has(norm)) {
            insertStmt.run(pid, text, norm, now, now);
            existingNorms.add(norm);
        }
    }

    scheduleBackgroundEmbeddings();
    return getActiveFacts(pid);
}

function applyExtractedFacts(personaId, items) {
    if (!db || !Array.isArray(items)) return { added: 0, superseded: 0 };
    const pid = String(personaId || '1');
    const now = Date.now();
    const active = getActiveFacts(pid);
    const activeNorms = new Set(active.map(f => normalizeText(f.text)));
    const activeIds = new Set(active.map(f => Number(f.id)));

    const insertStmt = db.prepare(`
        INSERT INTO facts(persona_id, text, text_norm, category, source_msg_ids, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `);
    const supersedeStmt = db.prepare(`
        UPDATE facts SET status = 'superseded', superseded_by = ?, updated_at = ? WHERE id = ?
    `);

    let added = 0;
    let superseded = 0;

    for (const item of items) {
        if (!item || typeof item.text !== 'string' || !item.text.trim()) continue;
        const text = item.text.trim();
        const norm = normalizeText(text);
        if (!norm || activeNorms.has(norm)) continue;

        const category = typeof item.category === 'string' ? item.category.trim().slice(0, 64) : '';
        const srcIds = JSON.stringify(Array.isArray(item.source_msg_ids) ? item.source_msg_ids : []);
        const info = insertStmt.run(pid, text, norm, category, srcIds, now, now);
        const newId = Number(info.lastInsertRowid);
        activeNorms.add(norm);
        added++;

        const replacesId = item.replaces !== null && item.replaces !== undefined ? Number(item.replaces) : null;
        if (replacesId && activeIds.has(replacesId)) {
            supersedeStmt.run(newId, now, replacesId);
            activeIds.delete(replacesId);
            superseded++;
        }
    }

    if (added > 0) scheduleBackgroundEmbeddings();
    return { added, superseded };
}

/**
 * Background indexer: computes embeddings for messages/facts missing a vector
 * for the currently configured EMBEDDING_MODE/MODEL. Runs asynchronously in
 * small batches so it never blocks chat responses.
 */
function scheduleBackgroundEmbeddings() {
    if (!db || !embedder.isEnabled() || _bgEmbedRunning) return;
    _bgEmbedRunning = true;

    setImmediate(async () => {
        try {
            const modelKey = embedder.getModelKey();
            const missingMsgs = db.prepare(`
                SELECT m.id, m.content
                FROM messages m
                LEFT JOIN embeddings e
                  ON e.target_type = 'message' AND e.target_id = m.id AND e.model_name = ?
                WHERE e.id IS NULL
                ORDER BY m.id DESC
                LIMIT 20
            `).all(modelKey);

            const missingFacts = db.prepare(`
                SELECT f.id, f.text
                FROM facts f
                LEFT JOIN embeddings e
                  ON e.target_type = 'fact' AND e.target_id = f.id AND e.model_name = ?
                WHERE f.status = 'active' AND e.id IS NULL
                ORDER BY f.id DESC
                LIMIT 20
            `).all(modelKey);

            const insertEmb = db.prepare(`
                INSERT OR REPLACE INTO embeddings(target_type, target_id, model_name, dim, vector, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            for (const m of missingMsgs) {
                const vec = await embedder.embedText(m.content, 'passage');
                if (vec) {
                    insertEmb.run('message', m.id, modelKey, vec.length, embedder.serializeVector(vec), Date.now());
                }
            }

            for (const f of missingFacts) {
                const vec = await embedder.embedText(f.text, 'passage');
                if (vec) {
                    insertEmb.run('fact', f.id, modelKey, vec.length, embedder.serializeVector(vec), Date.now());
                }
            }
        } catch (err) {
            console.warn('⚠️ [MemoryDB] Background embedding error:', err.message);
        } finally {
            _bgEmbedRunning = false;
        }
    });
}

/**
 * Hybrid Retrieval (L1 Facts + L2 FTS5 BM25 + L3 Vector Cosine via RRF)
 * with +/-1 neighbor expansion and explicit MEMORY_BLOCK_TOKENS budgeting.
 */
async function retrieveMemoryContext({
    chatId,
    personaId = '1',
    queryText = '',
    excludeMsgIds = [],
    memoryBlockTokens = 2000,
    halfLifeDays = 30
}) {
    if (!db) return { facts: [], snippets: [], stats: { l1Count: 0, l2Count: 0, l3Count: 0 } };

    const pid = String(personaId || '1');
    const excludeSet = new Set(excludeMsgIds || []);
    const synonymMap = loadSynonymMap();
    const ftsQuery = buildFtsQuery(queryText, synonymMap);
    const queryVec = embedder.isEnabled() && queryText.trim()
        ? await embedder.embedText(queryText, 'query')
        : null;
    const modelKey = embedder.getModelKey();

    // ── 1. L1 Structured Facts (~30% of MEMORY_BLOCK_TOKENS) ──
    const factsBudget = Math.floor(memoryBlockTokens * 0.30);
    const allActiveFacts = getActiveFacts(pid);
    const factFtsScores = new Map();

    if (ftsQuery && allActiveFacts.length > 0) {
        try {
            const ftsFacts = db.prepare(`
                SELECT f.id, bm25(facts_fts) AS bm25
                FROM facts_fts
                JOIN facts f ON f.id = facts_fts.rowid
                WHERE facts_fts MATCH ? AND f.persona_id = ? AND f.status = 'active'
                ORDER BY bm25
                LIMIT 20
            `).all(ftsQuery, pid);
            ftsFacts.forEach((r, idx) => factFtsScores.set(r.id, 1 / (60 + idx + 1)));
        } catch { /* ignore FTS syntax edge cases */ }
    }

    const factVecScores = new Map();
    if (queryVec && allActiveFacts.length > 0) {
        const embRows = db.prepare(`
            SELECT target_id, vector FROM embeddings
            WHERE target_type = 'fact' AND model_name = ?
        `).all(modelKey);
        const scored = embRows.map(r => ({
            id: r.target_id,
            sim: embedder.cosineSimilarity(queryVec, embedder.deserializeVector(r.vector))
        })).sort((a, b) => b.sim - a.sim);
        scored.forEach((r, idx) => {
            if (r.sim > 0.25) factVecScores.set(r.id, 1 / (60 + idx + 1));
        });
    }

    const rankedFacts = allActiveFacts.map((f, recencyIdx) => {
        const rrf = (factFtsScores.get(f.id) || 0)
            + (factVecScores.get(f.id) || 0)
            + (1 / (120 + recencyIdx + 1));
        return { ...f, score: rrf };
    }).sort((a, b) => b.score - a.score);

    const selectedFacts = [];
    let usedFactTokens = 0;
    for (const f of rankedFacts) {
        const t = estimateTokens(f.text) + 4;
        if (usedFactTokens + t > factsBudget) continue;
        selectedFacts.push(f.text);
        usedFactTokens += t;
    }

    // ── 2. L2 FTS5 BM25 + Recency Decay ──────────────────────
    const snippetsBudget = Math.max(200, memoryBlockTokens - usedFactTokens);
    const now = Date.now();
    const msPerDay = 86400 * 1000;

    const bm25Rank = new Map();
    let l2Count = 0;
    if (ftsQuery) {
        try {
            const candidates = db.prepare(`
                SELECT m.id, m.chat_id, m.msg_id, m.created_at, bm25(messages_fts) AS bm25
                FROM messages_fts
                JOIN messages m ON m.id = messages_fts.rowid
                WHERE messages_fts MATCH ?
                ORDER BY bm25
                LIMIT 30
            `).all(ftsQuery);

            if (candidates.length > 0) {
                const maxRel = Math.max(...candidates.map(c => -c.bm25), 0.0001);
                const rescored = candidates.map(c => {
                    const relNorm = Math.max(0, -c.bm25) / maxRel;
                    const ageDays = Math.max(0, (now - c.created_at) / msPerDay);
                    const decay = Math.pow(0.5, ageDays / Math.max(1, halfLifeDays));
                    const sameConvBoost = c.chat_id === chatId ? 1.1 : 1.0;
                    return { id: c.id, score: relNorm * decay * sameConvBoost };
                }).sort((a, b) => b.score - a.score);

                rescored.forEach((r, idx) => bm25Rank.set(r.id, idx + 1));
                l2Count = rescored.length;
            }
        } catch { /* ignore */ }
    }

    // ── 3. L3 Vector Similarity Search ───────────────────────
    const vecRank = new Map();
    let l3Count = 0;
    if (queryVec) {
        const embRows = db.prepare(`
            SELECT target_id, vector FROM embeddings
            WHERE target_type = 'message' AND model_name = ?
        `).all(modelKey);

        const scored = [];
        for (const r of embRows) {
            const sim = embedder.cosineSimilarity(queryVec, embedder.deserializeVector(r.vector));
            if (sim > 0.30) scored.push({ id: r.target_id, sim });
        }
        scored.sort((a, b) => b.sim - a.sim);
        scored.slice(0, 30).forEach((r, idx) => vecRank.set(r.id, idx + 1));
        l3Count = scored.length;
    }

    // ── 4. RRF Merge & +/-1 Neighbor Expansion ───────────────
    const allCandidateIds = new Set([...bm25Rank.keys(), ...vecRank.keys()]);
    const rrfScored = Array.from(allCandidateIds).map(id => {
        const r2 = bm25Rank.get(id);
        const r3 = vecRank.get(id);
        const score = (r2 ? 1 / (60 + r2) : 0) + (r3 ? 1 / (60 + r3) : 0);
        return { id, score };
    }).sort((a, b) => b.score - a.score);

    const snippets = [];
    const includedRowIds = new Set();
    let usedSnippetTokens = 0;

    const getMsgStmt = db.prepare('SELECT id, chat_id, msg_id, role, content, token_estimate, created_at FROM messages WHERE id = ?');
    const getNeighborsStmt = db.prepare(`
        SELECT id, chat_id, msg_id, role, content, token_estimate, created_at
        FROM messages
        WHERE chat_id = ? AND id BETWEEN ? AND ?
        ORDER BY id ASC
    `);

    for (const cand of rrfScored.slice(0, 10)) {
        const center = getMsgStmt.get(cand.id);
        if (!center || excludeSet.has(center.msg_id)) continue;

        const windowRows = getNeighborsStmt.all(center.chat_id, center.id - 1, center.id + 1);
        const groupLines = [];
        let groupTokens = 0;

        for (const row of windowRows) {
            if (includedRowIds.has(row.id) || excludeSet.has(row.msg_id)) continue;
            const line = `[${row.role === 'user' ? 'User' : 'Assistant'}]: ${row.content}`;
            groupTokens += (row.token_estimate || estimateTokens(row.content)) + 4;
            groupLines.push({ id: row.id, line });
        }

        if (groupLines.length === 0) continue;
        if (usedSnippetTokens + groupTokens > snippetsBudget) break;

        for (const g of groupLines) includedRowIds.add(g.id);
        snippets.push(groupLines.map(g => g.line).join('\n'));
        usedSnippetTokens += groupTokens;
    }

    return {
        facts: selectedFacts,
        snippets,
        stats: {
            l1Count: selectedFacts.length,
            l2Count,
            l3Count,
            snippetCount: snippets.length
        }
    };
}

function getDbStats() {
    if (!db) return null;
    return {
        conversations: db.prepare('SELECT COUNT(*) AS c FROM conversations').get().c,
        messages: db.prepare('SELECT COUNT(*) AS c FROM messages').get().c,
        activeFacts: db.prepare(`SELECT COUNT(*) AS c FROM facts WHERE status = 'active'`).get().c,
        embeddings: db.prepare('SELECT COUNT(*) AS c FROM embeddings WHERE model_name = ?').get(embedder.getModelKey()).c,
        embedder: embedder.getEmbedderConfig()
    };
}

function upsertImageRecord({ id, width = null, height = null, bytes, caption = null, syncedMarker = null }) {
    if (!db || !id) return null;
    const now = Date.now();
    db.prepare(`
        INSERT INTO images(id, width, height, bytes, created_at, caption, synced_marker)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            width = COALESCE(excluded.width, images.width),
            height = COALESCE(excluded.height, images.height),
            bytes = excluded.bytes,
            caption = COALESCE(excluded.caption, images.caption),
            synced_marker = COALESCE(excluded.synced_marker, images.synced_marker)
    `).run(id, width, height, bytes, now, caption, syncedMarker);
    return getImageRecord(id);
}

function getImageRecord(id) {
    if (!db || !id) return null;
    return db.prepare('SELECT id, width, height, bytes, created_at, caption, synced_marker FROM images WHERE id = ?').get(id) || null;
}

function getAllImageRecords() {
    if (!db) return [];
    return db.prepare('SELECT id, width, height, bytes, created_at, caption, synced_marker FROM images ORDER BY created_at DESC').all();
}

function updateImageSyncedMarker(id, marker) {
    if (!db || !id) return;
    db.prepare('UPDATE images SET synced_marker = ? WHERE id = ?').run(marker, id);
}

function updateImageCaption(id, caption) {
    if (!db || !id) return;
    db.prepare('UPDATE images SET caption = ? WHERE id = ?').run(caption, id);
}

module.exports = {
    initMemoryDb,
    importFromJsonFiles,
    syncChatToDb,
    deleteChatFromDb,
    getActiveFacts,
    replaceFactsForPersona,
    applyExtractedFacts,
    retrieveMemoryContext,
    scheduleBackgroundEmbeddings,
    getDbStats,
    upsertImageRecord,
    getImageRecord,
    getAllImageRecords,
    updateImageSyncedMarker,
    updateImageCaption
};
