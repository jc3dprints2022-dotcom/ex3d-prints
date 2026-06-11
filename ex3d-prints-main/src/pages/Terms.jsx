import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Scale, Mail } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-6">
            <Scale className="w-8 h-8 text-slate-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">EX3D PRINTS — TERMS OF SERVICE (v2.0)</p>
          <p className="text-sm text-gray-500 mt-2">Effective Date: May 8, 2026</p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-10 text-sm text-gray-800">
          <strong>PLEASE READ THESE TERMS CAREFULLY.</strong> THESE TERMS CONTAIN A MANDATORY ARBITRATION AGREEMENT, CLASS ACTION WAIVER, DISCLAIMERS OF WARRANTIES, AND LIMITATIONS OF LIABILITY.<br /><br />
          By accessing or using the Services, creating an account, uploading content, listing designs, fulfilling orders, purchasing products, or otherwise interacting with EX3D, you agree to these Terms and all policies incorporated by reference.
        </div>

        <div className="prose prose-slate max-w-none space-y-10">

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Eligibility</h2>
            <p className="text-gray-700">Consumers must be at least 16 years old. Makers and Designers must be at least 18 years old and legally capable of entering binding contracts.</p>
            <p className="text-gray-700 mt-2">By using the Services, you represent that you meet all eligibility requirements, all information you provide is accurate, and your use complies with all applicable laws. We may suspend or terminate accounts that violate these requirements.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Platform Roles</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-1">Consumers</h3>
                <p className="text-sm text-gray-700">Purchase marketplace products, upload custom designs, and request quotes and fulfillments.</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-gray-900 mb-1">Makers</h3>
                <p className="text-sm text-gray-700">Independent contractors who manufacture physical products. Not employees, agents, or franchisees of EX3D.</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                <h3 className="font-semibold text-gray-900 mb-1">Designers</h3>
                <p className="text-sm text-gray-700">Upload and license designs for manufacturing. Retain ownership subject to licenses granted in these Terms.</p>
              </div>
            </div>
            <p className="text-gray-700">EX3D operates a technology marketplace that connects consumers, makers, and designers; processes payments; routes manufacturing jobs; and provides support. EX3D is not the manufacturer of products unless explicitly stated.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Account Registration & Security</h2>
            <p className="text-gray-700">You are responsible for maintaining the confidentiality of your credentials, all activity under your account, and promptly notifying us of unauthorized access. You may not share accounts, impersonate others, or circumvent security systems. We reserve the right to suspend or terminate accounts for fraud, abuse, infringement, quality failures, or violations of these Terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Orders & Fulfillment</h2>
            <p className="text-gray-700 mb-2">Orders are accepted only after successful payment authorization. EX3D reserves the right to refuse, cancel, or limit orders for fraud prevention, policy violations, manufacturing limitations, suspected infringement, or safety concerns.</p>
            <p className="text-gray-700 mb-2">Custom manufacturing quotes may change prior to acceptance. Approved quotes become binding once payment is processed.</p>
            <p className="text-gray-700">Lead times are estimates unless otherwise expressly stated. EX3D is not liable for delays caused by material shortages, machine failures, shipping carriers, force majeure events, or third-party actions.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Payments, Fees & Taxes</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-1">Consumers</h3>
                <p className="text-sm text-gray-700">Pay product pricing, applicable taxes, platform fees, and optional service fees.</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-gray-900 mb-1">Makers</h3>
                <p className="text-sm text-gray-700">Receive payouts per the Maker Agreement. EX3D may withhold payouts during fraud investigations, quality disputes, or chargeback reviews.</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                <h3 className="font-semibold text-gray-900 mb-1">Designers</h3>
                <p className="text-sm text-gray-700">Royalties governed by the Designer Agreement.</p>
              </div>
            </div>
            <p className="text-gray-700">Users are responsible for their own tax obligations. Makers and Designers are solely responsible for income taxes, self-employment taxes, business licensing, and regulatory compliance.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Intellectual Property</h2>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">6.1 Consumer Uploads</h3>
            <p className="text-gray-700">Consumers retain ownership of uploaded content. By uploading, you grant EX3D and assigned Makers a limited, non-exclusive license to store, process, repair, slice, manufacture, and fulfill the order.</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">6.2 Designer Content</h3>
            <p className="text-gray-700">Designers retain ownership of uploaded designs and grant EX3D a worldwide, sublicensable, transferable license to host, display, market, manufacture, fulfill, and distribute physical products derived from the design through the platform. EX3D does not acquire ownership of the underlying intellectual property.</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">6.3 Maker File Restrictions</h3>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-gray-700 mb-2">Makers may only use files provided through EX3D for the assigned order. Makers may not copy, redistribute, reverse engineer, reuse, or retain files beyond fulfillment. Violation may result in immediate termination, legal action, and permanent platform bans.</p>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-1">6.4 Representations & Warranties</h3>
            <p className="text-gray-700">You represent you own or control necessary rights to uploaded content, your content does not infringe IP rights, and your content complies with all laws. You agree to indemnify EX3D for claims arising from your content.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Copyright & DMCA Policy</h2>
            <p className="text-gray-700 mb-2">EX3D complies with the Digital Millennium Copyright Act (DMCA). If you believe content infringes your rights, submit a notice to:</p>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-800"><strong>EX3D Prints</strong><br />Email: <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a></p>
            </div>
            <p className="text-gray-700 mt-2">Your notice must include identification of the copyrighted work and infringing material, contact information, a good faith statement, a statement under penalty of perjury, and a signature. EX3D may remove content, suspend accounts, and terminate repeat infringers.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Prohibited Uses</h2>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-gray-700">Users may not use the Services for illegal products, weapons or weapon components, counterfeit goods, copyright/trademark/patent infringement, dangerous products, fraudulent activity, harassment or abuse, or circumvention of platform protections. EX3D reserves sole discretion to remove content or terminate accounts.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Product Disclaimers</h2>
            <p className="text-gray-700 mb-2">3D printed products may contain layer lines, surface imperfections, dimensional tolerances, and material limitations. Unless explicitly stated otherwise, products are <strong>NOT</strong> certified for aerospace, medical, safety-critical, structural engineering, load-bearing commercial, or child safety compliance applications.</p>
            <p className="text-gray-700">Users assume all risks associated with product use. Consumers are solely responsible for determining whether a product is appropriate for intended use. EX3D does not guarantee fitness for a particular purpose, regulatory compliance, merchantability, or safety certifications.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Returns, Refunds & Reprints</h2>
            <p className="text-gray-700">Custom manufactured products are generally non-returnable. Refunds or reprints may be offered for manufacturing defects, significant deviations from approved specifications, shipping damage, or incorrect fulfillment. Claims must be submitted within 7 days of delivery or pickup. EX3D reserves final discretion regarding resolutions.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Arbitration Agreement & Class Action Waiver</h2>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <p className="text-gray-800 font-semibold mb-2">PLEASE READ THIS SECTION CAREFULLY.</p>
              <p className="text-gray-700">You agree that any dispute arising out of or relating to the Services shall be resolved exclusively through binding arbitration, conducted confidentially in Arizona, governed by the Federal Arbitration Act.</p>
              <p className="text-gray-700 mt-2"><strong>You waive the right to jury trials, class actions, class arbitrations, and representative actions. Claims must be brought individually.</strong> Either party may seek temporary injunctive relief for intellectual property misuse or confidentiality breaches.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">12. Limitation of Liability</h2>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <p className="text-gray-700 mb-2">To the maximum extent permitted by law, EX3D shall not be liable for indirect damages, consequential damages, lost profits, lost business, data loss, reputation harm, or punitive damages.</p>
              <p className="text-gray-700"><strong>EX3D's maximum aggregate liability shall not exceed the greater of: amounts paid to EX3D during the 12 months preceding the claim, OR $100 USD.</strong></p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">13. Indemnification</h2>
            <p className="text-gray-700">You agree to defend, indemnify, and hold harmless EX3D and its owners, officers, employees, contractors, and affiliates from claims arising from your content, products, manufacturing, infringement, violations of law, or misuse of the Services, including attorney fees and legal costs.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">14. Termination</h2>
            <p className="text-gray-700">EX3D may suspend or terminate accounts at any time for policy violations, fraud risk, copyright claims, quality failures, abuse, or legal compliance requirements. Upon termination, licenses may immediately end, access may be revoked, and pending payouts may be withheld pending investigations. Sections intended to survive termination remain enforceable.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">15. Governing Law</h2>
            <p className="text-gray-700">These Terms are governed by Arizona law without regard to conflict of law principles. Any permitted court proceedings shall occur exclusively in Arizona.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">16. Changes to Terms</h2>
            <p className="text-gray-700">We may update these Terms at any time. Material changes will be communicated through website notices, email notifications, and account notifications. Continued use of the Services constitutes acceptance of updated Terms.</p>
          </section>

          <section className="bg-slate-50 p-8 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-600" />
              17. Contact
            </h2>
            <p className="text-gray-700"><strong>EX3D Prints</strong><br />Email: <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a></p>
          </section>

          <div className="text-center py-8 border-t border-gray-200">
            <p className="text-gray-600">Effective as of May 8, 2026.</p>
            <div className="mt-4 flex justify-center gap-4">
              <Link to={createPageUrl("Privacy")} className="text-blue-600 hover:underline">Privacy Policy</Link>
              <Link to={createPageUrl("Contact")} className="text-blue-600 hover:underline">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}