// 提案生成の共通ルール＋文脈（P2-3・調達源C）。weekly-letterのaction生成と
// P3「ご飯君に聞く」で共用し、提案を「どこで・何を」まで具体的にする。
import { buildUserFoodProfile, describeProfile } from "./user-profile";
import { describeLocalActions } from "../local-actions";

// 提案の解像度ルール。3つの調達源（A=記録 / B=都市定番 / C=AIの地域知識）を優先順で使う。
export const SUGGESTION_RULES = `# 提案のルール（提案は必ず1個だけ。この手順で根拠を選ぶ）
1. ユーザーの記録に実在する店・料理を最優先（「いつもの◯◯なら〜」と具体名で）
2. 無ければ下の「都市の定番アクション候補」から選ぶ
3. それも無ければ、ユーザーの都市の一般的な食環境の知識（スーパー・屋台・コンビニ文化など）で補う
- 3を使うときは、特定店舗の在庫や正確な価格を断言しない。「〜あたりが定番だよ」の温度にとどめる
- 「野菜を食べよう」のような、どこで何をすればいいか不明な抽象提案は禁止。必ず「どこで・何を」まで言う`;

/** 提案プロンプトに埋め込む、この人の記録プロファイル＋都市の候補アクション。 */
export async function buildSuggestionContext(uid: string): Promise<{ profileBlock: string; city: string }> {
  const profile = await buildUserFoodProfile(uid);
  const local = describeLocalActions(profile.city);
  const profileBlock = [
    "# この人について（記録から。実在する店・料理はそのまま使ってよい）",
    describeProfile(profile),
    "",
    "# この都市の定番アクション候補",
    local || "（この都市の候補リストは未整備。一般的な食環境の知識で補ってよい）",
  ].join("\n");
  return { profileBlock, city: profile.city };
}
