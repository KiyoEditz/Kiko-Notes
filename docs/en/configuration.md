# Configuration & Samplers

AIChat is configured via `.env` (copied from [`.env.example`](../../.env.example)) and can also be updated at runtime through the web **Settings** page (`/settings.html` → `POST /api/config`).

> [!IMPORTANT]
> Every sampling parameter below maps **1:1** to `llama-server`'s native JSON body fields. AIChat sends these explicitly on every request, which overrides the notebook's CLI startup defaults. Invalid values are logged as warnings and fall back to defaults.

---

## 1. Connection & Server Settings

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | *(empty)* | Public Cloudflare Tunnel URL printed by the notebook (e.g., `https://xxxx.trycloudflare.com`). |
| `API_KEY` | *(empty)* | Bearer token matching the notebook (`sk-colab-local` or `sk-kaggle-local`). |
| `MODEL_NAME` | `character1` | Free-text label echoed for OpenAI-schema compatibility (`llama-server` serves a single loaded model). |
| `PORT` | `3000` | Port for the local Express web server. |
| `UI_LANG` | `EN` | Interface language. Supported: `EN`, `ID`, `JP`, `ES`, `FR`, `DE`, `ZH`, `RU`, `KO`, `AR`, `HI`, `PT`. |

---

## 2. Core Generation & Thinking Mode

| Variable | Default | Description |
|---|---|---|
| `MAX_TOKENS` | `1024` | Maximum tokens generated per response. |
| `TEMPERATURE` | `0.80` | Sampling randomness. Higher = more creative; lower = more deterministic. |
| `TOP_K` | `50` | Limits candidate tokens to top K most likely. |
| `TOP_P` | `0.90` | Nucleus sampling cumulative probability threshold. |
| `MIN_P` | `0.05` | Filters out tokens with probability below `MIN_P * max_prob`. |
| `TYPICAL_P` | `1.0` | Locally typical sampling (`1.0` = disabled). |
| `TFS_Z` | `1.0` | Tail-free sampling (`1.0` = disabled). |
| `TOP_N_SIGMA` | `-1` | Top-n-sigma filtering (`-1` = disabled). |
| `ENABLE_THINKING` | `false` | Controls chain-of-thought `<think>...</think>` tokens on reasoning models (e.g., Qwen 2.5/3, DeepSeek-R1). Keep `false` for clean roleplay output. |

---

## 3. Repetition Control & DRY Sampling

### Windowed Repetition Penalty
| Variable | Default | Description |
|---|---|---|
| `REPEAT_LAST_N` | `256` | Number of recent tokens checked for repetition (bounded window, not the entire history). |
| `REPEAT_PENALTY` | `1.05` | Multiplier penalizing repeated tokens inside `REPEAT_LAST_N`. |

### OpenAI-Style Penalties (Disabled by Default)
| Variable | Default | Description |
|---|---|---|
| `PRESENCE_PENALTY` | `0.0` | Cumulative over the **entire** context. Disabled by default so common words ("the", "it", "is") aren't suppressed in long roleplays. |
| `FREQUENCY_PENALTY` | `0.0` | Cumulative frequency penalty over the **entire** context. |

### DRY Sampling (Recommended for Long Roleplay)
DRY (*Don't Repeat Yourself*) penalizes repeated **phrases and loops** rather than individual common words:

| Variable | Default | Description |
|---|---|---|
| `DRY_MULTIPLIER` | `0.8` | Strength of DRY penalty (`0.0` disables DRY). |
| `DRY_BASE` | `1.75` | Exponential base for sequence length penalty. |
| `DRY_ALLOWED_LENGTH` | `2` | Minimum sequence length before penalty applies. |
| `DRY_PENALTY_LAST_N` | `1024` | Token lookback window for DRY sequence matching. |
| `DRY_SEQUENCE_BREAKERS` | `\n,:,",*` | Characters that reset sequence matching (comma-separated). |

---

## 4. Advanced / Experimental Samplers

| Variable | Default | Description |
|---|---|---|
| `XTC_PROBABILITY` | `0.0` | Probability of Exclude Top Choices (experimental; `0.0` = off). |
| `XTC_THRESHOLD` | `0.1` | Probability threshold for XTC. |
| `DYNATEMP_RANGE` | `0.0` | Dynamic temperature range (`0.0` = off). |
| `DYNATEMP_EXP` | `1.0` | Dynamic temperature exponent. |
| `MIROSTAT` | `0` | Mirostat mode (`0` = off, `1` = v1, `2` = v2). When non-zero, overrides `TOP_K`/`TOP_P`/`TEMPERATURE`. |
| `MIROSTAT_LR` | `0.1` | Mirostat learning rate. |
| `MIROSTAT_ENT` | `5.0` | Mirostat target entropy ($\tau$). |
| `SEED` | `-1` | RNG seed (`-1` = random). |
| `SAMPLERS` | *(empty)* | Comma-separated sampler chain order. Leave empty for `llama-server` default chain. |
