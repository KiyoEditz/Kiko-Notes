# REST API Reference

The local Express server ([`server.js`](../../server.js)) exposes the following REST endpoints on `http://localhost:3000` (or your configured `PORT`).

---

## 1. Configuration & Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns current runtime configuration & sampling parameters. |
| `POST` | `/api/config` | Updates runtime configuration and persists changes to `.env`. |
| `GET` | `/api/test-connection` | Tests connectivity and `/health` / model readiness against `BASE_URL`. |

---

## 2. Characters

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/characters` | Lists all saved characters. |
| `GET` | `/api/characters/:id` | Retrieves a single character by ID. |
| `POST` | `/api/characters` | Creates a new character. |
| `PUT` | `/api/characters/:id` | Updates an existing character. |
| `DELETE` | `/api/characters/:id` | Deletes a character and its scoped private chat folder. |

---

## 3. Private Chats

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/chats/:characterId` | Lists chat sessions inside `data/chats/private/:characterId/`. |
| `POST` | `/api/chats` | Creates a new private chat session. |
| `GET` | `/api/chat/:chatId` | Retrieves a specific private chat session. |
| `PUT` | `/api/chat/:chatId` | Updates private chat metadata/title. |
| `DELETE` | `/api/chat/:chatId` | Deletes a private chat session. |
| `POST` | `/api/chat/send` | Sends a user message and generates the character's reply. |
| `POST` | `/api/chat/regenerate` | Regenerates an assistant message (targeted by message ID). |
| `PUT` | `/api/chat/:chatId/alternate` | Switches the active alternate swipe index on a message. |
| `PUT` | `/api/chat/:chatId/message` | Edits a message in-place. |
| `DELETE` | `/api/chat/:chatId/message/:index` | Deletes a message from the private chat. |

---

## 4. Group Chats

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/groups` | Lists all group rooms with session-aware message counts. |
| `GET` | `/api/groups/:id` | Retrieves a group room's metadata. |
| `POST` | `/api/groups` | Creates a new group room. |
| `PUT` | `/api/groups/:id` | Updates group metadata (name, scenario, members, avatar). |
| `DELETE` | `/api/groups/:id` | Deletes a group room and its sessions. |
| `GET` | `/api/groups/:groupId/chats` | Lists sessions inside `data/chats/groups/:groupId/`. |
| `POST` | `/api/groups/:groupId/chats` | Creates a new group chat session. |
| `GET` | `/api/groups/:groupId/chat/:chatId` | Retrieves a specific group chat session. |
| `PUT` | `/api/groups/:groupId/chat/:chatId` | Updates a group chat session. |
| `DELETE` | `/api/groups/:groupId/chat/:chatId` | Deletes a group chat session. |
| `POST` | `/api/group-chat/send` | Sends a user message to a group session (supports `@mention` routing). |
| `POST` | `/api/group-chat/turn` | Triggers a specific character to take a turn without a user prompt. |
| `POST` | `/api/group-chat/regenerate` | Regenerates a character's message in group chat. |
| `PUT` | `/api/groups/:groupId/alternate` | Switches the active alternate response in a group chat. |
| `PUT` | `/api/groups/:groupId/chat/:chatId/message` | Edits a message in a specific group session. |
| `DELETE` | `/api/groups/:groupId/chat/:chatId/message/:index` | Deletes a message in a specific group session. |

---

## 5. Personas & Memory

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/personas` | Lists all user personas. |
| `GET` | `/api/personas/:id` | Retrieves a persona by ID. |
| `POST` | `/api/personas` | Creates a new persona. |
| `PUT` | `/api/personas/:id` | Updates a persona. |
| `DELETE` | `/api/personas/:id` | Deletes a persona. |
| `GET` | `/api/memory/:characterId` | Retrieves private memory for a character. |
| `PUT` | `/api/memory/:characterId` | Updates private memory and active `personaId`. |
| `POST` | `/api/memory/:characterId/summarize` | Generates an AI summary of the conversation into memory. |
| `GET` | `/api/groups/:groupId/memory` | Retrieves shared group memory. |
| `PUT` | `/api/groups/:groupId/memory` | Updates shared group memory. |

---

## 6. Utilities & Kaggle Orchestrator

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pinterest/search` | Searches Pinterest images for character/group avatar picking. |
| `GET` | `/api/pinterest/image` | Proxies selected Pinterest image for local avatar saving. |
| `GET` | `/api/kaggle/status` | Returns current `beta-kaggle` orchestrator status. |
| `POST` | `/api/kaggle/shutdown` | Triggers remote shutdown of the active Kaggle kernel. |
