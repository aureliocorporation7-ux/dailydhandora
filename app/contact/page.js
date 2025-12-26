export const metadata = {
  title: 'Contact Us - DailyDhandora',
  description: 'Get in touch with the DailyDhandora team.',
};

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Contact Us</h1>
        
        <div className="bg-neutral-900/50 p-8 rounded-xl border border-neutral-800">
          <p className="text-gray-300 mb-8 text-center">
            We value your feedback. Whether you have a news tip, a correction, or a partnership inquiry, reach out to us.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-neutral-800 p-3 rounded-lg">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Email Us</h3>
                <p className="text-gray-400">For general inquiries and press:</p>
                <a href="mailto:aureliocorporation7@gmail.com" className="text-blue-500 hover:underline">aureliocorporation7@gmail.com</a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-neutral-800 p-3 rounded-lg">
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Office Address</h3>
                <p className="text-gray-400">
                  DailyDhandora Media Labs<br/>
                  Sector 62, Noida<br/>
                  Uttar Pradesh, India - 201309
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-neutral-800 p-3 rounded-lg">
                <span className="text-2xl">🤝</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Work With Us</h3>
                <p className="text-gray-400">
                  Are you a freelance journalist? Send your portfolio to <span className="text-blue-500">aureliocorporation7@gmail.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
