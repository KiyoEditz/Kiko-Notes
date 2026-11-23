# Referensi REST API

Server Express lokal ([`server.js`](../../server.js)) menyediakan endpoint REST berikut di `http://localhost:3000` (atau sesuai `PORT` yang dikonfigurasi).

---

## 1. Konfigurasi & Kesehatan Server

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/config` | Mengambil konfigurasi runtime & parameter sampling aktif. |
| `POST` | `/api/config` | Memperbarui konfigurasi runtime dan menyimpannya ke `.env`. |
| `GET` | `/api/test-connection` | Menguji konektivitas dan kesiapan `/health` / model pada `BASE_URL`. |

---

## 2. Karakter

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/characters` | Menampilkan semua karakter tersimpan. |
| `GET` | `/api/characters/:id` | Mengambil detail satu karakter berdasarkan ID. |
| `POST` | `/api/characters` | Membuat karakter baru. |
| `PUT` | `/api/characters/:id` | Memperbarui data karakter. |
| `DELETE` | `/api/characters/:id` | Menghapus karakter beserta folder chat privatnya. |

---

## 3. Private Chat

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/chats/:characterId` | Menampilkan daftar sesi di `data/chats/private/:characterId/`. |
| `POST` | `/api/chats` | Membuat sesi private chat baru. |
| `GET` | `/api/chat/:chatId` | Mengambil isi sesi private chat tertentu. |
| `PUT` | `/api/chat/:chatId` | Memperbarui metadata/judul private chat. |
| `DELETE` | `/api/chat/:chatId` | Menghapus sesi private chat. |
| `POST` | `/api/chat/send` | Mengirim pesan pengguna dan menghasilkan balasan karakter. |
| `POST` | `/api/chat/regenerate` | Membuat ulang pesan asisten (berdasarkan ID pesan). |
| `PUT` | `/api/chat/:chatId/alternate` | Mengganti indeks variasi (*alternate*) aktif pada pesan. |
| `PUT` | `/api/chat/:chatId/message` | Mengedit isi pesan di dalam sesi. |
| `DELETE` | `/api/chat/:chatId/message/:index` | Menghapus pesan dari private chat. |

---

## 4. Group Chat

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/groups` | Menampilkan semua ruang grup beserta jumlah pesan per sesi. |
| `GET` | `/api/groups/:id` | Mengambil metadata ruang grup. |
| `POST` | `/api/groups` | Membuat ruang grup baru. |
| `PUT` | `/api/groups/:id` | Memperbarui metadata grup (nama, skenario, anggota, avatar). |
| `DELETE` | `/api/groups/:id` | Menghapus ruang grup beserta seluruh sesinya. |
| `GET` | `/api/groups/:groupId/chats` | Menampilkan daftar sesi di `data/chats/groups/:groupId/`. |
| `POST` | `/api/groups/:groupId/chats` | Membuat sesi group chat baru. |
| `GET` | `/api/groups/:groupId/chat/:chatId` | Mengambil isi sesi group chat tertentu. |
| `PUT` | `/api/groups/:groupId/chat/:chatId` | Memperbarui sesi group chat. |
| `DELETE` | `/api/groups/:groupId/chat/:chatId` | Menghapus sesi group chat. |
| `POST` | `/api/group-chat/send` | Mengirim pesan pengguna ke grup (mendukung `@mention`). |
| `POST` | `/api/group-chat/turn` | Memicu giliran karakter tertentu tanpa pesan pengguna baru. |
| `POST` | `/api/group-chat/regenerate` | Membuat ulang pesan karakter di group chat. |
| `PUT` | `/api/groups/:groupId/alternate` | Mengganti variasi jawaban aktif di group chat. |
| `PUT` | `/api/groups/:groupId/chat/:chatId/message` | Mengedit pesan pada sesi grup tertentu. |
| `DELETE` | `/api/groups/:groupId/chat/:chatId/message/:index` | Menghapus pesan pada sesi grup tertentu. |

---

## 5. Persona & Memori

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/personas` | Menampilkan semua persona pengguna. |
| `GET` | `/api/personas/:id` | Mengambil detail persona berdasarkan ID. |
| `POST` | `/api/personas` | Membuat persona baru. |
| `PUT` | `/api/personas/:id` | Memperbarui persona. |
| `DELETE` | `/api/personas/:id` | Menghapus persona. |
| `GET` | `/api/memory/:characterId` | Mengambil memori privat karakter. |
| `PUT` | `/api/memory/:characterId` | Memperbarui memori privat dan `personaId` aktif. |
| `POST` | `/api/memory/:characterId/summarize` | Membuat ringkasan percakapan berbasis AI ke memori. |
| `GET` | `/api/groups/:groupId/memory` | Mengambil memori bersama grup. |
| `PUT` | `/api/groups/:groupId/memory` | Memperbarui memori bersama grup. |

---

## 6. Utilitas & Orchestrator Kaggle

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/pinterest/search` | Mencari gambar Pinterest untuk avatar karakter/grup. |
| `GET` | `/api/pinterest/image` | Proxy unduhan gambar Pinterest untuk disimpan lokal. |
| `GET` | `/api/kaggle/status` | Mengambil status orchestrator `beta-kaggle` saat ini. |
| `POST` | `/api/kaggle/shutdown` | Memicu shutdown jarak jauh pada kernel Kaggle yang aktif. |
