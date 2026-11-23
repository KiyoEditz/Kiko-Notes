# Runner Cloud & Build CUDA Prebuilt

AIChat menyediakan beberapa skrip runner untuk menjalankan server LLM remote, dengan **`llama.cpp` (`llama-server` `b12076`)** sebagai stack aktif utama.

---

## 1. Google Colab (`Collab-Llama.py`)

[`Collab-Llama.py`](../../Collab-Llama.py) adalah skrip satu-klik untuk runtime GPU tunggal Colab (T4, L4, A100, dll.):

- **Deteksi Arsitektur CUDA Otomatis:** Mendeteksi *compute capability* GPU yang terpasang saat runtime.
- **Prioritas Binary Prebuilt:** Mengunduh tarball CUDA prebuilt (`GITHUB_RELEASE_URL`) jika tersedia, dan hanya melakukan kompilasi dari source (~5–10 menit di run pertama) jika fallback diperlukan.
- **Penyimpanan Model Efisien:** Menggunakan `snapshot_download(local_dir=...)` dari `huggingface_hub` dengan cache Xet dimatikan (`HF_XET_CHUNK_CACHE_SIZE_BYTES=0`) agar bobot model tidak terduplikasi di disk.
- **Verifikasi Kesiapan Nyata:** Mengecek `/health` (`200 {"status":"ok"}`) dan menjalankan tes completion 1-token sebelum mencetak `BASE_URL` dan `API_KEY` (`sk-colab-local`).

---

## 2. Kaggle Dual T4 (`Kaggle-Llama.py`)

[`Kaggle-Llama.py`](../../Kaggle-Llama.py) dirancang khusus untuk lingkungan **GPU T4 x2** di Kaggle:

- **Verifikasi Dual-GPU:** Menggunakan `CUDA_VISIBLE_DEVICES="0,1"` dan menjalankan `check_dual_gpu_usage()` setelah model dimuat untuk memastikan kedua T4 aktif dipakai (ideal untuk model 31B–32B `Q6_K` atau `Q4_K_M`).
- **Manajemen Disk Scratch:** Menyimpan model di `/kaggle/tmp/models` agar tidak menghabiskan kuota `/kaggle/working` (19.5 GB).
- **Pembersihan Otomatis:** Membersihkan RAM/VRAM saat sel dihentikan, saat `SIGTERM` (kernel dimatikan dari UI Kaggle), maupun saat terjadi error startup.
- **API Key Default:** `sk-kaggle-local`.

---

## 3. Otomatisasi Headless Kaggle (`npm run beta-kaggle`)

Jalankan `npm run beta-kaggle` (`node server.js --beta-kaggle`) untuk menyalakan Kaggle Dual T4 **tanpa membuka browser**:

1. **Kredensial:** Simpan token API Kaggle di `kaggle-kernel/config/kaggle.json` (lihat [`kaggle-kernel/config/README.md`](../../kaggle-kernel/config/README.md) untuk `kaggle.json.example` dan dukungan token `KGAT_...`).
2. **Staging & Push:** `kaggle-kernel/orchestrator.js` mengirim `kaggle-kernel/kernel/main.py` sebagai kernel `aichat-kaggle-server` dengan `enable_gpu: true` dan `enable_internet: true`.
3. **Handshake Dua Jalur:** Kernel melakukan commit `tunnel.json` (berisi `runId` unik) ke dataset privat `<username>/aichat-kaggle-tunnel` sekaligus mencetak `===AICHAT_TUNNEL_START===...===AICHAT_TUNNEL_END===` di log sebagai cadangan.
4. **Auto-Bind & Siklus Hidup:** AIChat lokal otomatis mengisi `BASE_URL` & `API_KEY`, mengirim heartbeat (`GET /__aichat_ping`) setiap 60 detik, memicu `POST /__aichat_shutdown` saat `Ctrl + C`, dan memiliki watchdog auto-idle 30 menit jika koneksi terputus mendadak.

---

## 4. Builder Binary CUDA Multi-Arch (`Build-Llama-CUDA-Release.py`)

[`Build-Llama-CUDA-Release.py`](../../Build-Llama-CUDA-Release.py) mengompilasi fat binary portabel (`llama-cuda-multiarch-b12076.tar.gz` + `.sha256`) yang mencakup 5 arsitektur SASS (`75-real;80-real;86-real;89-real;90-real`) serta PTX (`90-virtual`):

- **Durasi Build:** Sekitar 1 jam 30 menit di CPU 4-core Kaggle (dikompilasi di `/kaggle/tmp`).
- **Kegunaan:** Unggah tarball dan `.sha256` ke GitHub Releases agar sesi Colab/Kaggle berikutnya cukup mengunduh dan memverifikasi binary dalam ~10 detik tanpa kompilasi ulang.

---

## 5. Stack Lama: Ollama + LiteLLM (`Legacy Script/`)

Skrip lama berbasis Ollama + LiteLLM tetap disimpan di [`Legacy Script/`](../../Legacy%20Script):
- `colab_llm_server.py` / `colab_llm_server.ipynb`
- `kaggle_llm_server.py`

| Aspek | Legacy (Ollama + LiteLLM) | Aktif (`llama.cpp` Langsung) |
|---|---|---|
| **Setup awal** | Lebih cepat (binary Ollama siap pakai) | Tarball prebuilt (~10 detik) atau compile source |
| **Kontrol sampling** | Melewati 2 lapis translasi (LiteLLM → Ollama) | Native 1:1 ke `llama-server` |
| **Repetisi chat panjang** | Penalti kumulatif OpenAI | `REPEAT_LAST_N` berjendela + **DRY sampling** |
| **Jumlah proses** | 2 (`ollama` + `litellm`) | 1 (`llama-server`) |
