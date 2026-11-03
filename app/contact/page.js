const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dailydhandora.in';

export const metadata = {
  title: 'संपर्क करें (Contact Us) | DailyDhandora',
  description: 'DailyDhandora संपादकीय टीम से संपर्क करें। समाचार सुझाव, प्रेस विज्ञप्ति, विज्ञापन या किसी भी जानकारी के लिए हमें ईमेल करें।',
  alternates: {
    canonical: `${baseUrl}/contact`,
    languages: {
      'hi-IN': `${baseUrl}/contact`,
    },
  },
};

export default function Contact() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'संपर्क करें - DailyDhandora',
    description: 'DailyDhandora संपादकीय टीम से संपर्क करें।',
    url: `${baseUrl}/contact`,
    mainEntity: {
      '@type': 'Organization',
      name: 'DailyDhandora',
      email: 'aureliocorporation7@gmail.com',
      url: baseUrl,
    },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-center text-primary">संपर्क करें (Contact Us)</h1>
        
        <div className="bg-neutral-900/50 p-6 sm:p-8 rounded-xl border border-neutral-800">
          <p className="text-gray-300 mb-8 text-center text-sm sm:text-base leading-relaxed">
            आपके सुझाव और सवाल हमारे लिए महत्वपूर्ण हैं। यदि आपके पास नागौर या राजस्थान से जुड़ी कोई खबर, सुधार या साझेदारी का प्रस्ताव है, तो हमसे बेझिझक संपर्क करें।
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-neutral-800 p-3 rounded-lg">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">ईमेल करें (Email Us)</h2>
                <p className="text-gray-400 text-sm">सामान्य पूछताछ, समाचार और विज्ञापन के लिए:</p>
                <a href="mailto:aureliocorporation7@gmail.com" className="text-primary hover:underline break-all text-sm sm:text-base font-medium">aureliocorporation7@gmail.com</a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-neutral-800 p-3 rounded-lg">
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">कार्यालय (Editorial Office)</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  DailyDhandora Media Labs<br/>
                  नागौर, राजस्थान - 341001
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-neutral-800 p-3 rounded-lg">
                <span className="text-2xl">🤝</span>
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">हमारे साथ काम करें (Work With Us)</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  क्या आप नागौर के स्थानीय संवाददाता या लेखक हैं? अपनी जानकारी हमें भेजें:<br/>
                  <a href="mailto:aureliocorporation7@gmail.com" className="text-primary break-all text-sm sm:text-base font-medium">aureliocorporation7@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
