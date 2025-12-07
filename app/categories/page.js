import Link from 'next/link';

export default function CategoriesPage() {
  const categories = [
    { name: 'राजनीति', icon: '🏛️', slug: 'politics' },
    { name: 'खेल', icon: '⚽', slug: 'sports' },
    { name: 'मनोरंजन', icon: '🎬', slug: 'entertainment' },
    { name: 'तकनीक', icon: '💻', slug: 'technology' },
    { name: 'व्यापार', icon: '💼', slug: 'business' },
    { name: 'स्वास्थ्य', icon: '🏥', slug: 'health' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center bg-neutral-950/80 backdrop-blur-sm p-4 border-b border-neutral-800">
        <Link href="/" className="text-neutral-200 p-2 -ml-2">
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </Link>
        <h1 className="text-white text-xl font-headings font-bold flex-1 text-center">
          श्रेणियां
        </h1>
        <div className="w-8"></div>
      </header>

      <main className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="flex flex-col items-center justify-center p-6 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-primary transition-colors"
            >
              <div className="text-5xl mb-3">{category.icon}</div>
              <h2 className="text-white text-lg font-bold">{category.name}</h2>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}