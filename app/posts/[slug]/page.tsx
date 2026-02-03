import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import MarkdownContent from '@/components/MarkdownContent';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link 
          href="/"
          className="text-zinc-500 hover:text-zinc-300 transition-colors mb-8 inline-block"
        >
          ← 돌아가기
        </Link>
        
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
