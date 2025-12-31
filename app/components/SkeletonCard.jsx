export default function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden p-3 animate-pulse">
      {/* Image Skeleton */}
      <div className="w-full h-48 bg-neutral-800 rounded-md"></div>
      
      {/* Content Skeleton */}
      <div className="p-3 pt-1 space-y-3">
        {/* Headline lines */}
        <div className="h-6 bg-neutral-800 rounded w-3/4"></div>
        <div className="h-6 bg-neutral-800 rounded w-1/2"></div>
        
        {/* Footer line */}
        <div className="flex justify-between items-center mt-4">
          <div className="h-4 bg-neutral-800 rounded w-20"></div>
          <div className="h-8 w-8 bg-neutral-800 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
