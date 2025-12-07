import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-6 text-center">
        <p>&copy; {new Date().getFullYear()} DailyDhandora. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-4">
          <Link href="/about"><span className="hover:text-orange-400">About</span></Link>
          <Link href="/contact"><span className="hover:text-orange-400">Contact</span></Link>
          <Link href="/privacy"><span className="hover:text-orange-400">Privacy Policy</span></Link>
        </div>
      </div>
    </footer>
  );
}
