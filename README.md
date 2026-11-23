# AICHAT DENGAN COLAB/KAGGLE - AICHAT WITH COLAB/KAGGLE

- Aplikasi obrolan roleplay *local-first* yang terhubung ke server LLM mandiri (**`llama.cpp` / `llama-server`**) yang Anda jalankan sendiri di Google Colab atau Kaggle melalui Cloudflare Tunnel.
--------
- A local-first roleplay chat application that connects to a self-hosted LLM server (**`llama.cpp` / `llama-server`**) you run yourself on Google Colab or Kaggle via Cloudflare Tunnel.

---

## 📚 DOKUMENTASI LENGKAP - FULL DOCUMENTATION (`docs/`)

Jelajahi dokumentasi lengkap proyek di folder [`docs/`](docs/README.md) (**[English](docs/en/getting-started.md)** | **[Bahasa Indonesia](docs/id/getting-started.md)**):

| Topik / Topic | Bahasa Indonesia | English |
|---|---|---|
| **Memulai / Getting Started** | [docs/id/getting-started.md](docs/id/getting-started.md) | [docs/en/getting-started.md](docs/en/getting-started.md) |
| **Spesifikasi Minimum / Minimum Specs** | [docs/id/minimum-specs.md](docs/id/minimum-specs.md) | [docs/en/minimum-specs.md](docs/en/minimum-specs.md) |
| **Arsitektur Sistem / Architecture** | [docs/id/architecture.md](docs/id/architecture.md) | [docs/en/architecture.md](docs/en/architecture.md) |
| **Konfigurasi & Sampler / Configuration** | [docs/id/configuration.md](docs/id/configuration.md) | [docs/en/configuration.md](docs/en/configuration.md) |
| **Runner Cloud & Build / Cloud Runners** | [docs/id/cloud-runners.md](docs/id/cloud-runners.md) | [docs/en/cloud-runners.md](docs/en/cloud-runners.md) |
| **Fitur & Penggunaan / Features & Usage** | [docs/id/features-and-usage.md](docs/id/features-and-usage.md) | [docs/en/features-and-usage.md](docs/en/features-and-usage.md) |
| **Referensi API / API Reference** | [docs/id/api-reference.md](docs/id/api-reference.md) | [docs/en/api-reference.md](docs/en/api-reference.md) |
| **Pemecahan Masalah / Troubleshooting** | [docs/id/troubleshooting.md](docs/id/troubleshooting.md) | [docs/en/troubleshooting.md](docs/en/troubleshooting.md) |

---

## DESKRIPSI SINGKAT - BRIEF DESCRIPTION

- Jalur aktif proyek ini menggunakan **AIChat → Cloudflare Tunnel → `llama-server` (`llama.cpp` `b12076`) → model GGUF** — langsung tanpa lapisan proxy tambahan, mendukung parameter sampling native 1:1 termasuk **DRY sampling** untuk kontrol repetisi di obrolan roleplay panjang. Anda dapat menjalankannya secara manual lewat [`Collab-Llama.py`](Collab-Llama.py) / [`Kaggle-Llama.py`](Kaggle-Llama.py), atau otomatis tanpa browser melalui `npm run beta-kaggle`.
--------
- This project's active path uses **AIChat → Cloudflare Tunnel → `llama-server` (`llama.cpp` `b12076`) → GGUF model** — directly with no extra proxy layers, supporting 1:1 native sampling parameters including **DRY sampling** for repetition control in long roleplay chats. You can run it manually via [`Collab-Llama.py`](Collab-Llama.py) / [`Kaggle-Llama.py`](Kaggle-Llama.py), or headlessly without a browser via `npm run beta-kaggle`.

---

## SPESIFIKASI MINIMUM - MINIMUM SPECIFICATIONS

