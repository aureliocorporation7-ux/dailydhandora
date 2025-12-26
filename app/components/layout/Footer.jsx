import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 border-t border-neutral-800 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Column 1: Brand */}
        <div className="col-span-1 md:col-span-2">
          <h2 className="text-2xl font-bold text-white mb-4">DailyDhandora</h2>
          <p className="text-sm leading-relaxed mb-4 max-w-sm">
            DailyDhandora is India's next-gen digital news platform, bringing you the latest stories with a focus on utility, facts, and speed. We cut through the noise.
          </p>
          <div className="flex gap-4">
            {/* Social Icons Placeholders */}
            <a href="#" className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">𝕏</a>
            <a href="#" className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-blue-800 hover:text-white transition-colors">f</a>
            <a href="#" className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors">In</a>
          </div>
        </div>

        {/* Column 2: Company */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            <li><Link href="/categories" className="hover:text-white transition-colors">Categories</Link></li>
          </ul>
        </div>

        {/* Column 3: Legal */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Grievance Redressal</Link></li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-neutral-800 text-center text-xs">
        <p>© {new Date().getFullYear()} DailyDhandora Media Labs. All rights reserved.</p>
      </div>
    </footer>
  );
}
