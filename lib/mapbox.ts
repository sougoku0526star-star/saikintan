// Mapbox の公開トークンとスタイル。
// トークンは環境変数から読む（NEXT_PUBLIC_ 接頭辞でクライアントに露出。値はコードに直書きしない）。
// ローカルは .env.local、本番はホスティングの環境変数に NEXT_PUBLIC_MAPBOX_TOKEN を設定する。
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
export const MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ??
  "mapbox://styles/bewiththeforce/cmqjly5ag001t01re5h7i85xy";

// シンガポール中心（フォールバック）
export const SG_CENTER = { lng: 103.8198, lat: 1.3521 };

// 協調ジェスチャーのヒント文言（日本語化）
export const MAP_LOCALE = {
  "CooperativeGesturesHandler.MobileHelpText": "2本指で地図を動かせます",
  "CooperativeGesturesHandler.WindowsHelpText": "Ctrl を押しながらスクロールでズーム",
  "CooperativeGesturesHandler.MacHelpText": "⌘ を押しながらスクロールでズーム",
};
