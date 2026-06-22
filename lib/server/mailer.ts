// メール送信の差し替え層。サーバー専用。
// 本番は RESEND_API_KEY 等を設定すると実送信。未設定なら開発モード（ログ＋devLink返却）。
// ※ 送信プロバイダ（Resend/SES/SMTP）はここを実装すれば差し替え可能。

export interface MailResult {
  delivered: boolean;
  devLink?: string; // 開発モードのみ：UI/テストで使えるリンク
}

export async function sendAuthLink(
  to: string,
  subject: string,
  url: string,
  bodyText: string
): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "noreply@saikintan.app";

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          html: `<p>${bodyText}</p><p><a href="${url}">${url}</a></p>`,
        }),
      });
      if (res.ok) return { delivered: true };
    } catch {
      /* 送信失敗 → 開発モードにフォールバック */
    }
  }

  // 開発モード：送信せずログ＆リンクを返す
  console.log(`[mail:dev] to=${to} | ${subject}\n${url}`);
  return { delivered: false, devLink: url };
}

/** リクエストから絶対URLのベースを得る（APP_URL優先）。 */
export function baseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
