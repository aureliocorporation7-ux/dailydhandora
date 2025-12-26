export const metadata = {
  title: 'Grievance Redressal - DailyDhandora',
  description: 'Grievance Redressal mechanism in accordance with the IT Rules 2021.',
};

export default function Grievance() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center border-b border-neutral-800 pb-4">
          Grievance Redressal Mechanism
        </h1>
        
        <div className="space-y-8 text-gray-300">
          <section>
            <p>
              DailyDhandora is compliant with the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>.
              We are committed to addressing any grievances you may have regarding the content published on our platform.
            </p>
          </section>

          <section className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
            <h2 className="text-xl font-bold text-white mb-4">Grievance Officer</h2>
            <p className="mb-2">
              If you have any complaints regarding any content, please contact our Grievance Officer:
            </p>
            
            <div className="mt-4 space-y-2 text-sm">
              <p><strong className="text-white">Name:</strong> Abhishek Kumar</p>
              <p><strong className="text-white">Designation:</strong> Grievance Officer</p>
              <p><strong className="text-white">Email:</strong> <a href="mailto:aureliocorporation7@gmail.com" className="text-blue-500 hover:underline">aureliocorporation7@gmail.com</a></p>
              <p><strong className="text-white">Address:</strong> DailyDhandora Media Labs, Sector 62, Noida, Uttar Pradesh, India - 201309</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">How to Report?</h2>
            <p className="mb-4">
              Please include the following details in your email for us to process your complaint efficiently:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
              <li>Full Name and Contact Details.</li>
              <li>Link (URL) to the content you are reporting.</li>
              <li>Exact nature of the grievance (e.g., Copyright violation, Fake News, Defamation).</li>
              <li>Any supporting documents or proof.</li>
            </ul>
            <p className="mt-4 text-sm">
              We will acknowledge your complaint within 24 hours and resolve it within 15 days as per the statutory guidelines.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
