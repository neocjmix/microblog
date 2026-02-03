import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Obsidian vault의 posts 폴더 경로
const postsDirectory = path.join(process.env.HOME || '', 'Documents/microblog-vault/posts');

export interface Post {
  slug: string;
  title: string;
  date: string;
  content: string;
  excerpt?: string;
}

export function getAllPosts(): Post[] {
  // posts 폴더가 없으면 빈 배열 반환
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const posts = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        title: data.title || slug,
        date: data.date || new Date().toISOString().split('T')[0],
        content,
        excerpt: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
      };
    });

  // 날짜순 정렬 (최신순)
  return posts.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getPostBySlug(slug: string): Post | null {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title || slug,
    date: data.date || new Date().toISOString().split('T')[0],
    content,
  };
}
