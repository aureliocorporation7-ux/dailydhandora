import Link from 'next/link';

export const metadata = {
  title: 'About Us - DailyDhandora',
  description: 'नागौर और राजस्थान का अपना भरोसेमंद न्यूज़ पोर्टल। जानिए हमारी टीम और मिशन के बारे में।',
};

export default function About() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                DailyDhandora
            </h1>
            <p className="text-xl text-gray-400 font-medium">नागौर का अपना डिजिटल पोर्टल</p>
        </div>
        
        <div className="space-y-12 text-gray-300 leading-relaxed">
          
          {/* Mission Section */}
          <section className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-orange-500 pl-4">हमारा उद्देश्य (Our Mission)</h2>
            <p className="text-lg mb-4">
              <strong>DailyDhandora</strong> सिर्फ एक न्यूज़ वेबसाइट नहीं, बल्कि ग्रामीण राजस्थान और खासकर <strong>नागौर</strong> के किसानों, युवाओं और आम नागरिकों की आवाज़ है।
            </p>
            <p className="mb-4">
              इंटरनेट पर जानकारी तो बहुत है, लेकिन सही समय पर सही जानकारी (जैसे मंडी के ताज़ा भाव या सरकारी योजना की लास्ट डेट) मिलना मुश्किल है। हमारा मकसद इसी कमी को पूरा करना है। हम जटिल खबरों को आसान भाषा में आप तक पहुँचाते हैं।
            </p>
          </section>

          {/* Team Section (CRITICAL FOR E-E-A-T) */}
          <section>
             <h2 className="text-2xl font-bold text-white mb-8 border-l-4 border-blue-500 pl-4">हमारी टीम (Editorial Team)</h2>
             <div className="grid md:grid-cols-2 gap-8">
                
                {/* Editor Profile */}
                <div className="flex items-start gap-4 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center text-2xl">👨‍💻</div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Abhishek</h3>
                        <p className="text-orange-400 text-sm font-bold uppercase mb-2">Chief Editor & Founder</p>
                        <p className="text-sm text-gray-400">
                            डिजिटल मीडिया विशेषज्ञ और पत्रकार। अभिषेक जी को नागौर की स्थानीय समस्याओं और विकास कार्यों की गहरी समझ है। उनका लक्ष्य तकनीक के माध्यम से हर नागरिक तक सही खबर पहुँचाना है।
                        </p>
                    </div>
                </div>

                {/* Team Profile */}
                 <div className="flex items-start gap-4 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center text-2xl">🌾</div>
                    <div>
                        <h3 className="text-xl font-bold text-white">DailyDhandora AI Desk</h3>
                        <p className="text-blue-400 text-sm font-bold uppercase mb-2">Research & Data Team</p>
                        <p className="text-sm text-gray-400">
                            हमारी 24x7 डेटा टीम जो सुनिश्चित करती है कि मंडी के भाव और सरकारी नोटिफिकेशन जारी होते ही आप तक पहुँचें। सटीकता हमारी प्राथमिकता है।
                        </p>
                    </div>
                </div>

             </div>
          </section>

          {/* Why Trust Us */}
          <section className="grid md:grid-cols-3 gap-6">
            <div className="bg-neutral-900 p-6 rounded-lg text-center">
              <span className="text-4xl mb-3 block">⚖️</span>
              <h3 className="text-lg font-bold text-white mb-2">निष्पक्षता (Unbiased)</h3>
              <p className="text-sm">हम किसी राजनीतिक दल का पक्ष नहीं लेते। हम सिर्फ जनता के हित की बात करते हैं।</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg text-center">
              <span className="text-4xl mb-3 block">⚡</span>
              <h3 className="text-lg font-bold text-white mb-2">सबसे तेज़ (Fastest)</h3>
              <p className="text-sm">मंडी भाव हो या रिजल्ट, हमारी कोशिश रहती है कि खबर सबसे पहले आप तक पहुंचे।</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg text-center">
              <span className="text-4xl mb-3 block">🔒</span>
              <h3 className="text-lg font-bold text-white mb-2">सुरक्षित (Verified)</h3>
              <p className="text-sm">हम फेक न्यूज़ और अफवाहों से दूर रहते हैं। हर खबर की पुष्टि के बाद ही उसे प्रकाशित किया जाता है।</p>
            </div>
          </section>

          <section className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-2">सम्पर्क करें</h2>
            <p className="text-sm mb-4">
                अगर आपके पास नागौर या आस-पास की कोई खबर है, या आप विज्ञापन देना चाहते हैं, तो हमसे संपर्क करें।
            </p>
            <p className="font-mono text-blue-400">📧 aureliocorporation7@gmail.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}