import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug, Lang } from '@/lib/posts';
import { detectLang } from '@/lib/locale';
import MarkdownContent from '@/components/MarkdownContent';
import LangSwitcher from '@/components/LangSwitcher';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function PostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang: queryLang } = await searchParams;
  
  // URL 파라미터 > 브라우저 감지 순으로 언어 결정
  const preferredLang: Lang = (queryLang === 'ko' || queryLang === 'en') 
    ? queryLang 
    : await detectLang();
  
  const post = getPostBySlug(slug, preferredLang);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <Link 
            href="/"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← {post.lang === 'ko' ? '돌아가기' : 'Back'}
          </Link>
          
          {post.availableLangs.length > 1 && (
            <LangSwitcher 
              currentLang={post.lang} 
              availableLangs={post.availableLangs}
            />
          )}
        </div>
        
        <article>
          <header className="mb-8">
            <time className="text-sm text-zinc-500">{post.date}</time>
            <h1 className="text-3xl font-bold mt-2">{post.title}</h1>
          </header>
          
          <MarkdownContent content={post.content} />
        </article>
      </div>
    </main>
  );
}
