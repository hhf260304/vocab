"use server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pinyin, PINYIN_STYLE } = require("@napi-rs/pinyin");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pinyinToZhuyin } = require("pinyin-zhuyin");

export async function lookupZhuyin(word: string): Promise<string | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  try {
    const syllables: string[] = pinyin(trimmed, {
      style: PINYIN_STYLE.WithToneNumEnd,
    });
    if (!syllables.length) return null;

    const result = syllables
      .map((s: string) => pinyinToZhuyin(s))
      .filter(Boolean)
      .join(" ");

    return result || null;
  } catch {
    return null;
  }
}
