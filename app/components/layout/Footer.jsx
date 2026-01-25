import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 border-t border-neutral-800 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Column 1: Brand */}
        <div className="col-span-1 lg:col-span-2">
          <Link href="/" className="inline-block">
            <h2 className="text-2xl font-bold text-white mb-2">DailyDhandora</h2>
            <p className="text-[10px] text-primary uppercase tracking-widest font-bold mb-4">नागौर का अपना डिजिटल पोर्टल</p>
          </Link>
          <p className="text-sm leading-relaxed mb-6 max-w-sm text-gray-400">
            डेली ढिंढोरा (DailyDhandora) नागौर और राजस्थान की सबसे विश्वसनीय डिजिटल न्यूज़ वेबसाइट है। हम आपको मंडी भाव, सरकारी योजनाएं, और स्थानीय खबरें सबसे पहले और सटीक रूप में पहुँचाते हैं।
          </p>
          <div className="flex gap-4">
            {/* Social Icons Placeholders */}
            <a href="#" className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">𝕏</a>
            <a href="#" className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-blue-800 hover:text-white transition-colors">f</a>
            <a href="#" className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors">In</a>
          </div>
        </div>

        {/* Column 2: Explore */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Explore</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-white transition-colors">🏠 होम</Link></li>
            <li><Link href="/category/mandi-bhav" className="hover:text-white transition-colors">🌾 मंडी भाव</Link></li>
            <li><Link href="/category/nagaur-news" className="hover:text-white transition-colors">📰 नागौर न्यूज़</Link></li>
            <li><Link href="/category/education-dept" className="hover:text-white transition-colors">📚 शिक्षा विभाग</Link></li>
            <li><Link href="/category/schemes" className="hover:text-white transition-colors">🏛️ सरकारी योजना</Link></li>
            <li><Link href="/category/bharti-result" className="hover:text-white transition-colors">🎓 भर्ती व रिजल्ट</Link></li>
          </ul>
        </div>

        {/* Column 3: Legal */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link></li>
            <li><Link href="/grievance" className="hover:text-white transition-colors">Grievance Redressal</Link></li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-neutral-800 text-center text-xs">
        <p>© {new Date().getFullYear()} DailyDhandora Media Labs. All rights reserved.</p>
      </div>
    </footer>
  );
}
