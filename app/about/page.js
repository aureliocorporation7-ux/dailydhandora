import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center bg-neutral-950/80 backdrop-blur-sm p-4 border-b border-neutral-800">
        <Link href="/" className="text-neutral-200 p-2 -ml-2">
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </Link>
        <h1 className="text-white text-xl font-headings font-bold flex-1 text-center">
          हमारे बारे में
        </h1>
        <div className="w-8"></div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📰</div>
          <h2 className="text-3xl font-bold text-white mb-2">DailyDhandora</h2>
          <p className="text-primary font-semibold">भारत की सबसे तेज़ हिंदी समाचार वेबसाइट</p>
        </div>

        <div className="space-y-6 text-neutral-300">
          <section>
            <h3 className="text-xl font-bold text-white mb-2">हमारा उद्देश्य</h3>
            <p className="leading-relaxed">
              DailyDhandora का उद्देश्य है भारत के हर कोने में ताज़ा और सटीक समाचार पहुंचाना। हम तकनीक और AI का उपयोग करके सबसे तेज़ और विश्वसनीय समाचार सेवा प्रदान करते हैं।
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-2">हमारी विशेषताएं</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>24/7 ताज़ा समाचार अपडेट</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>AI-powered समाचार क्यूरेशन</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>सभी श्रेणियों में व्यापक कवरेज</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>मोबाइल-फ्रेंडली डिज़ाइन</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-2">संपर्क करें</h3>
            <p className="leading-relaxed">
              किसी भी सुझाव या शिकायत के लिए हमसे संपर्क करें: contact @dailydhandora.com
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}