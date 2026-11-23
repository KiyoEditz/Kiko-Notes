# Pemecahan Masalah & FAQ

---

## 1. Masalah Koneksi & Startup

### Muncul `503 Loading model` saat startup
- **Penyebab:** `llama-server` sudah membuka port HTTP, tetapi bobot model GGUF masih dalam proses dimuat ke VRAM GPU.
- **Solusi:** Tunggu hingga notebook mencetak `SERVER IS READY` (yang hanya muncul setelah `/health` mengembalikan `200 {"status":"ok"}` dan tes completion 1-token berhasil).

### `BASE_URL` tidak bisa dihubungi / Connection refused
- **Penyebab:** URL gratis Cloudflare Tunnel (`trycloudflare.com`) bersifat sementara dan selalu berubah setiap kali notebook Colab atau Kaggle di-restart.
- **Solusi:** Salin `BASE_URL` baru dari output notebook ke `.env` (atau Settings → Save), atau gunakan `npm run beta-kaggle` agar `BASE_URL` terisi otomatis setiap kali dijalankan.

---

## 2. Masalah Kaggle & Colab

### Kaggle menolak mengaktifkan `GPU T4 x2` atau `Internet`
- **Penyebab:** Akun Kaggle belum melewati **Verifikasi Nomor Telepon** atau kuota GPU mingguan (~30 jam/minggu) sudah habis.
- **Solusi:** Buka [kaggle.com/settings](https://www.kaggle.com/settings) untuk menyelesaikan verifikasi nomor HP atau memeriksa sisa kuota GPU mingguan Anda.

### Run pertama memakan waktu 5–10 menit (Colab) atau ~90 menit (Kaggle)
- **Penyebab:** Jika tidak ada tarball CUDA prebuilt (`GITHUB_RELEASE_URL`) yang cocok, runner akan mengompilasi `llama.cpp` dari source. Kompilasi multi-arch (`75;80;86;89;90`) pada CPU 4-core Kaggle memakan waktu ~90 menit.
- **Solusi:** Gunakan rilis prebuilt `llama-cuda-multiarch-b12076.tar.gz` yang dibuat dengan [`Build-Llama-CUDA-Release.py`](../../Build-Llama-CUDA-Release.py) agar sesi berikutnya cukup mengunduh dan memverifikasi dalam ~10 detik.

### `beta-kaggle` gagal menemukan kredensial
- **Penyebab:** File `kaggle-kernel/config/kaggle.json` (atau `~/.kaggle/kaggle.json`) belum tersedia.
- **Solusi:** Ikuti panduan di [`kaggle-kernel/config/README.md`](../../kaggle-kernel/config/README.md) untuk mengunduh `kaggle.json` dari Kaggle Settings → API → Create New Token.

---

## 3. Kualitas Output & Roleplay

### Model mengeluarkan blok `<think>...</think>`
- **Penyebab:** Model dengan kemampuan reasoning (mis. Qwen 2.5/3, DeepSeek-R1) menghasilkan token *chain-of-thought* jika `ENABLE_THINKING=true`.
- **Solusi:** Pastikan `ENABLE_THINKING=false` di `.env` atau Settings (nilai default sudah `false`).

### Balasan mulai terasa repetitif di chat panjang
- **Penyebab:** Nilai `PRESENCE_PENALTY` / `FREQUENCY_PENALTY` tinggi atau DRY sampling dimatikan.
- **Solusi:** Biarkan `PRESENCE_PENALTY=0.0` dan `FREQUENCY_PENALTY=0.0`, lalu gunakan **DRY sampling** (`DRY_MULTIPLIER=0.8`, `DRY_BASE=1.75`, `DRY_PENALTY_LAST_N=1024`) untuk menghukum pengulangan frasa tanpa menekan kata umum.
