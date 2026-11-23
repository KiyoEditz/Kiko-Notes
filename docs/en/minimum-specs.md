# Minimum Specifications & Hardware Tiers

AIChat separates **local UI/storage** from **remote LLM inference**. Your local device only runs a lightweight Node.js + Express server and serves static HTML/CSS/JS, while heavy model inference runs on cloud GPUs.

---

## 1. Local Client Host Requirements

| Component | Minimum Requirement | Notes |
|---|---|---|
| **Runtime** | [Node.js](https://nodejs.org/) (LTS recommended) | Runs `server.js` with `dotenv`, `express`, and `uuid` |
| **RAM / CPU** | Minimal (any modern PC, laptop, or Termux mobile) | No local LLM weights are loaded into memory |
| **Disk Space** | < 100 MB (plus chat/character JSON growth) | Stores characters, chats, personas, and memory under `data/` |
| **Browser** | Modern Chromium, Firefox, or Safari | Supports standard ES6+, CSS variables, and WebP avatars |
| **Network** | Stable internet connection | Required to reach `trycloudflare.com` tunnel endpoints |

---

## 2. Remote Cloud LLM Server Tiers

Choose the cloud runtime that matches the GGUF model size you want to run:

| Runner | Cloud Platform | Accelerator & Memory | Default / Recommended Model Tier |
|---|---|---|---|
| [`Collab-Llama.py`](../../Collab-Llama.py) | Google Colab | **GPU T4** (16 GB VRAM) / L4 / A100 + **~12 GB RAM** | **14B class** at `Q6_K` (~12.2 GB), e.g. `EVA-Qwen2.5-14B-v0.2-i1-GGUF:Q6_K` |
| [`Kaggle-Llama.py`](../../Kaggle-Llama.py) | Kaggle Notebooks | **GPU T4 x2** (Dual T4, 30+ GB VRAM combined) | **31B–32B class** at `Q6_K` (~27 GB) or `Q4_K_M` (~20 GB), e.g. `Gemma-4-Dark-Gemistry-31B-i1-GGUF:Q6_K` |
| `npm run beta-kaggle` (`kaggle-kernel/`) | Kaggle Notebooks (Headless) | **GPU T4 x2** (`enable_gpu: true`, `enable_internet: true`) | Managed automatically by `kaggle-kernel/kernel/main.py` |

> [!NOTE]
> `Collab-Llama.py` and `Kaggle-Llama.py` auto-detect the attached GPU's CUDA compute capability at runtime and prefer downloading a prebuilt multi-arch CUDA tarball (`llama-cpp b12076`) before falling back to source compilation.

---

## 3. Account & Quota Requirements

- **Google Colab:** Free tier provides ~12 GB System RAM and T4 GPU (16 GB VRAM) subject to Google Colab's dynamic usage limits.
- **Kaggle:**
  - **Phone Verification** is mandatory at [kaggle.com/settings](https://www.kaggle.com/settings) to enable `GPU T4 x2` and `Internet: On`.
  - **Weekly GPU Quota:** Kaggle provides ~30 hours/week of free GPU compute. Using `npm run beta-kaggle` helps preserve quota via instant `Ctrl + C` remote shutdown and a 30-minute auto-idle watchdog.
