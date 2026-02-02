import React from "react";
import { Mail, MapPin, Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">
            EX3D PRINTS — PRIVACY POLICY (v2)
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective date: January 26, 2026
          </p>
        </div>

        {/* Main Content */}
        <div className="prose prose-slate max-w-none">
          <p className="text-gray-700 text-lg mb-8">
            This Privacy Policy explains how EX3D Prints ("EX3D," "we," "us") collects, uses, and shares information when you use our website, apps, and related services (the "Services"). Our Services are currently intended for users in Arizona, USA.
          </p>

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1) Who We Are & Scope</h2>
            <div className="space-y-3 text-gray-700">
              <p><strong>Business/Controller:</strong> EX3D Prints (Arizona, USA)</p>
              <p><strong>Contact:</strong> ex3dprint@gmail.com</p>
              <p><strong>Mailing address:</strong> 3700 Willow Creek Rd, Prescott, AZ 86301, USA</p>
              <p><strong>Territory:</strong> We currently serve users located in Arizona only (pilot stage).</p>
              <p>We do not knowingly collect personal information from children under 16.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2) Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Information You Provide</h3>
            <div className="space-y-3 text-gray-700 mb-6">
              <div>
                <p className="font-semibold">Account & Profile</p>
                <p className="ml-4">Name, email, password, phone number (optional), campus affiliation (optional)</p>
              </div>
              <div>
                <p className="font-semibold">Orders & Transactions</p>
                <p className="ml-4">Items purchased or requested, pickup/shipping details (if applicable), order notes and manufacturing preferences (e.g., material, color, infill), payment confirmation details (we do not store full card numbers; our processor stores payment details and provides us a token)</p>
              </div>
              <div>
                <p className="font-semibold">Uploads & Content</p>
                <p className="ml-4">Design files you upload (e.g., STL/3MF) and related specifications, messages you send through the Services, reviews, ratings, photos/videos you submit</p>
              </div>
              <div>
                <p className="font-semibold">Support & Feedback</p>
                <p className="ml-4">Communications with us (email, chat, tickets), survey responses and feedback</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Information Collected Automatically</h3>
            <div className="space-y-3 text-gray-700 mb-6">
              <div>
                <p className="font-semibold">Device and Log Data</p>
                <p className="ml-4">IP address, device type, browser type, operating system, referring URLs, pages viewed, timestamps, and basic site interaction events</p>
              </div>
              <div>
                <p className="font-semibold">Cookies and Similar Technologies</p>
                <p className="ml-4">First-party cookies required for login, session management, and security, Google Analytics configured for non-advertising usage analytics</p>
              </div>
              <div>
                <p className="font-semibold">Approximate Location</p>
                <p className="ml-4">Derived from IP address (e.g., city/region) to show availability and route orders. We do not collect precise geolocation (GPS).</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Information From Third Parties</h3>
            <p className="text-gray-700 mb-6">
              Payment processors (e.g., Stripe): payment status and limited fraud/risk signals
              <br />
              Shipping partners (if enabled later): tracking updates and delivery status
              <br />
              Campus identity (optional): if you opt in, we may verify affiliation via email domain or a verification code
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.4 Information We Do Not Intentionally Collect</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Government IDs</li>
              <li>Biometric identifiers</li>
              <li>Precise geolocation</li>
              <li>Sensitive personal data beyond what you provide through use of the Services</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3) How We Use Information</h2>
            <p className="text-gray-700 mb-4">We use information to:</p>
            <div className="space-y-3 text-gray-700">
              <div>
                <p className="font-semibold">Provide and operate the Services</p>
                <p className="ml-4">Create accounts, process orders, route jobs, communicate readiness, manage pickup/shipping, and provide customer support</p>
              </div>
              <div>
                <p className="font-semibold">Improve the Services</p>
                <p className="ml-4">Troubleshoot issues, develop features, measure usage, and improve reliability and user experience</p>
              </div>
              <div>
                <p className="font-semibold">Safety, security, and fraud prevention</p>
                <p className="ml-4">Prevent abuse, enforce our policies (including prohibited items rules), detect suspicious activity, and protect users and the platform</p>
              </div>
              <div>
                <p className="font-semibold">Communications</p>
                <p className="ml-4">Send transactional communications (order updates, receipts, service notices), send product updates and feature announcements related to your account</p>
              </div>
              <div>
                <p className="font-semibold">Marketing (with choice/where required)</p>
                <p className="ml-4">Email newsletters or promotions when permitted or with your consent. You can opt out anytime via unsubscribe links or by contacting us.</p>
              </div>
              <div>
                <p className="font-semibold">Internal tools and quality systems (optional)</p>
                <p className="ml-4">We may use data (including print parameters, quality outcomes, and limited content signals) to improve internal tooling such as quoting, routing, and moderation. No public model training: these tools are for EX3D internal operations only. Opt-out: email ex3dprint@gmail.com and we will apply an opt-out where feasible (some processing may still be necessary to fulfill orders and comply with law).</p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4) How We Share Information</h2>
            <p className="text-gray-700 mb-6">
              We share information only as needed to run the Services and under contractual safeguards where applicable.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Service Providers (Processors)</h3>
            <p className="text-gray-700 mb-4">Examples include:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Hosting/Storage:</strong> Amazon Web Services (AWS) for compute and encrypted storage</li>
              <li><strong>Security/CDN:</strong> Cloudflare for traffic protection and content delivery</li>
              <li><strong>Payments:</strong> Stripe for payment authorization and fraud checks</li>
              <li><strong>Analytics:</strong> Google Analytics (non-advertising configuration)</li>
              <li><strong>Email/Notifications:</strong> SendGrid for transactional email delivery</li>
              <li><strong>Support Email:</strong> Google Workspace (Gmail) for customer support communications</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Makers and Designers (Platform Participants)</h3>
            <p className="text-gray-700 mb-6">
              Makers receive the information needed to fulfill an assigned order (e.g., manufacturing instructions and order logistics). When possible, we limit this to what's necessary.
              <br /><br />
              Designers may receive reporting needed for royalties and listing performance (generally aggregated and operational), as described in Designer Terms and dashboards.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Legal, Safety, and Business Transfers</h3>
            <p className="text-gray-700 mb-6">
              We may disclose information:
              <br />
              • To comply with law, regulation, legal process, or lawful requests
              <br />
              • To protect rights, property, and safety of EX3D, users, or others
              <br />
              • In connection with a merger, acquisition, incorporation, or sale/transfer of assets (with appropriate protections)
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.4 No Sale of Personal Information</h3>
            <p className="text-gray-700">We do not sell personal information.</p>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5) Cookies & Analytics Choices</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Essential cookies are required for login, security, and core functionality.</li>
              <li>Analytics cookies help us understand how the Services are used. We do not use advertising pixels or cross-site behavioral ad tracking as part of the pilot configuration.</li>
              <li>You can control cookies through your browser settings. Disabling essential cookies may cause parts of the Services to stop working.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6) Data Retention</h2>
            <p className="text-gray-700 mb-4">We keep information only as long as necessary for the purposes described above, unless a longer period is required by law.</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Account data:</strong> retained while your account is active; deleted or anonymized within 24 months after inactivity (subject to legal holds and operational needs)</li>
              <li><strong>Order/transaction records:</strong> retained for 7 years for tax/accounting and dispute resolution</li>
              <li><strong>Consumer uploads (custom one-off prints):</strong> retained up to 30 days after fulfillment for support/reprints, then deleted, unless you opt into a design library feature (if offered)</li>
              <li><strong>Designer marketplace source files:</strong> retained while a listing is active and for up to 12 months after deactivation for audit, dispute resolution, and policy enforcement</li>
              <li><strong>Logs/analytics:</strong> typically retained for 18 months</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7) Your Rights & Choices (U.S.)</h2>
            <p className="text-gray-700 mb-4">
              Depending on your state of residence and applicable law, you may request to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete personal information (with some exceptions)</li>
              <li>Export/receive a copy of certain information</li>
            </ul>
            <p className="text-gray-700 mb-4">
              To make a request, email ex3dprint@gmail.com. We will verify your request and respond within a reasonable time.
            </p>
            <p className="text-gray-700 italic">
              Note: Some information may be retained to comply with law, prevent fraud, resolve disputes, or enforce agreements.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8) Children</h2>
            <p className="text-gray-700">
              The Services are not directed to children under 16, and we do not knowingly collect their personal information. If we learn we collected such information, we will delete it.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9) Security</h2>
            <p className="text-gray-700">
              We use administrative, technical, and physical safeguards designed to protect information, including encryption in transit and at rest where appropriate, role-based access controls, and vendor due diligence. No system is 100% secure; you use the Services at your own risk.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10) Cross-Border Transfers</h2>
            <p className="text-gray-700">
              We store and process information in the United States.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11) Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Policy from time to time. If changes are material, we will provide notice by email and/or a site notice at least 30 days before the changes take effect, unless a shorter timeframe is required for legal compliance or security reasons.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12) Contact</h2>
            <p className="text-gray-700 mb-4">Questions or requests about privacy:</p>
            <div className="bg-slate-50 p-6 rounded-lg">
              <div className="space-y-2">
                <p className="flex items-center text-gray-700">
                  <Mail className="w-5 h-5 mr-2 text-blue-600" />
                  <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a>
                </p>
                <p className="flex items-start text-gray-700">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600 mt-0.5" />
                  <span>3700 Willow Creek Rd, Prescott, AZ 86301, USA</span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}