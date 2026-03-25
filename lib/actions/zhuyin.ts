"use server";

export async function lookupZhuyin(word: string): Promise<string | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  try {
    const res = await fetch(
      `https://www.moedict.tw/api/${encodeURIComponent(trimmed)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    const bopomofo2 = data?.heteronyms?.[0]?.bopomofo2;
    return typeof bopomofo2 === "string" ? bopomofo2 : null;
  } catch {
    return null;
  }
}
