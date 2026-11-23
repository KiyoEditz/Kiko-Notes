# Konfigurasi & Sampler

AIChat dikonfigurasi melalui file `.env` (disalin dari [`.env.example`](../../.env.example)) dan dapat diubah saat runtime melalui halaman **Settings** web (`/settings.html` → `POST /api/config`).

> [!IMPORTANT]
> Setiap parameter sampling di bawah ini dipetakan **1:1** ke field JSON bawaan `llama-server`. AIChat mengirimkan nilai ini secara eksplisit pada setiap request, sehingga menimpa default CLI notebook. Nilai yang tidak valid akan dicatat sebagai peringatan dan dikembalikan ke nilai default.

---

## 1. Pengaturan Koneksi & Server

| Variabel | Default | Deskripsi |
|---|---|---|
| `BASE_URL` | *(kosong)* | URL publik Cloudflare Tunnel yang dicetak notebook (contoh: `https://xxxx.trycloudflare.com`). |
| `API_KEY` | *(kosong)* | Bearer token sesuai notebook (`sk-colab-local` atau `sk-kaggle-local`). |
| `MODEL_NAME` | `character1` | Label teks bebas untuk kompatibilitas skema OpenAI (`llama-server` hanya melayani satu model aktif). |
| `PORT` | `3000` | Port server web Express lokal. |
| `UI_LANG` | `EN` | Bahasa antarmuka. Mendukung: `EN`, `ID`, `JP`, `ES`, `FR`, `DE`, `ZH`, `RU`, `KO`, `AR`, `HI`, `PT`. |

---

## 2. Generasi Inti & Mode Thinking

| Variabel | Default | Deskripsi |
|---|---|---|
| `MAX_TOKENS` | `1024` | Batas maksimum token per balasan. |
| `TEMPERATURE` | `0.80` | Tingkat kreativitas/keacakan sampling. |
| `TOP_K` | `50` | Membatasi kandidat token ke K probabilitas tertinggi. |
| `TOP_P` | `0.90` | Ambang probabilitas kumulatif nucleus sampling. |
| `MIN_P` | `0.05` | Menyaring token di bawah `MIN_P * max_prob`. |
| `TYPICAL_P` | `1.0` | Locally typical sampling (`1.0` = nonaktif). |
| `TFS_Z` | `1.0` | Tail-free sampling (`1.0` = nonaktif). |
| `TOP_N_SIGMA` | `-1` | Filter top-n-sigma (`-1` = nonaktif). |
| `ENABLE_THINKING` | `false` | Mengaktifkan/mematikan token *chain-of-thought* (`<think>...</think>`) pada model reasoning (mis. Qwen 2.5/3, DeepSeek-R1). |

---

## 3. Kontrol Repetisi & DRY Sampling

### Penalti Repetisi Berbasis Jendela (*Windowed*)
| Variabel | Default | Deskripsi |
|---|---|---|
| `REPEAT_LAST_N` | `256` | Jumlah token terakhir yang diperiksa (terbatas pada jendela N token, bukan seluruh riwayat). |
| `REPEAT_PENALTY` | `1.05` | Pengali penalti untuk token berulang dalam jendela `REPEAT_LAST_N`. |

### Penalti Gaya OpenAI (Nonaktif secara Default)
| Variabel | Default | Deskripsi |
|---|---|---|
| `PRESENCE_PENALTY` | `0.0` | Kumulatif di seluruh konteks. Sengaja dinonaktifkan agar kata umum ("the", "it", "is") tidak tertekan pada chat panjang. |
| `FREQUENCY_PENALTY` | `0.0` | Penalti frekuensi kumulatif di seluruh konteks. |

### DRY Sampling (Disarankan untuk Roleplay Panjang)
DRY (*Don't Repeat Yourself*) menghukum pengulangan **frasa dan pola**, bukan kata umum individual:

| Variabel | Default | Deskripsi |
|---|---|---|
| `DRY_MULTIPLIER` | `0.8` | Kekuatan penalti DRY (`0.0` menonaktifkan DRY). |
| `DRY_BASE` | `1.75` | Basis eksponensial untuk penalti panjang sekuens. |
| `DRY_ALLOWED_LENGTH` | `2` | Panjang sekuens minimum sebelum penalti diterapkan. |
| `DRY_PENALTY_LAST_N` | `1024` | Jendela token ke belakang untuk pencocokan sekuens DRY. |
| `DRY_SEQUENCE_BREAKERS` | `\n,:,",*` | Karakter pemutus pencocokan sekuens (dipisahkan koma). |

---

## 4. Sampler Lanjutan / Eksperimental

| Variabel | Default | Deskripsi |
|---|---|---|
| `XTC_PROBABILITY` | `0.0` | Probabilitas Exclude Top Choices (eksperimental; `0.0` = mati). |
| `XTC_THRESHOLD` | `0.1` | Ambang probabilitas XTC. |
| `DYNATEMP_RANGE` | `0.0` | Rentang dynamic temperature (`0.0` = mati). |
| `DYNATEMP_EXP` | `1.0` | Eksponen dynamic temperature. |
| `MIROSTAT` | `0` | Mode Mirostat (`0` = mati, `1` = v1, `2` = v2). Jika aktif, menimpa `TOP_K`/`TOP_P`/`TEMPERATURE`. |
| `MIROSTAT_LR` | `0.1` | Learning rate Mirostat. |
| `MIROSTAT_ENT` | `5.0` | Target entropi Mirostat ($\tau$). |
| `SEED` | `-1` | Seed RNG (`-1` = acak). |
| `SAMPLERS` | *(kosong)* | Urutan rantai sampler dipisahkan koma. Kosongkan untuk memakai urutan default `llama-server`. |
