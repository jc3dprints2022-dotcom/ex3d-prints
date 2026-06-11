import React from "react";
import { Mail, Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">EX3D PRINTS — PRIVACY POLICY (v3.0)</p>
          <p className="text-sm text-gray-500 mt-2">Effective Date: May 8, 2026</p>
        </div>

        <p className="text-gray-700 text-lg mb-8">
          This Privacy Policy explains how EX3D Prints collects, uses, shares, and protects information when you use our Services. By using the Services, you consent to the practices described in this Policy.
        </p>

        <div className="prose prose-slate max-w-none space-y-10">

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">Information You Provide</h3>
            <p className="text-gray-700">We may collect: name, email address, phone number, billing information, shipping information, uploaded files, messages and support requests, reviews and ratings, and manufacturing preferences.</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">Information Collected Automatically</h3>
            <p className="text-gray-700">We may automatically collect: IP address, device identifiers, browser type, operating system, referring URLs, usage data, log files, and cookie identifiers.</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">Payment Information</h3>
            <p className="text-gray-700">Payments are processed through third-party providers such as Stripe. EX3D does not store full payment card information.</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">Approximate Location</h3>
            <p className="text-gray-700">We may infer approximate geographic location from IP address for routing, fraud prevention, and service availability.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. How We Use Information</h2>
            <p className="text-gray-700 mb-2">We use information to: operate the Services, process transactions, route manufacturing jobs, provide customer support, detect fraud and abuse, enforce policies, improve platform performance, communicate with users, analyze platform usage, and comply with legal obligations.</p>
            <p className="text-gray-700">We may use operational data to improve internal systems, moderation tools, pricing systems, routing systems, and manufacturing workflows. <strong>We do not sell personal information.</strong></p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. How We Share Information</h2>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">Service Providers</h3>
            <p className="text-gray-700">We share information with service providers supporting hosting, payments, security, analytics, email delivery, and cloud infrastructure.</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">Makers & Designers</h3>
            <p className="text-gray-700">We may share limited information necessary to fulfill orders, process royalties, resolve disputes, and prevent fraud.</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">Legal Compliance</h3>
            <p className="text-gray-700">We may disclose information when required by law, court order, government request, safety concerns, fraud investigations, or enforcement actions.</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">Business Transfers</h3>
            <p className="text-gray-700">Information may transfer during mergers, acquisitions, asset sales, or reorganizations.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Cookies & Tracking</h2>
            <p className="text-gray-700">We use cookies and similar technologies for authentication, security, preferences, analytics, and platform functionality. You may disable cookies through browser settings, though portions of the Services may stop functioning properly.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Data Retention</h2>
            <p className="text-gray-700 mb-2">We retain information only as long as reasonably necessary. Typical retention periods:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Account information: while active plus reasonable archival periods</li>
              <li>Transaction records: up to 7 years</li>
              <li>Uploaded files: based on operational needs and agreements</li>
              <li>Logs and analytics: according to security and operational requirements</li>
            </ul>
            <p className="text-gray-700 mt-2">We may retain information longer when legally required.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Security</h2>
            <p className="text-gray-700">We implement reasonable administrative, technical, and organizational safeguards including encryption, access controls, logging systems, vendor security reviews, and role-based permissions. However, no system is completely secure. You use the Services at your own risk.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. User Rights</h2>
            <p className="text-gray-700 mb-2">Depending on applicable law, you may request access to, correction of, deletion of, or export of your personal information. Requests may be submitted to:</p>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-800"><a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a></p>
            </div>
            <p className="text-gray-700 mt-2">We may verify identity before processing requests.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p className="text-gray-700">The Services are not intended for children under 16. We do not knowingly collect personal information from children under 16.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. International Users</h2>
            <p className="text-gray-700">Information may be processed and stored in the United States. By using the Services, you consent to such transfers.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Changes to this Policy</h2>
            <p className="text-gray-700">We may update this Policy periodically. Material changes may be communicated through email, site notices, and account notifications. Continued use of the Services constitutes acceptance of updated policies.</p>
          </section>

          <section className="bg-slate-50 p-8 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-600" />
              11. Contact
            </h2>
            <p className="text-gray-700"><strong>EX3D Prints</strong><br />Email: <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}