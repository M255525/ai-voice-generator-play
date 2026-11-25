/**
 * 語音代理 Worker（ai-voice-generator-tts）—— 2026-11-25 起停用。
 *
 * 原本代理未公開的線上朗讀服務，沒有可確認的使用授權，已全部移除。
 * 保留端點只為了讓還開著舊版網頁的人看到清楚訊息。不可恢復；語音改由網頁直接呼叫官方 API（tts.js）。
 */
export default {
  async fetch(request) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': 'https://m255525.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    return new Response(JSON.stringify({ error: '語音代理已停用，請重新整理網頁，改用自己的語音服務金鑰' }), { status: 410, headers });
  },
};
