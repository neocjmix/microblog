import { headers } from 'next/headers';
import { Lang } from './posts';

export async function detectLang(): Promise<Lang> {
  const headersList = await headers();
  const acceptLang = headersList.get('accept-language') || '';
  
  // 한국어가 포함되어 있으면 ko, 아니면 en
  if (acceptLang.toLowerCase().includes('ko')) {
    return 'ko';
  }
  return 'en';
}

export const langNames: Record<Lang, string> = {
  ko: '한국어',
  en: 'English',
};
