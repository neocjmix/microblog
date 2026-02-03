import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <header className="mb-16">
          <h1 className="text-3xl font-bold mb-2">µblog</h1>
          <p className="text-zinc-500">마이크로블로그</p>
        </header>

        {posts.length === 0 ? (
          <p className="text-zinc-500">아직 게시물이 없습니다.</p>
        ) : (
          <div className="space-y-12">
            {posts.map((post) => (
              <article key={post.slug} className="border-l-2 border-zinc-800 pl-6">
                <time className="text-sm text-zinc-500">{post.date}</time>
                <h2 className="text-xl font-semibold mt-1 mb-2">
                  <Link 
                    href={`/posts/${post.slug}`}
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
