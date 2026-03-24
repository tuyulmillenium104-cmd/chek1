# RALLY WORKFLOW V9.8.1 - WORKLOG

## Informasi Versi

| Item | Detail |
|------|--------|
| **Versi** | v9.8.1 Final |
| **Tanggal** | 2026-03-23 |
| **File** | `/home/z/my-project/docs/hybrid-nlp-v9.8.0/improvements/rally-workflow-v9.8.1-complete.js` |
| **GitHub** | https://github.com/tuyulmillenium104-cmd/penilaian2 |

---

## Cara Menjalankan

```bash
# Masuk ke direktori
cd /home/z/my-project/docs/hybrid-nlp-v9.8.0/improvements

# List semua campaign
node rally-workflow-v9.8.1-complete.js list

# Jalankan dengan nama campaign (partial match)
node rally-workflow-v9.8.1-complete.js "Internet Court"

# Jalankan dengan alamat campaign
node rally-workflow-v9.8.1-complete.js 0xAF5a5B459F4371c1781E3B8456214CDD063EeBA7
```

---

## Fitur Utama v9.8.1

### 1. Campaign Search by Name
- Pencarian campaign dengan nama (partial match)
- Tidak harus pakai alamat lagi
- Contoh: `"Internet Court"` → auto-find campaign

### 2. Multi-Token Pool (11 Tokens)
| # | Label | User ID |
|---|-------|---------|
| 0 | Auto-Config (Primary) | auto |
| 1 | Akun A #1 | 97631263-5dba-4e16-b127-19212e012a9b |
| 2 | Akun B #1 | bb829ea3-0d37-4944-8705-00090bde3671 |
| 3 | Akun A #2 | 97631263-5dba-4e16-b127-19212e012a9b |
| 4 | Akun B #2 | bb829ea3-0d37-4944-8705-00090bde3671 |
| 5 | Akun A #3 | 97631263-5dba-4e16-b127-19212e012a9b |
| 6 | Akun C #1 | 2706ea69-a397-4f3f-8706-5eaf0d6a799b |
| 7 | Akun D #1 | e3b6c803-c6c2-4467-ab2b-0bd3ab9c6a48 |
| 8 | Akun A #4 | 97631263-5dba-4e16-b127-19212e012a9b |
| 9 | Akun E #1 | 1cdcf579-c6e5-4ef7-82d5-d869d8c85a5e |
| 10 | Akun B #3 | bb829ea3-0d37-4944-8705-00090bde3671 |

### 3. Multi-Content Workflow
- Generate 5 konten sekaligus
- Quick Judge (compliance check)
- Full Judge (6 gates × 2 passes)
- Auto regenerate jika gagal

### 4. Hybrid Approach (Generation + Judge)
- **Generator**: Tahu quality criteria (hooks, emotions, evidence layers)
- **Judge**: Independen, tidak tahu scoring details
- Skor maksimal: **136 poin**

### 5. Quick Judge (Pre-Check)
- 7 compliance criteria dicek sebelum Full Judge
- Hemat token untuk konten yang pasti gagal

### 6. Web Search (SDK)
- Pure SDK web search
- Multi-token fallback untuk rate limit

---

## Sistem Scoring (136 Poin Total)

| Gate | Poin | Threshold |
|------|------|-----------|
| Gate Utama | 20 | 16 (80%) |
| Gate Tambahan | 16 | 14 (87.5%) |
| Penilaian Internal | 60 | 54 (90%) |
| Compliance | 10 | 10 (100%) |
| Fact-Check | 5 | 4 (80%) |
| Uniqueness | 25 | 20 (80%) |
| **TOTAL** | **136** | **118 (87%)** |

---

## 6 Judge Gates

1. **Gate Utama** - Hook, emotions, body feeling, CTA
2. **Gate Tambahan** - Structure, readability, banned words
3. **Penilaian Internal** - Quality criteria (9 aspek)
4. **Compliance Judge** - Campaign rules compliance
5. **Fact-Check Judge** - Fakta diverifikasi via web search
6. **Uniqueness Judge** - Berbeda dari kompetitor

---

## Rate Limit Handling

### Masalah:
- Server-side rate limit (429)
- Semua token terkena limit bersamaan

### Solusi Saat Ini:
- Tunggu rate limit reset (manual)
- Jalankan ulang workflow dengan perintah

### Cara Reset:
```bash
# Tunggu beberapa jam, lalu jalankan lagi:
node rally-workflow-v9.8.1-complete.js "Internet Court"
```

---

## Riwayat Perubahan

| Commit | Deskripsi |
|--------|-----------|
| `90077b2` | Revert to pure SDK web search |
| `542caeb` | Add SerpAPI web search (removed later) |
| `34355af` | All web search uses Direct DuckDuckGo |
| `a5c424c` | Add direct DuckDuckGo web search |
| `215aaf7` | Add AI-based research fallback |
| `6561031` | Update webSearchSDK retry logic |
| `02aadd2` | Add 5 more tokens (11 total) |
| `fecd39b` | Add campaign search by name support |
| `252b297` | Add fallback for research synthesis JSON parsing |
| `d05220f` | Enhanced generation & judge prompts with Hybrid Approach |
| `d6db345` | Multi-Token Rate Limit Handler + SDK Only Mode |
| `c00882f` | Add Quick Judge compliance check + GLM-5 model |

---

## Tokens yang Tersedia

### Token 1-5 (Original)
```
Akun A #1, #2, #3, #4
Akun B #1, #2, #3
```

### Token 6-10 (Baru Ditambahkan)
```
Akun C #1: 2706ea69-a397-4f3f-8706-5eaf0d6a799b
Akun D #1: e3b6c803-c6c2-4467-ab2b-0bd3ab9c6a48
Akun E #1: 1cdcf579-c6e5-4ef7-82d5-d869d8c85a5e
```

---

## Catatan Penting

1. **Rate limit adalah server-side** - tidak bisa dihindari dengan token switching
2. **Web search pakai SDK** - kualitas bagus tapi ada rate limit
3. **Campaign search by name** - sudah didukung, tidak perlu alamat
4. **Quick Judge** - efisiensi tinggi, hemat token
5. **Hybrid Approach** - generator tahu kriteria, judge independen

---

## Status: SIAP DIGUNAKAN

Workflow siap dijalankan kapan saja. Jika rate limit, tunggu beberapa jam lalu jalankan lagi.

**Perintah untuk menjalankan:**
```bash
cd /home/z/my-project/docs/hybrid-nlp-v9.8.0/improvements
node rally-workflow-v9.8.1-complete.js "Internet Court"
```
