# AIChat Documentation (`ai-chat-local` v1.7.1)

Welcome to the official documentation for **AIChat** — a local-first AI roleplay chat application that connects to a self-hosted `llama.cpp` (`llama-server`) backend running on Google Colab or Kaggle via Cloudflare Tunnel.

Selamat datang di dokumentasi resmi **AIChat** — aplikasi obrolan roleplay *local-first* yang terhubung ke server `llama.cpp` (`llama-server`) mandiri di Google Colab atau Kaggle melalui Cloudflare Tunnel.

---

## 🌐 Select Language / Pilih Bahasa

- **[English Documentation (`docs/en/`)](en/getting-started.md)**
- **[Dokumentasi Bahasa Indonesia (`docs/id/`)](id/getting-started.md)**

---

## 📚 Documentation Index / Daftar Dokumentasi

| Topic | English | Bahasa Indonesia |
|---|---|---|
| **Getting Started** | [Getting Started](en/getting-started.md) | [Memulai (Getting Started)](id/getting-started.md) |
| **Minimum Specifications** | [Minimum Specifications](en/minimum-specs.md) | [Spesifikasi Minimum](id/minimum-specs.md) |
| **System Architecture** | [System Architecture](en/architecture.md) | [Arsitektur Sistem](id/architecture.md) |
| **Configuration & Samplers** | [Configuration & Samplers](en/configuration.md) | [Konfigurasi & Sampler](id/configuration.md) |
| **Cloud Runners & Builds** | [Cloud Runners & Builds](en/cloud-runners.md) | [Runner Cloud & Build](id/cloud-runners.md) |
| **Features & Usage** | [Features & Usage](en/features-and-usage.md) | [Fitur & Penggunaan](id/features-and-usage.md) |
| **REST API Reference** | [API Reference](en/api-reference.md) | [Referensi API](id/api-reference.md) |
| **Troubleshooting & FAQ** | [Troubleshooting & FAQ](en/troubleshooting.md) | [Pemecahan Masalah & FAQ](id/troubleshooting.md) |

---

## ⚡ Active Stack Overview

```text
Web UI (public/) ──▶ Local Express Server (server.js) ──▶ Cloudflare Tunnel ──▶ llama-server (llama.cpp b12076) ──▶ GGUF Model
```

- **License:** Creative Commons Attribution-NonCommercial 4.0 International ([CC BY-NC 4.0](../LICENSE))
- **Changelog:** See [CHANGELOG.md](../CHANGELOG.md)
