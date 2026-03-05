// app/page.tsx
import Link from "next/link";
import LanguageCard from "@/components/LanguageCard";
import { Button } from "@/components/ui/button";
import { createLanguage, getLanguages, PRESET_LANGUAGES } from "@/lib/actions/languages";
import { getVocabularies, getTodayReviews } from "@/lib/actions/vocabulary";

export default async function DashboardPage() {
  const langs = await getLanguages();

  const stats = await Promise.all(
    langs.map(async (lang) => {
      const [all, reviews] = await Promise.all([
        getVocabularies(lang.id),
        getTodayReviews(lang.id),
      ]);
      return { lang, totalCount: all.length, reviewCount: reviews.length };
    })
  );

  const existingNames = langs.map((l) => l.name);
  const availablePresets = PRESET_LANGUAGES.filter(
    (p) => !existingNames.includes(p.name)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">學習語言</h1>
        <p className="text-muted-foreground text-sm mt-1">選擇語言開始複習</p>
      </div>

      {langs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-4">🌍</p>
          <p className="font-medium text-foreground">尚未新增任何語言</p>
          <p className="text-sm mt-1 mb-6">從下方選擇要學習的語言</p>
          {availablePresets.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground font-medium">新增語言</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {availablePresets.map((preset) => (
                  <form
                    key={preset.ttsCode}
                    action={async () => {
                      "use server";
                      await createLanguage({ name: preset.name, ttsCode: preset.ttsCode });
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm">
                      + {preset.name}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {stats.map(({ lang, totalCount, reviewCount }) => (
              <LanguageCard
                key={lang.id}
                language={lang}
                reviewCount={reviewCount}
                totalCount={totalCount}
              />
            ))}
          </div>
          {availablePresets.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground font-medium">新增語言</p>
              <div className="flex flex-wrap gap-2">
                {availablePresets.map((preset) => (
                  <form
                    key={preset.ttsCode}
                    action={async () => {
                      "use server";
                      await createLanguage({ name: preset.name, ttsCode: preset.ttsCode });
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm">
                      + {preset.name}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
