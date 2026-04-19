import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 font-semibold text-base">NovaPivots</Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 pb-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: April 2025</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. What data we collect</h2>
            <p>We collect only what you provide to use the service:</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>Account information: name, email address, and password (hashed, never stored in plain text)</li>
              <li>Intake information: your employment situation, severance details, benefits status, and financial estimates</li>
              <li>Job search data: applications, contacts, and resume content you create or upload</li>
              <li>Usage data: which features you use, to help us improve the product</li>
            </ul>
            <p className="mt-2">
              We do not collect payment information. The service is currently free.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">2. How we use your data</h2>
            <p>Your data is used exclusively to:</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>Generate and display your personalized transition plan</li>
              <li>Store your progress and preferences between sessions</li>
              <li>Power AI-assisted features such as resume tailoring (content is sent to Anthropic&apos;s API for processing)</li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or share your personal data with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">3. AI processing</h2>
            <p>
              Some features send content to third-party AI services (currently Anthropic) to generate suggestions. When you use the resume tailoring feature, your resume content and job description are transmitted to Anthropic&apos;s API.
            </p>
            <p className="mt-2">
              Do not include sensitive personal information (Social Security numbers, financial account numbers, etc.) in content submitted to AI features.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">4. Data storage and security</h2>
            <p>
              Your data is stored in a secured database. Passwords are hashed before storage. We use industry-standard practices to protect your information, but no system is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">5. Your rights</h2>
            <p>You can:</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>Edit or update your information at any time within the product</li>
              <li>Request a copy of your data</li>
              <li>Request deletion of your account and all associated data</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, <Link href="/contact" className="text-blue-600 hover:text-blue-700">contact us</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">6. Cookies and tracking</h2>
            <p>
              We use session cookies required for authentication. We do not use advertising cookies or cross-site tracking.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">7. Changes to this policy</h2>
            <p>
              We may update this policy as the product evolves. We will update the date at the top of this page when changes are made. Continued use of the service constitutes acceptance of the updated policy.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6 text-sm">
          <Link href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</Link>
          <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
        </div>
      </main>
    </div>
  );
}
