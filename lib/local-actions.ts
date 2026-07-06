// 都市別の定番アクション（調達源B・P2-2）。手書きJSONで実在性を担保する。
// プロファイルの city に一致する都市の候補を、提案プロンプトに渡す。
// 今はシンガポールのみ。他都市は後日追加（未対応都市は調達源C＝AIの地域知識で補う）。
import sg from "./local-actions.sg.json";
import type { ActionKind } from "./weekly";

export interface LocalAction {
  kind: ActionKind;
  text: string;
  cost: string;
}
export interface LocalActionSet {
  city: string;
  currency: string;
  actions: LocalAction[];
}

const SETS: LocalActionSet[] = [sg as LocalActionSet];

/** 都市名に一致する定番アクション集（無ければ null）。 */
export function localActionsForCity(city: string): LocalActionSet | null {
  if (!city) return null;
  return SETS.find((s) => s.city.toLowerCase() === city.toLowerCase()) ?? null;
}

/** プロンプト用：都市の候補アクションを箇条書きに。無ければ空文字。 */
export function describeLocalActions(city: string): string {
  const set = localActionsForCity(city);
  if (!set) return "";
  return set.actions.map((a) => `- [${a.kind}] ${a.text}（${a.cost}）`).join("\n");
}
