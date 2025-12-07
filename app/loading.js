export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        <p className="mt-4 text-gray-400">[translate:लोड हो रहा है...]</p>
      </div>
    </div>
  );
}
