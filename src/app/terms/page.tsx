import Link from 'next/link';

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: April 2025</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. What this product is</h2>
            <p>
              NovaPivots is a personal organization tool that helps people navigate career transitions — including layoffs, job searches, and career changes. It provides a structured plan based on information you provide.
            </p>
            <p className="mt-2">
              This product does not provide legal advice, financial advice, tax advice, or career counseling. Any output — including task recommendations, financial estimates, resume content, and AI-generated text — is for organizational and informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">2. No guarantees</h2>
            <p>
              We make no guarantees about outcomes. Using this product does not guarantee employment, a salary increase, a job offer, or any other result. Individual outcomes depend entirely on factors outside our control.
            </p>
            <p className="mt-2">
              All estimates — including financial runway calculations — are approximations based on the information you enter. They should not be relied upon as financial planning advice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">3. AI-generated content</h2>
            <p>
              Some features use AI (including Anthropic&apos;s Claude) to generate content such as resume suggestions and tailored text. AI-generated content may be inaccurate, incomplete, or not suitable for your specific situation.
            </p>
            <p className="mt-2">
              You are responsible for reviewing, editing, and verifying any AI-generated content before using it in applications, documents, or communications. Do not submit AI-generated text without reviewing it first.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">4. Your account and data</h2>
            <p>
              You are responsible for the accuracy of the information you provide. Your data is stored securely and used only to provide the service. We do not sell your personal data to third parties.
            </p>
            <p className="mt-2">
              You can request deletion of your account and associated data at any time by <Link href="/contact" className="text-blue-600 hover:text-blue-700">contacting us</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">5. Acceptable use</h2>
            <p>
              You agree to use this service only for lawful personal purposes. You may not use it to submit fraudulent job applications, misrepresent your qualifications, or engage in any form of deception.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">6. Changes to these terms</h2>
            <p>
              We may update these terms as the product evolves. Continued use of the service after changes constitutes acceptance of the revised terms. We will update the date at the top of this page when changes are made.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">7. Contact</h2>
            <p>
              If you have questions about these terms, <Link href="/contact" className="text-blue-600 hover:text-blue-700">contact us</Link>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6 text-sm">
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>
          <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
        </div>
      </main>
    </div>
  );
}