- **Perangkat Lokal:** [Node.js](https://nodejs.org/), browser modern, dan koneksi internet stabil (penyimpanan karakter/chat/memori ringan di folder `data/`).
- **Cloud Runtime (Google Colab):** ~12 GB RAM + GPU T4 (16 GB VRAM) — default model 14B (`Q6_K`).
- **Cloud Runtime (Kaggle Dual T4):** `GPU T4 x2` (30+ GB VRAM gabungan) — default model 31B–32B (`Q6_K` / `Q4_K_M`), memerlukan akun Kaggle terverifikasi nomor HP.
--------
- **Local Host:** [Node.js](https://nodejs.org/), a modern browser, and a stable internet connection (lightweight JSON storage under `data/`).
- **Cloud Runtime (Google Colab):** ~12 GB RAM + T4 GPU (16 GB VRAM) — default 14B (`Q6_K`) model.
- **Cloud Runtime (Kaggle Dual T4):** `GPU T4 x2` (30+ GB combined VRAM) — default 31B–32B (`Q6_K` / `Q4_K_M`) model, requires a phone-verified Kaggle account.

---

## PANDUAN CEPAT - QUICK START

### 1. Instalasi Klien Lokal - Local Client Setup

```bash
npm install
cp .env.example .env
```

### 2. Jalankan Server LLM Cloud - Start Cloud LLM Server

Pilih salah satu opsi berikut / *Choose one of the following options*:

- **Opsi A — Otomatis Headless Kaggle (`npm run beta-kaggle`):**
  Letakkan `kaggle.json` di `kaggle-kernel/config/kaggle.json` (lihat [panduan kredensial](kaggle-kernel/config/README.md)), lalu jalankan:
  ```bash
  npm run beta-kaggle
  ```
  *(Otomatis menyalakan `GPU T4 x2`, mengambil URL Cloudflare Tunnel, dan mematikan kernel saat Anda menekan `Ctrl + C`.)*
- **Opsi B — Google Colab (`Collab-Llama.py`):**
  Salin isi [`Collab-Llama.py`](Collab-Llama.py) ke sel Colab (Runtime **GPU T4**), jalankan, lalu salin `BASE_URL` dan `API_KEY` ke `.env`.
- **Opsi C — Kaggle Dual T4 (`Kaggle-Llama.py`):**
  Salin isi [`Kaggle-Llama.py`](Kaggle-Llama.py) ke notebook Kaggle (**Accelerator: GPU T4 x2**, **Internet: On**), jalankan, lalu salin `BASE_URL` dan `API_KEY` ke `.env`.

### 3. Jalankan Server Web Lokal - Start Local Web Server

*(Lewati langkah ini jika Anda menjalankan `npm run beta-kaggle` / Skip if using `npm run beta-kaggle`)*

```bash
npm start
```

Buka **`http://localhost:3000`** di browser Anda (atau **`http://<IP_LOKAL_HOST>:3000`** dari HP/tablet di jaringan Wi-Fi yang sama).

> **Stack Lama (Legacy Stack):** Skrip lama berbasis Ollama + LiteLLM (`colab_llm_server.py`, `colab_llm_server.ipynb`, `kaggle_llm_server.py`) tetap tersedia di folder [`Legacy Script/`](Legacy%20Script) sebagai referensi opsional. Lihat [docs/id/cloud-runners.md](docs/id/cloud-runners.md) / [docs/en/cloud-runners.md](docs/en/cloud-runners.md) untuk perbandingan lengkapnya.

---

## DUKUNGAN & DONASI - SUPPORT & DONATION

Jika Anda menyukai proyek ini dan ingin mendukung pengembangannya, Anda dapat memberikan apresiasi melalui platform donasi berikut:

- ☕ **Ko-fi:** [ko-fi.com/kiyoeditz](https://ko-fi.com/kiyoeditz)
- 💛 **Saweria:** [saweria.co/KiyoEditz](https://saweria.co/KiyoEditz)
- 💖 **GitHub Sponsors:** *(Masih dalam peninjauan / Under review)*

Dukungan Anda sangat berarti untuk membantu pemeliharaan dan penambahan fitur-fitur baru ke depannya! Terima kasih banyak!
--------
If you enjoy this project and want to support its ongoing development, feel free to show some love through the following donation channels:

- ☕ **Ko-fi:** [ko-fi.com/kiyoeditz](https://ko-fi.com/kiyoeditz)
- 💛 **Saweria:** [saweria.co/KiyoEditz](https://saweria.co/KiyoEditz)
- 💖 **GitHub Sponsors:** *(Currently under review)*

Your support means a lot and helps sustain maintenance and future feature improvements! Thank you so much!

---

## CHANGELOG

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## LISENSI - LICENSE

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license.
This means you are free to use it for individual or non-commercial purposes, but commercial/corporate use requires a separate arrangement.

See the [LICENSE](LICENSE) file for the full text.
