import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export type Lang = 'ko' | 'en';

export interface Post {
  slug: string;
  title: string;
  date: string;
  content: string;
  excerpt?: string;
  lang: Lang;
  availableLangs: Lang[];
}

// 파일명에서 slug와 언어 추출: "my-post.ko.md" -> { slug: "my-post", lang: "ko" }
function parseFileName(fileName: string): { slug: string; lang: Lang } | null {
  const match = fileName.match(/^(.+)\.(ko|en)\.md$/);
  if (!match) return null;
  return { slug: match[1], lang: match[2] as Lang };
}

// 특정 slug에 대해 사용 가능한 언어 목록
function getAvailableLangs(slug: string): Lang[] {
  if (!fs.existsSync(postsDirectory)) return [];
  
  const files = fs.readdirSync(postsDirectory);
  const langs: Lang[] = [];
  
  for (const file of files) {
    const parsed = parseFileName(file);
    if (parsed && parsed.slug === slug) {
      langs.push(parsed.lang);
    }
  }
  
  return langs;
}

export function getAllPosts(lang?: Lang): Post[] {
  if (!fs.existsSync(postsDirectory)) return [];

  const fileNames = fs.readdirSync(postsDirectory);
  const postsMap = new Map<string, Post>();

  for (const fileName of fileNames) {
    const parsed = parseFileName(fileName);
    if (!parsed) continue;
    
    // 언어 필터가 있으면 해당 언어만
    if (lang && parsed.lang !== lang) continue;

    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    const dateValue = data.date instanceof Date 
      ? data.date.toISOString().split('T')[0]
      : (data.date || new Date().toISOString().split('T')[0]);

    const post: Post = {
      slug: parsed.slug,
      title: String(data.title || parsed.slug),
      date: String(dateValue),
      content,
      excerpt: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
      lang: parsed.lang,
      availableLangs: getAvailableLangs(parsed.slug),
    };

    // 같은 slug가 있으면 요청된 언어 우선, 없으면 첫 번째
    const existing = postsMap.get(parsed.slug);
    if (!existing || (lang && parsed.lang === lang)) {
      postsMap.set(parsed.slug, post);
    }
  }

  return Array.from(postsMap.values())
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getPostBySlug(slug: string, preferredLang: Lang = 'ko'): Post | null {
  const availableLangs = getAvailableLangs(slug);
  
  // 선호 언어가 있으면 그것, 없으면 다른 언어
  const lang = availableLangs.includes(preferredLang) 
    ? preferredLang 
    : availableLangs[0];
  
  if (!lang) return null;

  const fullPath = path.join(postsDirectory, `${slug}.${lang}.md`);
  
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const dateValue = data.date instanceof Date 
    ? data.date.toISOString().split('T')[0]
    : (data.date || new Date().toISOString().split('T')[0]);

  return {
    slug,
    title: String(data.title || slug),
    date: String(dateValue),
    content,
    lang,
    availableLangs,
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  
  const fileNames = fs.readdirSync(postsDirectory);
  const slugs = new Set<string>();
  
  for (const fileName of fileNames) {
    const parsed = parseFileName(fileName);
    if (parsed) slugs.add(parsed.slug);
  }
  
  return Array.from(slugs);
}
