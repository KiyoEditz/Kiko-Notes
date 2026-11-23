# Troubleshooting & FAQ

---

## 1. Connection & Startup Issues

### `503 Loading model` during startup
- **Cause:** `llama-server` has started its HTTP listener, but the GGUF model weights are still loading into GPU VRAM.
- **Fix:** Wait until the notebook prints `SERVER IS READY` (which only triggers after `/health` returns `200 {"status":"ok"}` and a 1-token completion test passes).

### `BASE_URL` stopped working / Connection refused
- **Cause:** Free Cloudflare Tunnel URLs (`trycloudflare.com`) are ephemeral and change every time the Colab or Kaggle notebook restarts.
- **Fix:** Copy the new `BASE_URL` printed by your notebook into `.env` (or Settings → Save), or use `npm run beta-kaggle` which updates `BASE_URL` automatically on each run.

---

## 2. Kaggle & Colab Issues

### Kaggle refuses to enable `GPU T4 x2` or `Internet`
- **Cause:** Your Kaggle account is either missing **Phone Verification** or has exhausted its ~30-hour weekly GPU quota.
- **Fix:** Visit [kaggle.com/settings](https://www.kaggle.com/settings) and complete Phone Verification, or check your remaining GPU quota.

### First run takes 5–10 minutes (Colab) or ~90 minutes (Kaggle)
- **Cause:** If no prebuilt CUDA tarball (`GITHUB_RELEASE_URL`) is configured or compatible, the runner compiles `llama.cpp` from source. Multi-arch compilation (`75;80;86;89;90`) on Kaggle's 4-core CPU takes ~90 minutes.
- **Fix:** Use a prebuilt `llama-cuda-multiarch-b12076.tar.gz` release built with [`Build-Llama-CUDA-Release.py`](../../Build-Llama-CUDA-Release.py) so subsequent runs download and verify in ~10 seconds.

### `beta-kaggle` failed to find credentials
- **Cause:** Missing `kaggle-kernel/config/kaggle.json` (or `~/.kaggle/kaggle.json`).
- **Fix:** Follow [`kaggle-kernel/config/README.md`](../../kaggle-kernel/config/README.md) to download `kaggle.json` from Kaggle Settings → API → Create New Token.

---

## 3. Model Output & Roleplay Quality

### Model outputs `<think>...</think>` reasoning blocks
- **Cause:** Reasoning-capable models (e.g., Qwen 2.5/3, DeepSeek-R1) emit chain-of-thought tokens when `ENABLE_THINKING=true`.
- **Fix:** Set `ENABLE_THINKING=false` in `.env` or Settings (default is `false`).

### Responses become repetitive in long chats
- **Cause:** High `PRESENCE_PENALTY` / `FREQUENCY_PENALTY` or disabled DRY sampling.
- **Fix:** Keep `PRESENCE_PENALTY=0.0` and `FREQUENCY_PENALTY=0.0`, and use **DRY sampling** (`DRY_MULTIPLIER=0.8`, `DRY_BASE=1.75`, `DRY_PENALTY_LAST_N=1024`) which penalizes repeated phrases without suppressing common words.
