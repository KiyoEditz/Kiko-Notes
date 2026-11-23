# Cloud Runners & Prebuilt CUDA Releases

AIChat supports multiple ways to run your remote LLM server, with **`llama.cpp` (`llama-server` `b12076`)** as the active default stack.

---

## 1. Google Colab (`Collab-Llama.py`)

[`Collab-Llama.py`](../../Collab-Llama.py) is a one-click Colab script for single-GPU runtimes (T4, L4, A100, etc.):

- **Auto-Detected CUDA Arch:** Detects the attached GPU's compute capability at runtime.
- **Prebuilt Binary First:** Prefers downloading a prebuilt CUDA tarball (`GITHUB_RELEASE_URL`) and falls back to compiling `llama.cpp` from source (~5–10 minutes on first run) if needed.
- **Clean Model Storage:** Uses `huggingface_hub`'s `snapshot_download(local_dir=...)` with Xet chunk caching disabled (`HF_XET_CHUNK_CACHE_SIZE_BYTES=0`) so model weights are never duplicated in disk cache.
- **Readiness State Machine:** Verifies `llama-server` `/health` (`200 {"status":"ok"}`) and completes a real 1-token completion test before printing `BASE_URL` and `API_KEY` (`sk-colab-local`).

---

## 2. Kaggle Dual T4 (`Kaggle-Llama.py`)

[`Kaggle-Llama.py`](../../Kaggle-Llama.py) is tailored for Kaggle's **GPU T4 x2** environment:

- **Dual-GPU Verification:** Uses `CUDA_VISIBLE_DEVICES="0,1"` and runs `check_dual_gpu_usage()` after model load to confirm both T4 GPUs are actively utilized (ideal for 31B–32B models at `Q6_K` or `Q4_K_M`).
- **Scratch Disk Management:** Stores models in `/kaggle/tmp/models` instead of `/kaggle/working` (which has a 19.5 GB output quota).
- **Automatic Cleanup:** Cleans up RAM/VRAM on normal exit, `SIGTERM` (kernel stop from Kaggle UI), or startup exceptions.
- **Default API Key:** `sk-kaggle-local`.

---

## 3. Automated Headless Kaggle (`npm run beta-kaggle`)

Run `npm run beta-kaggle` (`node server.js --beta-kaggle`) to launch Kaggle Dual T4 **without opening a browser**:

1. **Credentials:** Place your Kaggle API token at `kaggle-kernel/config/kaggle.json` (see [`kaggle-kernel/config/README.md`](../../kaggle-kernel/config/README.md) for `kaggle.json.example` and `KGAT_...` token instructions).
2. **Staging & Push:** `kaggle-kernel/orchestrator.js` pushes `kaggle-kernel/kernel/main.py` as kernel `aichat-kaggle-server` with `enable_gpu: true` and `enable_internet: true`.
3. **Dual-Channel Handshake:** The kernel commits `tunnel.json` (tagged with a unique `runId`) to a private Kaggle dataset (`<username>/aichat-kaggle-tunnel`) and prints `===AICHAT_TUNNEL_START===...===AICHAT_TUNNEL_END===` in logs as fallback.
4. **Auto-Bind & Lifecycle:** Local AIChat automatically binds `BASE_URL` and `API_KEY`, sends a heartbeat (`GET /__aichat_ping`) every 60 seconds, triggers `POST /__aichat_shutdown` on `Ctrl + C`, and relies on a 30-minute auto-idle watchdog if disconnected unexpectedly.

---

## 4. Prebuilt Multi-Arch CUDA Builder (`Build-Llama-CUDA-Release.py`)

[`Build-Llama-CUDA-Release.py`](../../Build-Llama-CUDA-Release.py) is a one-time builder script that compiles a portable multi-arch fat binary (`llama-cuda-multiarch-b12076.tar.gz` + `.sha256`) covering 5 SASS architectures (`75-real;80-real;86-real;89-real;90-real`) plus PTX (`90-virtual`):

- **Build Time:** ~1 hour 30 minutes on Kaggle's 4-core CPU (compiled inside `/kaggle/tmp`).
- **Usage:** Upload the generated tarball and `.sha256` to a GitHub Release so future Colab/Kaggle runs download and verify it in ~10 seconds instead of recompiling.

---

## 5. Legacy Stack: Ollama + LiteLLM (`Legacy Script/`)

The older Ollama + LiteLLM scripts are preserved in [`Legacy Script/`](../../Legacy%20Script):
- `colab_llm_server.py` / `colab_llm_server.ipynb`
- `kaggle_llm_server.py`

| Aspect | Legacy (Ollama + LiteLLM) | Active (`llama.cpp` Direct) |
|---|---|---|
| **First-run setup** | Faster (prebuilt Ollama binary) | Prebuilt tarball (~10s) or source build |
| **Sampling control** | Translated through 2 layers (LiteLLM → Ollama) | Native 1:1 to `llama-server` |
| **Long-roleplay repetition** | Cumulative OpenAI penalties | Windowed `REPEAT_LAST_N` + **DRY sampling** |
| **Processes** | 2 (`ollama` + `litellm`) | 1 (`llama-server`) |
