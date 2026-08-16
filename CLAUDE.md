# CLAUDE.md — ai-voice-generator/web（AI 快速語音產生器・純瀏覽器版）

「AI 快速語音產生器」的純瀏覽器版——打開網址就能用，不需要下載安裝、不需要 Python。跟父層資料夾（[`../`](../CLAUDE.md)，需要本機 Python 後端）是完全不同的架構，這是**獨立巢狀 git 儲存庫**（這個 `web/` 資料夾內有自己的 `.git`，跟父層 `ai-voice-generator` 那個 repo 完全無關，父層 repo 從不 `git add` 這個資料夾、讓它一直是 untracked 狀態——比照 `ai-video-studio/AIvideo_Studio_web` 的既有慣例，不是 git submodule）。

使用者要求「做一個可以使用的網頁」（本機版需要 Python 環境，無法滿足「打開網址就能用」）而新建，2026-08-16。已推送公開 repo **`M255525/ai-voice-generator-play`** 並啟用 GitHub Pages（Actions workflow 部署）：<https://m255525.github.io/ai-voice-generator-play/>。

## 架構關鍵：為什麼需要一個「代理」

瀏覽器 JS 不能自訂 WebSocket 的 `Origin` header，而微軟線上語音服務會檢查這個 header，純前端頁面天生連不上（`ai-video-studio/AIvideo_Studio_web/CLAUDE.md` 已經用真實 Chrome 分頁＋Node `ws` 套件做過完整對照實驗，證明這是無法繞過的瀏覽器安全限制，不是程式碼 bug）。

解法**直接沿用** `ai-video-studio/AIvideo_Studio_web/worker.js`——一支已經除錯到位（含那個「二進位訊息長度前綴 off-by-2」的知名坑，症狀是 ffmpeg 能解但瀏覽器嚴格解碼器直接拒收）、部署在 Cloudflare Workers 的極簡代理，把它原封不動複製進本資料夾的 `worker.js`。`index.html` 用 `fetch(workerUrl, {method:'POST', body:{text,voice,rate}})` 直接拿到 mp3 二進位使用，不需要工作分派/輪詢（跟本機版的 job queue 模式不同，因為單次呼叫本身就是同步等待完成）。

**預設代理網址沿用同一顆已部署的 Worker**（`https://ai-video-studio-tts.pear-sea-880.workers.dev`，`AIvideo_Studio_web` 也在用同一顆），不是另外重新部署——同一個使用者的同一份 Cloudflare 帳號資源，沒有理由分裂成兩顆。頁面內建「🔧 語音服務代理網址（進階）」可覆蓋成使用者自己的代理，以及「🚀 想擁有自己專屬的配音服務？」圖形化申請教學（`<script type="text/plain" id="workerSourceCode">` 內嵌 `worker.js` 全文供一鍵複製，**內容用腳本從 `worker.js` 檔案同步寫入、逐字元驗證一致**，不是手動謄打，避免複製貼上時的轉譯或改寫風險），做法完全比照 `AIvideo_Studio_web` 已驗證過的 UX。

**風險**：這顆共用 Worker 最初是用 `wrangler deploy --temporary` 免帳號快速部署（見全域記憶 `aivideo-studio-web-project`：60 分鐘臨時帳號），但截至驗證當下（距離最初部署已 10 天）仍然存活。**若哪天這顆 Worker 真的失效，`AIvideo_Studio_web` 跟這裡會同時壞掉**，因為預設代理網址是同一個。重新部署只需要在任一個資料夾內 `wrangler deploy`，拿到新網址後兩邊的 `DEFAULT_TTS_WORKER_URL` 都要同步更新。

## 跟本機版的功能差異（刻意，不是遺漏）

- 單人語音上限從本機版的 5000 字降到 **2000 字**——`worker.js` 本身寫死 `text.slice(0, 2000)`（防濫用），送超過這個長度也只會被靜默截斷，UI 上限同步調整避免誤導使用者以為超過的部分有生效。
- 雙人對話**沒有句子間的靜音停頓**——本機版靠 ffmpeg 的 concat demuxer 插入靜音，純瀏覽器沒有 ffmpeg 可用；改成逐句呼叫 Worker 拿到的 mp3 `Uint8Array` 直接 `new Blob([seg0,seg1,...])` 位元組串接（沒有明確靜音間隔，但講者切換時聲音本身會換人，加上神經網路 TTS 輸出本身在語句邊界就帶有一點自然留白，實測聽起來仍分得出段落）。這是有意識的簡化取捨，已在 `manual.html`「這個版本跟本機版的差異」一節明講，不要誤以為是 bug 要修。
- **時長量測不用 ffprobe**（瀏覽器沒有）：沿用 `AIvideo_Studio_web` 的 `measureAudioDuration()`——`<audio>` 元件的 `loadedmetadata`，加上「blob URL 的 duration 有時回報 `Infinity`」這個瀏覽器已知小 bug 的 workaround（跳到 `1e10` 再跳回 `0` 強制觸發正確計算）。**刻意不用 `decodeAudioData()`**——這個線上語音服務吐出的 mp3 是逐段串流拼接、frame 邊界偶有不齊，`decodeAudioData` 是嚴格全有全無解碼器會直接拒收，`<audio>` 元件走的播放管線比較寬容才是對的做法，這個教訓也是從 `AIvideo_Studio_web` 直接繼承。

## 頂部跑馬燈（2026-08-16 新增）

`#marqueeBar` 顯示跟工作區其他工具共用同一份 Google Sheet 維護的公告內容，同一個授權伺服器 Apps Script 網址（`AKfycbwKX0.../exec`，與 `ai-video-studio`／`food-finder`／`ai-prompt-generator`／`SocialPost` 等系列共用）。本工具沒有序號登入機制，頁面載入時直接 POST 空序號取得 `marquee` 欄位（忽略 `valid`/`reason`）。`localStorage` key 為 `avgWebMarquee`（跟本機版的 `avgMarquee` 分開，避免不同網域快取搞混）。版面整合：`.topbar` 原本是 `position:sticky;top:0`，跑馬燈 `position:fixed` 疊頂＋`body.has-marquee{padding-top:30px}`＋`body.has-marquee .topbar{top:30px}`（不是 `margin-top`，理由見 `shared-widget-rollout` skill）。

**已驗證**：Node `fetch()` 直接打共用端點確認能拿到正確的 `marquee` 陣列（**curl 直接 `-L -X POST` 這個網址會因為 302 轉址被降級成 GET 而報 411，是 curl 本身的行為，不代表端點壞掉**，測這個端點要用 `fetch()` 或瀏覽器）；Playwright 對本機靜態伺服器實際驗證跑馬燈正確顯示、`body.has-marquee`／`.topbar top:30px` 皆正確套用。

## 已驗證（整體）

本機靜態伺服器 + 正式線上網址（`m255525.github.io/ai-voice-generator-play`）都用 Playwright 對**真實存在、目前仍在線上**的共用 Cloudflare Worker 做過端對端測試——單人語音生成成功、時長量測正確；雙人對話兩句話正確生成並串接成一個可播放的音檔；Service Worker 正確註冊為 `activated`；`worker.js` 嵌入版與檔案版逐字元比對一致（6055 bytes）。GitHub Actions 部署（`deploy-pages.yml`）已確認跑過一次 `success`。

## 指令

任何靜態伺服器（`python -m http.server`）即可，`file://` 直接開也可以（配音代理是純 `fetch`，沒有 `file://` 下的 CORS 限制問題）。`node --check` 抽出的 inline `<script>` 檢查語法。本機測試 Worker：`npx wrangler dev --local`（不需要登入）。
