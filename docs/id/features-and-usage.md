# Fitur & Penggunaan

---

## 1. Karakter & Persona (Makro `{{user}}`)

- **Karakter:** Buat, ubah, dan hapus profil karakter (nama, avatar, system prompt, kepribadian, pesan pembuka) yang tersimpan di `data/characters/`.
- **Persona:** Buat berbagai persona pengguna di `data/persona/` dan pilih persona aktif untuk tiap karakter atau ruang grup.
- **Penggantian Makro `{{user}}` Otomatis:** Seluruh placeholder `{{user}}` (*case-insensitive*: `{{user}}`, `{{User}}`, `{{USER}}`) di system prompt, definisi karakter, salam pembuka, maupun riwayat chat otomatis diganti dengan nama persona aktif sebelum dikirim ke LLM.

---

## 2. Obrolan Privat (Private Chat)

- **Penyimpanan Terkelompok per Karakter:** Sesi disimpan di `data/chats/private/<characterId>/<chatId>.json`.
- **Regenerate & Alternate:** Buat ulang balasan asisten dan geser antar variasi jawaban (`PUT /api/chat/:chatId/alternate`).
- **Edit & Hapus Pesan Saat Generasi Berjalan:** Anda tetap dapat mengedit atau menghapus pesan lama meskipun respons LLM sedang diproses (*in-flight*); hanya pengiriman prompt baru yang dikunci sementara.

---

## 3. Obrolan Grup Multi-Karakter (Group Chat)

- **Ruang Grup:** Gabungkan beberapa karakter dalam satu skenario bersama (`data/chats/groups/<groupId>/<chatId>.json`) dengan dukungan multi-sesi dan penamaan judul otomatis dari pesan pertama pengguna.
- **Roleplay Berbasis Perspektif:** Pesan diformat dengan label `[NamaPembicara]: Pesan` agar setiap karakter merespons sebagai dirinya sendiri tanpa mengambil alih giliran karakter lain.
- **Routing `@Mention` & Giliran Manual:** Sebut `@NamaKarakter` di pesan Anda untuk memanggil karakter tertentu secara langsung, atau picu giliran karakter mana pun secara manual (`POST /api/group-chat/turn`) tanpa mengirim prompt baru.

---

## 4. Memori Dua Tingkat & Ringkasan AI

- **Memori Privat (`data/memory/private/`):** Menyimpan fakta penting, peristiwa, ringkasan percakapan, dan `personaId` aktif untuk masing-masing karakter.
- **Memori Grup (`data/memory/groups/`):** Memperbarui memori grup bersama sekaligus memori privat tiap karakter secara bersamaan dengan ringkasan transkrip berbasis pembicara.
- **Pemilihan Persona Aman (*Draft-Safe*):** Mengubah pilihan persona di modal Memory menggunakan state sementara (`memoryModalDraftPersonaId`) dan baru diterapkan setelah tombol Simpan diklik.

---

## 5. Antarmuka Editorial, Tipografi & Bahasa

- **Tema Nyaman di Mata (`theme.js`):** Tersedia Light Mode kertas hangat (`#F8F6F1`) dan Dark Mode obsidian (`#0D0E12`).
- **Hierarki Dialog vs. Aksi:** `"Dialog"` tampil dengan font sans-serif yang tegas, sedangkan `*aksi / narasi*` tampil dengan serif miring editorial (`<em class="action-text">`) berwarna lembut. Blok kode (```` ``` ```` dan `` ` ``) diproteksi sebelum pemformatan markdown.
- **Proteksi Terjemahan Otomatis Browser:** Gelembung chat dan nama karakter diberi atribut `translate="no"` / `.notranslate` agar ekstensi penerjemah browser tidak merusak teks roleplay.
- **12 Bahasa UI (`public/Lang/`):** `AR`, `DE`, `EN`, `ES`, `FR`, `HI`, `ID`, `JP`, `KO`, `PT`, `RU`, `ZH`.
