# Features & Usage

---

## 1. Characters & Personas (`{{user}}` Macro)

- **Characters:** Create, edit, and delete character profiles (name, avatar, system prompt, personality, opening greeting) stored in `data/characters/`.
- **Personas:** Create multiple user personas under `data/persona/` and switch active personas per character or group chat.
- **Automatic `{{user}}` Macro Replacement:** Any `{{user}}` placeholder (case-insensitive: `{{user}}`, `{{User}}`, `{{USER}}`) in system prompts, character definitions, opening greetings, and chat histories is dynamically replaced with the active persona's name right before sending requests to the LLM.

---

## 2. Private Chat

- **Per-Character Scoped Storage:** Sessions are saved under `data/chats/private/<characterId>/<chatId>.json`.
- **Regenerate & Alternates:** Regenerate any assistant reply and swipe between alternate responses (`PUT /api/chat/:chatId/alternate`).
- **In-Flight Message Editing & Deletion:** You can edit or delete earlier messages even while an LLM generation is in-flight; only new prompt submissions are locked until the active request finishes.

---

## 3. Multi-Character Group Chat

- **Group Rooms:** Combine multiple characters into a shared scenario room (`data/chats/groups/<groupId>/<chatId>.json`) with multi-session support and auto-titling from the first user message.
- **Perspective-Aware Roleplay:** Messages are formatted with `[SpeakerName]: Message` attribution so each character stays in first-person without speaking for others.
- **`@Mention` Routing & Manual Turns:** Mention `@CharacterName` in your prompt to address a specific character directly, or trigger any character's turn manually (`POST /api/group-chat/turn`) without sending a user message.

---

## 4. Dual-Tier Memory & AI Summarization

- **Private Memory (`data/memory/private/`):** Tracks extracted facts, events, conversation summaries, and the active `personaId` for each character.
- **Group Memory (`data/memory/groups/`):** Updates both shared group memory and individual character memories during group conversations, using speaker-aware transcript summarization.
- **Draft-Safe Persona Selection:** Changing the persona chip inside the Memory modal uses a draft state (`memoryModalDraftPersonaId`) and only applies when you click Save.

---

## 5. Editorial UI, Typography & Localization

- **Glare-Free Themes (`theme.js`):** Switch between Warm Paper Light Mode (`#F8F6F1` canvas) and Obsidian Dark Mode (`#0D0E12` canvas).
- **Dialogue vs. Action Hierarchy:** Spoken `"dialogue"` renders in crisp sans-serif, while `*action / narration*` renders in editorial italic serif (`<em class="action-text">`) with muted accent contrast. Code blocks (```` ``` ```` and `` ` ``) are protected prior to markdown formatting.
- **Browser Auto-Translate Protection:** Chat bubbles and character names use `translate="no"` / `.notranslate` to prevent browser translators from mangling roleplay text.
- **12 Built-in UI Languages (`public/Lang/`):** `AR`, `DE`, `EN`, `ES`, `FR`, `HI`, `ID`, `JP`, `KO`, `PT`, `RU`, `ZH`.
