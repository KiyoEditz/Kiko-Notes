# Memulai (Getting Started)

Panduan ini menjelaskan langkah-langkah menjalankan **AIChat** secara lokal dan menghubungkannya ke server `llama-server` (`llama.cpp`) yang berjalan di Google Colab atau Kaggle.

---

## 1. Prasyarat

Pastikan Anda sudah menyiapkan:

- **[Node.js](https://nodejs.org/)** terinstal di perangkat lokal Anda (laptop, PC, atau Termux/ponsel).
- **Akun Google** (untuk Google Colab) atau **akun Kaggle** (untuk Kaggle Notebooks / `beta-kaggle`).
- **Koneksi internet yang stabil** untuk komunikasi klien lokal dan Cloudflare Tunnel.

---

## 2. Instalasi Klien Web Lokal

1. Buka terminal di direktori root proyek (`AI Chat/`).
2. Pasang dependensi Node.js (`dotenv`, `express`, `uuid`):
   ```bash
   npm install
   ```
3. Buat file konfigurasi lokal dengan menyalin `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   *(Di Windows PowerShell: `Copy-Item .env.example .env`)*

---

## 3. Menjalankan Server LLM Remote

Pilih **salah satu** jalur berikut untuk menyalakan `llama-server` di GPU cloud gratis:

### Opsi A: Otomatis Headless Kaggle (`npm run beta-kaggle`)

Cocok untuk penggunaan satu perangkat atau ponsel—tidak perlu membuka browser Kaggle atau menyalin URL secara manual.

1. Pastikan akun Kaggle Anda sudah **terverifikasi nomor telepon (Phone Verified)** di [kaggle.com/settings](https://www.kaggle.com/settings) dan masih memiliki kuota GPU mingguan.
2. Buat token API Kaggle (`kaggle.json`) dari pengaturan akun Kaggle, lalu simpan ke:
   ```text
   kaggle-kernel/config/kaggle.json
   ```
   *(Lihat [kaggle-kernel/config/README.md](../../kaggle-kernel/config/README.md) untuk contoh `kaggle.json.example` dan dukungan token `KGAT_...`.)*
3. Jalankan perintah berikut dari root proyek:
   ```bash
   npm run beta-kaggle
   ```
   AIChat akan otomatis mengirim kernel (`aichat-kaggle-server`), menunggu `llama-server` + `cloudflared` lolos tes 1-token, mengisi `BASE_URL` & `API_KEY` secara otomatis, lalu menyalakan server web lokal. Tekan `Ctrl + C` saat selesai untuk mematikan kernel Kaggle secara langsung.

### Opsi B: Notebook Manual (Google Colab)

1. Buka [Google Colab](https://colab.research.google.com/) dan buat notebook baru.
2. Buka **Runtime** → **Change runtime type** (Ubah jenis runtime) lalu pilih **GPU (T4)**.
3. Salin seluruh isi [`Collab-Llama.py`](../../Collab-Llama.py) ke dalam sel notebook dan jalankan.
4. Tunggu proses instalasi, pengunduhan model, dan pemeriksaan 1-token selesai.
5. Salin `BASE_URL` (contoh: `https://xxxx.trycloudflare.com`) dan `API_KEY` (`sk-colab-local`) yang tercetak ke file `.env` lokal Anda.

### Opsi C: Notebook Manual (Kaggle Dual T4)

1. Buat notebook baru di [kaggle.com/code](https://www.kaggle.com/code).
2. Pada panel **Notebook options** (kanan):
   - Atur **Accelerator** → **GPU T4 x2**
   - Atur **Internet** → **On**
3. Salin seluruh isi [`Kaggle-Llama.py`](../../Kaggle-Llama.py) ke dalam sel dan jalankan.
4. Salin `BASE_URL` dan `API_KEY` (`sk-kaggle-local`) yang tercetak ke file `.env` lokal Anda.

---

## 4. Menjalankan & Mengakses AIChat

Jika Anda menggunakan **Opsi B** atau **Opsi C**, jalankan server web lokal:

```bash
npm start
```

- **Akses Lokal:** Buka `http://localhost:3000` di browser Anda.
- **Akses Jaringan Wi-Fi Sama (HP/Tablet):** Buka `http://<IP_LOKAL_HOST>:3000` (contoh: `http://192.168.1.15:3000`) dari perangkat lain di Wi-Fi yang sama.

Anda juga dapat menguji koneksi dan mengubah `BASE_URL`, `API_KEY`, atau parameter sampling kapan saja melalui halaman **Settings** (`http://localhost:3000/settings.html`).

---

## Langkah Selanjutnya

- Baca [Spesifikasi Minimum](minimum-specs.md) untuk menyesuaikan ukuran model dengan runtime GPU pilihan Anda.
- Pelajari [Konfigurasi & Sampler](configuration.md) untuk menyetel DRY sampling, temperatur, dan mode thinking.
- Lihat [Fitur & Penggunaan](features-and-usage.md) untuk panduan Persona, makro `{{user}}`, Group Chat, dan Memory.
