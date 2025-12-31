import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CategoriesPage() {
  const categories = [
    { name: 'मंडी भाव', icon: '🌾', slug: 'mandi-bhav' },
    { name: 'नागौर न्यूज़', icon: '📰', slug: 'nagaur-news' },
    { name: 'सरकारी योजना', icon: '🏛️', slug: 'schemes' },
    { name: 'भर्ती व रिजल्ट', icon: '🎓', slug: 'bharti-result' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center bg-neutral-950/80 backdrop-blur-sm p-4 border-b border-neutral-800">
        <Link href="/" className="text-neutral-200 p-2 -ml-2">
            <span className="text-2xl">←</span>
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