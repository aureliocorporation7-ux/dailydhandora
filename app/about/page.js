import Link from 'next/link';

export const metadata = {
  title: 'About Us - DailyDhandora',
  description: 'Learn about our mission to bring fast, unbiased, and viral news to India.',
};

export default function About() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">About DailyDhandora</h1>
        
        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p>
              Welcome to <strong>DailyDhandora</strong>, India's fastest-growing digital news platform. 
              In an era of information overload, our mission is simple: <strong>To cut through the noise and deliver news that matters.</strong>
            </p>
            <p className="mt-4">
              We don't just report headlines; we explain <em>why</em> they matter to you. From the corridors of power in Delhi to the latest tech breakthroughs in Bangalore, we cover stories that shape the future of India.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Why "Dhandora"?</h2>
            <p>
              In traditional Indian culture, the <em>"Dhandora"</em> (drum beat) was used to announce important public messages. We are the modern digital equivalent—loud, clear, and impossible to ignore. We amplify the voice of the common man and bring attention to stories that deserve to be heard.
            </p>
          </section>

          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-orange-500 mb-2">Unbiased Reporting</h3>
              <p className="text-sm">We are committed to neutrality. Our AI-assisted editorial team ensures facts are checked and opinions are balanced.</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-blue-500 mb-2">Utility First</h3>
              <p className="text-sm">We focus on news you can use. Jobs, schemes, tech tips, and market updates that add value to your life.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Editorial Standards</h2>
            <p>
              DailyDhandora leverages cutting-edge technology to curate news, but every story is overseen by our editorial guidelines which prioritize accuracy, respect for privacy, and national interest. We strictly adhere to the digital media ethics code.
            </p>
          </section>
        </div>

        <div className="mt-12 text-center border-t border-neutral-800 pt-8">
          <p className="mb-4">Have a story to share? Want to advertise with us?</p>
          <Link href="/contact" className="inline-block bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
