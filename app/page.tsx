import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';
import { detectLang, langNames } from '@/lib/locale';
import LangSwitcher from '@/components/LangSwitcher';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const detectedLang = await detectLang();
  const posts = getAllPosts(detectedLang);
  
  // 감지된 언어에 글이 없으면 다른 언어로 폴백
  const allPosts = posts.length > 0 ? posts : getAllPosts();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <header className="mb-16 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">µblog</h1>
            <p className="text-zinc-500">
              {detectedLang === 'ko' ? '마이크로블로그' : 'microblog'}
            </p>
          </div>
          <LangSwitcher currentLang={detectedLang} />
        </header>

        {allPosts.length === 0 ? (
          <p className="text-zinc-500">
            {detectedLang === 'ko' ? '아직 게시물이 없습니다.' : 'No posts yet.'}
          </p>
        ) : (
          <div className="space-y-12">
            {allPosts.map((post) => (
              <article key={post.slug} className="border-l-2 border-zinc-800 pl-6">
                <div className="flex items-center gap-2 mb-1">
                  <time className="text-sm text-zinc-500">{post.date}</time>
                  {post.availableLangs.length > 1 && (
                    <span className="text-xs text-zinc-600">
                      [{post.availableLangs.map(l => langNames[l]).join(' / ')}]
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold mt-1 mb-2">
                  <Link 
                    href={`/posts/${post.slug}?lang=${post.lang}`}
                    className="hover:text-blue-400 transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {post.excerpt}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
