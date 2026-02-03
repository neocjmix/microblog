'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Lang } from '@/lib/posts';

interface Props {
  currentLang: Lang;
  availableLangs?: Lang[];
}

const langNames: Record<Lang, string> = {
  ko: '🇰🇷',
  en: '🇺🇸',
};

export default function LangSwitcher({ currentLang, availableLangs }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const langs: Lang[] = availableLangs || ['ko', 'en'];

  const switchLang = (lang: Lang) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', lang);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      {langs.map((lang) => (
        <button
          key={lang}
          onClick={() => switchLang(lang)}
          className={`px-2 py-1 text-lg rounded transition-opacity ${
            currentLang === lang 
              ? 'opacity-100' 
              : 'opacity-40 hover:opacity-70'
          }`}
          title={lang === 'ko' ? '한국어' : 'English'}
        >
          {langNames[lang]}
        </button>
      ))}
    </div>
  );
}
