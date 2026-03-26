"use server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const convert = require("hanzi-to-zhuyin");

export async function lookupZhuyin(word: string): Promise<string | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  try {
    const result: (string | string[])[] = await convert(trimmed);
    if (!result.length) return null;
    // 多音字回傳 [["ㄏㄤˊ","ㄒㄧㄥˊ"]]，取第一個讀音
    const first = result[0];
    return Array.isArray(first) ? first[0] : first;
  } catch {
    return null;
  }
}
