import SkeletonCard from '@/app/components/SkeletonCard';

export default function Loading() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-8 bg-neutral-900 rounded w-48 mb-6 animate-pulse"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Show 6 skeleton cards while loading */}
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}