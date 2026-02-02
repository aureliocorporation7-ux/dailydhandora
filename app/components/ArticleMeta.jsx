export default function ArticleMeta({ category, formattedDate }) {
  return (
    <div className="flex items-center gap-4 mb-8 text-gray-400">
      <span>{category}</span>
      <span>•</span>
      <span>{formattedDate}</span>
    </div>
  );
}

