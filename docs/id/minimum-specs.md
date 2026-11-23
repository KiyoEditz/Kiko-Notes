# Spesifikasi Minimum & Tier Perangkat

AIChat memisahkan **UI/penyimpanan lokal** dari **inferensi LLM remote**. Perangkat lokal Anda hanya menjalankan server Node.js + Express yang ringan, sementara proses inferensi model berjalan di GPU cloud.

---

## 1. Spesifikasi Host Klien Lokal

| Komponen | Kebutuhan Minimum | Catatan |
|---|---|---|
| **Runtime** | [Node.js](https://nodejs.org/) (disarankan versi LTS) | Menjalankan `server.js` dengan `dotenv`, `express`, dan `uuid` |
| **RAM / CPU** | Minimal (PC, laptop spek rendah, atau Termux di ponsel) | Tidak ada bobot model LLM yang dimuat ke RAM lokal |
| **Ruang Disk** | < 100 MB (ditambah file JSON karakter & riwayat chat) | Data disimpan di folder `data/` |
| **Browser** | Chromium, Firefox, atau Safari modern | Mendukung ES6+, variabel CSS, dan avatar WebP |
| **Jaringan** | Koneksi internet stabil | Diperlukan untuk mengakses endpoint tunnel `trycloudflare.com` |

---

## 2. Tier Runtime Cloud LLM

Pilih runtime cloud yang sesuai dengan ukuran model GGUF yang ingin dijalankan:

| Runner | Platform Cloud | Akselerator & Memori | Tier Model Default / Rekomendasi |
|---|---|---|---|
| [`Collab-Llama.py`](../../Collab-Llama.py) | Google Colab | **GPU T4** (16 GB VRAM) / L4 / A100 + **~12 GB RAM** | **Kelas 14B** `Q6_K` (~12.2 GB), mis. `EVA-Qwen2.5-14B-v0.2-i1-GGUF:Q6_K` |
| [`Kaggle-Llama.py`](../../Kaggle-Llama.py) | Kaggle Notebooks | **GPU T4 x2** (Dual T4, total 30+ GB VRAM) | **Kelas 31B–32B** `Q6_K` (~27 GB) atau `Q4_K_M` (~20 GB), mis. `Gemma-4-Dark-Gemistry-31B-i1-GGUF:Q6_K` |
| `npm run beta-kaggle` (`kaggle-kernel/`) | Kaggle Notebooks (Headless) | **GPU T4 x2** (`enable_gpu: true`, `enable_internet: true`) | Dikelola otomatis oleh `kaggle-kernel/kernel/main.py` |

> [!NOTE]
> `Collab-Llama.py` dan `Kaggle-Llama.py` mendeteksi arsitektur CUDA GPU secara otomatis saat runtime dan memprioritaskan unduhan binary CUDA prebuilt (`llama.cpp b12076`) sebelum melakukan kompilasi dari source jika diperlukan.

---

## 3. Persyaratan Akun & Kuota

- **Google Colab:** Tier gratis menyediakan ~12 GB System RAM dan GPU T4 (16 GB VRAM) sesuai batas penggunaan dinamis Google Colab.
- **Kaggle:**
  - **Verifikasi Nomor Telepon** wajib aktif di [kaggle.com/settings](https://www.kaggle.com/settings) agar opsi `GPU T4 x2` dan `Internet: On` dapat digunakan.
  - **Kuota GPU Mingguan:** Kaggle menyediakan sekitar 30 jam GPU gratis per minggu. Gunakan `npm run beta-kaggle` untuk menghemat kuota lewat shutdown instan (`Ctrl + C`) dan pengaman auto-idle 30 menit.
