// components/BottomTabBarWrapper.tsx
import { getLanguages } from "@/lib/actions/languages";
import BottomTabBar from "./BottomTabBar";

export default async function BottomTabBarWrapper() {
  let langs: Awaited<ReturnType<typeof getLanguages>> = [];
  try {
    langs = await getLanguages();
  } catch {
    // 未登入時 getLanguages 會拋出例外，回傳空陣列
  }
  return <BottomTabBar languages={langs} />;
}
