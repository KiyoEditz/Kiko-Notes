# Getting Started

This guide walks you through setting up **AIChat** locally and connecting it to a remote `llama-server` (`llama.cpp`) running on Google Colab or Kaggle.

---

## 1. Prerequisites

Before you begin, make sure you have:

- **[Node.js](https://nodejs.org/)** installed on your local machine (laptop, desktop, or Termux/mobile).
- **A Google account** (for Google Colab) or **a Kaggle account** (for Kaggle Notebooks / `beta-kaggle`).
- **A stable internet connection** for both the local client and the Cloudflare Tunnel connection.

---

## 2. Install the Local Web Client

1. Open a terminal in the project root directory (`AI Chat/`).
2. Install the Node.js dependencies (`dotenv`, `express`, `uuid`):
   ```bash
   npm install
   ```
3. Create your local environment file by copying `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

---

## 3. Start the Remote LLM Backend

Choose **one** of the following paths to launch `llama-server` on free cloud GPUs:

### Option A: Automated Headless Kaggle (`npm run beta-kaggle`)

Best for single-device or mobile workflows—no need to open Kaggle in a browser or copy URLs manually.

1. Ensure your Kaggle account is **phone-verified** at [kaggle.com/settings](https://www.kaggle.com/settings) and has weekly GPU quota remaining.
2. Generate a Kaggle API token (`kaggle.json`) from your Kaggle account settings and place it at:
   ```text
   kaggle-kernel/config/kaggle.json
   ```
   *(See [kaggle-kernel/config/README.md](../../kaggle-kernel/config/README.md) for `kaggle.json.example` and `KGAT_...` token details.)*
3. Run the automated launcher from the project root:
   ```bash
   npm run beta-kaggle
   ```
   AIChat will push the kernel (`aichat-kaggle-server`), wait for `llama-server` + `cloudflared` to pass a 1-token sanity check, automatically bind `BASE_URL` & `API_KEY`, and start the local web server. Press `Ctrl + C` when done to remotely shut down the Kaggle kernel immediately.

### Option B: Manual Notebook (Google Colab)

1. Open [Google Colab](https://colab.research.google.com/) and create a new notebook.
2. Go to **Runtime** → **Change runtime type** and select **GPU (T4)**.
3. Copy the entire contents of [`Collab-Llama.py`](../../Collab-Llama.py) into a notebook cell and run it.
4. Wait for setup, model download, and the 1-token readiness check to finish.
5. Copy the printed `BASE_URL` (e.g., `https://xxxx.trycloudflare.com`) and `API_KEY` (`sk-colab-local`) into your local `.env` file.

### Option C: Manual Notebook (Kaggle Dual T4)

1. Create a new notebook at [kaggle.com/code](https://www.kaggle.com/code).
2. In **Notebook options** (right panel):
   - Set **Accelerator** → **GPU T4 x2**
   - Set **Internet** → **On**
3. Copy the entire contents of [`Kaggle-Llama.py`](../../Kaggle-Llama.py) into a cell and run it.
4. Copy the printed `BASE_URL` and `API_KEY` (`sk-kaggle-local`) into your local `.env` file.

---

## 4. Launch & Access AIChat

If you used **Option B** or **Option C**, start the local server:

```bash
npm start
```

- **Local Access:** Open `http://localhost:3000` in your browser.
- **Same Wi-Fi / Mobile Access:** Open `http://<YOUR_HOST_LOCAL_IP>:3000` (e.g., `http://192.168.1.15:3000`) from any phone or tablet on the same Wi-Fi network.

You can also verify connectivity and adjust `BASE_URL`, `API_KEY`, or sampling parameters anytime in the **Settings** page (`http://localhost:3000/settings.html`).

---

## Next Steps

- Review [Minimum Specifications](minimum-specs.md) to match model sizes to your chosen GPU runtime.
- Explore [Configuration & Samplers](configuration.md) to tune DRY sampling, temperature, and thinking mode.
- Read [Features & Usage](features-and-usage.md) to learn about Personas, `{{user}}` macros, Group Chats, and Memory.
