// BorgesTag Image Viewer (v1.22.9)
// 保存履歴の「保存した画像を開く」で開かれる拡張ページ。
// クエリパラメータ ?path=... に指定されたローカルファイルを background 経由で読み込み、
// GIF は Blob URL で表示してアニメーションを保持する。

"use strict";

(async () => {
  const params = new URLSearchParams(location.search);
  const filePath = params.get("path") || "";
  const imgEl    = document.getElementById("img");
  const statusEl = document.getElementById("status");

  function showStatus(msg) {
    statusEl.textContent = msg || "";
    statusEl.style.display = msg ? "block" : "none";
  }
  function showError(title, detail) {
    document.body.innerHTML = "";
    const div = document.createElement("div");
    div.className = "error";
    const strong = document.createElement("strong");
    strong.textContent = title;
    div.appendChild(strong);
    if (detail) {
      const p = document.createElement("p");
      p.textContent = detail;
      p.style.margin = "0";
      div.appendChild(p);
    }
    document.body.appendChild(div);
  }

  if (!filePath) {
    showError("パスが指定されていません", "viewer.html は ?path=... で開いてください。");
    return;
  }

  document.title = filePath.split(/[\\/]/).pop() || "BorgesTag Image Viewer";
  showStatus("読み込み中…");
  imgEl.classList.add("loading");

  try {
    const res = await browser.runtime.sendMessage({ type: "FETCH_FILE_AS_DATAURL", path: filePath });
    if (!res?.ok) {
      showError("ファイルを開けません", res?.error || filePath);
      return;
    }

    if (res.dataUrl) {
      imgEl.src = res.dataUrl;
      imgEl.onload = () => { imgEl.classList.remove("loading"); showStatus(""); };
      imgEl.onerror = () => showError("画像の描画に失敗しました", filePath);
      return;
    }

    if (res.chunksB64 && Array.isArray(res.chunksB64)) {
      // 大容量 GIF などは base64 チャンクを受け取り、この場で Blob を組み立てる
      const arrays = [];
      let total = 0;
      for (const b64 of res.chunksB64) {
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        arrays.push(arr);
        total += arr.length;
      }
      const blob = new Blob(arrays, { type: res.mime || "image/gif" });
      const blobUrl = URL.createObjectURL(blob);
      imgEl.src = blobUrl;
      imgEl.onload = () => {
        imgEl.classList.remove("loading");
        showStatus("");
      };
      imgEl.onerror = () => showError("画像の描画に失敗しました", filePath);
      // ページ破棄時に Blob URL を解放
      window.addEventListener("beforeunload", () => {
        try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      });
      return;
    }

    showError("未知の応答形式です", JSON.stringify(Object.keys(res || {})));
  } catch (err) {
    showError("通信エラー", err?.message || String(err));
  }
})();
