'use client';

import { useEffect, useRef } from 'react';
import { Lang } from '@/lib/posts';

interface Props {
  lang: Lang;
}

export default function Comments({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'neocjmix/microblog');
    script.setAttribute('data-repo-id', 'R_kgDORHV7XQ');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDORHV7Xc4C10R1');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'dark');
    script.setAttribute('data-lang', lang === 'ko' ? 'ko' : 'en');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    ref.current.appendChild(script);
  }, [lang]);

  return <div ref={ref} className="mt-16" />;
}
