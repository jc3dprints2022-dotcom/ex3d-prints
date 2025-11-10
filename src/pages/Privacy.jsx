import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, ChevronDown, ChevronUp, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  const [expandedSections, setExpandedSections] = useState({
    makerTerms: false,
    designerTerms: false,
    prohibited: false,
    dmca: false,
    qualitySpecs: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
            EX3D PRINTS — PRIVACY POLICY (v1.0)
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective date: October 17, 2025
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-slate max-w-none mb-12">
          <p className="text-gray-700 text-lg mb-8">
            This Privacy Policy describes how EX3D Prints ("EX3D") collects, uses, and shares information 
            when you use our Services within Arizona, USA.
          </p>

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Who We Are & Scope</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Controller/Business:</strong> EX3D Prints (Arizona, USA)</li>
              <li><strong>Contact:</strong> ex3dprint@gmail.com; 3700 Willow Creek Rd, Prescott, AZ 86301, USA</li>
              <li><strong>Territory:</strong> We currently serve U.S. users in Arizona only.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Account & Profile:</strong> name, email, password, phone (optional), campus affiliation (optional)</li>
              <li><strong>Transactions:</strong> orders, items, payment method token (stored by our processor), shipping/pickup details</li>
              <li><strong>Uploads & Content:</strong> design files, print specifications, messages, reviews, photos/videos</li>
              <li><strong>Support:</strong> communications with us, survey responses</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Automatically Collected</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Device/Log data:</strong> IP address, device/browser type, OS, referring URLs, pages viewed, timestamps</li>
              <li><strong>Cookies/Analytics:</strong> first‑party cookies to operate the site and Google Analytics for usage analytics (non‑advertising mode)</li>
              <li><strong>Approximate location</strong> (derived from IP) to show availability and route orders</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 From Third Parties</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Payment processors confirm payment status and may return limited risk signals (fraud checks)</li>
              <li>Shipping partners provide tracking updates</li>
              <li>Campus identity (if you opt‑in) may be verified via email domain or code</li>
            </ul>
            <p className="text-gray-700 italic">
              We do not collect government IDs, biometrics, or precise geolocation.
            </p>
            <p className="text-gray-700 italic">
              We do not knowingly collect data from children under 16.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Provide, operate, and improve the Services; route and fulfill orders; process payments; provide support</li>
              <li>Safety, security, and fraud prevention; enforce policies and prohibited‑item rules</li>
              <li>Communicate about orders, service updates, and features</li>
              <li>Marketing with your consent (e.g., email newsletters). You can unsubscribe anytime</li>
              <li>Training internal quality models/tools to improve routing, quoting, and moderation (non‑public use only). You can opt out by emailing us</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Sharing & Disclosures</h2>
            <p className="text-gray-700 mb-4">
              We share information with service providers under contract, only as needed to provide the Services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li><strong>Infrastructure/Hosting/Storage:</strong> Amazon Web Services (AWS) — compute and encrypted storage (e.g., S3)</li>
              <li><strong>CDN/DDoS:</strong> Cloudflare — traffic protection and content delivery</li>
              <li><strong>Payment processing:</strong> Stripe — payment authorization and fraud checks</li>
              <li><strong>Analytics:</strong> Google Analytics (non‑advertising mode)</li>
              <li><strong>Email & notifications:</strong> SendGrid (transactional emails)</li>
              <li><strong>Customer support & communications:</strong> Google Workspace (Gmail) for support email</li>
              <li><strong>Shipping & logistics:</strong> Not applicable during campus pilot (pickup only)</li>
            </ul>
            <p className="text-gray-700">
              We may disclose information to comply with law, respond to lawful requests, or protect rights, 
              property, and safety. <strong>We do not sell personal information.</strong>
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Cookies & Analytics Choices</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Essential cookies</strong> are required to log in, keep your session, and secure the site</li>
              <li><strong>Analytics cookies</strong> (Google Analytics) help us understand usage. We do not use advertising or cross‑site tracking pixels</li>
              <li>You can control cookies via your browser. Disabling essential cookies may break the site</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Account data:</strong> retained while your account is active; deleted or anonymized within 24 months after inactivity, subject to legal holds</li>
              <li><strong>Order records:</strong> retained 7 years for tax/accounting</li>
              <li><strong>Consumer uploads (custom one‑off):</strong> retained up to 30 days post‑fulfillment for support/reprints, then deleted, unless you opt into a design library</li>
              <li><strong>Designer marketplace files:</strong> retained while the listing is active and for 12 months thereafter for audit</li>
              <li><strong>Logs/analytics:</strong> 18 months</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights & Choices (U.S.)</h2>
            <p className="text-gray-700 mb-4">
              You can request access, correction, export, or deletion of your personal information by emailing{' '}
              <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a>. 
              We will verify your request and respond within a reasonable period. California residents may have 
              additional rights under state law; we will honor those rights if applicable.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children</h2>
            <p className="text-gray-700">
              We do not knowingly collect data from children under 16. If we learn of such collection, we will delete it.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Security</h2>
            <p className="text-gray-700">
              We use industry‑standard safeguards: encryption in transit and at rest, role‑based access controls, 
              audit logging, and vendor due diligence. No system is 100% secure.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Cross‑Border Transfers</h2>
            <p className="text-gray-700">
              We store and process data in the United States.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Policy. Material changes will be notified by email and/or site notice at least 
              30 days before they take effect.
            </p>
          </section>

          {/* Section 12 - Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact</h2>
            <div className="bg-slate-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">Questions or requests:</p>
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

          {/* Appendices */}
          <div className="border-t-4 border-gray-300 pt-12 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Appendices</h2>

            {/* Appendix A */}
            <Card className="mb-6">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('makerTerms')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Appendix A — Maker Terms</CardTitle>
                  {expandedSections.makerTerms ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
              {expandedSections.makerTerms && (
                <CardContent className="space-y-4 text-gray-700">
                  <p><strong>Independent contractor.</strong> You are not an employee or agent of EX3D. You provide your own equipment and materials unless the job specifies otherwise.</p>
                  
                  <p><strong>Job assignment.</strong> EX3D may route jobs based on proximity, capacity, quality, and subscription tier. Assignment is not guaranteed.</p>
                  
                  <p><strong>File controls.</strong> You will receive order‑specific, time‑limited production files. Use only for the assigned order, do not copy/share/reuse, and delete after fulfillment.</p>
                  
                  <p><strong>Quality & timelines.</strong> Meet material and dimensional specs and deliver to the Student Union order cabinet by the due date. If a part fails QC, you will reprint at your cost.</p>
                  
                  <p><strong>Out‑of‑tolerance remediation.</strong> For validated consumer claims (reported within 7 days with adequate proof), you must reprint and deliver at your expense or authorize a refund (at EX3D's discretion). Repeated OOT issues may result in suspension.</p>
                  
                  <p><strong>Cancellations.</strong> If a buyer requests cancellation before you begin production (no material consumed, no meaningful labor), you should approve. If production has started, you may deny; document status in the portal.</p>
                  
                  <p><strong>Shipping (future).</strong> When carrier shipping is enabled, you are responsible for packaging to withstand transit. If the buyer purchases shipping insurance, you must cooperate with claims.</p>
                  
                  <p><strong>Prohibited items.</strong> You must comply with the Prohibited Items Policy and applicable law.</p>
                  
                  <p><strong>Ratings & removal.</strong> Repeated late deliveries, quality failures, or policy violations may result in suspension.</p>
                </CardContent>
              )}
            </Card>

            {/* Appendix B */}
            <Card className="mb-6">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('designerTerms')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Appendix B — Designer Terms</CardTitle>
                  {expandedSections.designerTerms ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
              {expandedSections.designerTerms && (
                <CardContent className="space-y-4 text-gray-700">
                  <p><strong>Ownership/License (exclusive).</strong> You retain ownership of your design and grant EX3D an exclusive, transferable, sublicensable license to use, manufacture, market, and fulfill physical‑print orders using your design via the EX3D platform. EX3D may create technical derivatives necessary for manufacturing (e.g., supports, orientations, per‑order slicing).</p>
                  
                  <p><strong>Versioning & approvals.</strong> When you upload a new version of a listed design, it must be approved by EX3D before replacing the live listing. Until approval, the previous version remains available.</p>
                  
                  <p><strong>Royalties.</strong> You earn a 10% royalty per printed unit sold (calculated on the item price, excluding taxes).</p>
                  
                  <p><strong>Warranties.</strong> You warrant you own the design or have rights to license it, and it does not infringe third‑party rights.</p>
                  
                  <p><strong>Takedowns.</strong> EX3D may disable designs upon credible IP complaints pending investigation.</p>
                  
                  <p><strong>Portfolio use.</strong> EX3D may display photos/renders of printed results for marketing unless you opt out in account settings.</p>
                </CardContent>
              )}
            </Card>

            {/* Appendix C */}
            <Card className="mb-6">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('prohibited')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Appendix C — Prohibited Items Policy</CardTitle>
                  {expandedSections.prohibited ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
              {expandedSections.prohibited && (
                <CardContent className="space-y-4 text-gray-700">
                  <p className="font-semibold">Examples of items we do not allow:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Illegal items or items that facilitate illegal activity</li>
                    <li>Weapons, weapon parts, or accessories (including 3D‑printed weapon components)</li>
                    <li>Illegal drugs and drug paraphernalia</li>
                    <li>Hazardous materials and recalled items</li>
                    <li>Hate or violent content and items that promote or glorify violence</li>
                    <li>Human remains/body parts</li>
                    <li>Counterfeit/unauthorized replicas; stolen goods</li>
                    <li>Personal data/government IDs</li>
                    <li>Highly regulated medical devices and items claiming medical efficacy</li>
                    <li>Sexual/explicit content</li>
                    <li>Listings that promote fraud or evasion of the law</li>
                  </ul>
                  <p className="italic">
                    <strong>Campus‑specific:</strong> Items that violate university rules or policies are prohibited during the campus pilot.
                  </p>
                  <p className="italic">
                    This list is illustrative, not exhaustive. We may remove or restrict items at our discretion.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Appendix D */}
            <Card className="mb-6">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('dmca')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Appendix D — Copyright/DMCA Procedure</CardTitle>
                  {expandedSections.dmca ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
              {expandedSections.dmca && (
                <CardContent className="space-y-4 text-gray-700">
                  <div>
                    <p className="font-semibold mb-2">To report alleged infringement:</p>
                    <p className="mb-2">Email <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a> with:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Your contact info</li>
                      <li>Identification of the copyrighted work</li>
                      <li>Identification of infringing material (URL, screenshots)</li>
                      <li>A statement of good‑faith belief</li>
                      <li>A statement under penalty of perjury of accuracy and authority</li>
                      <li>Your physical or electronic signature</li>
                    </ol>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-2">Counter‑notice:</p>
                    <p className="mb-2">If your material was removed in error, send:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Your signature</li>
                      <li>Identification of removed material and where it appeared</li>
                      <li>A statement under penalty of perjury that you believe the removal was a mistake</li>
                      <li>Your contact info</li>
                      <li>Consent to jurisdiction of federal courts in Arizona</li>
                    </ol>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Appendix E */}
            <Card className="mb-6">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('qualitySpecs')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Appendix E — Quality Specs</CardTitle>
                  {expandedSections.qualitySpecs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
              {expandedSections.qualitySpecs && (
                <CardContent className="space-y-6 text-gray-700">
                  <p className="italic">
                    These specs are guidance for the campus pilot and may vary by geometry, material, and printer. 
                    Final specs will be published on the Quality page as they evolve.
                  </p>
                  
                  <p><strong>General measurement:</strong> Unless otherwise specified, tolerances refer to dimensions measured at 21–23°C on parts conditioned for 24 hours after print and support removal.</p>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2">FDM/FFF (PLA standard)</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Layer height: 0.2 mm (standard); 0.1–0.28 mm available</li>
                      <li>Dimensional tolerance: ±0.3 mm or ±0.5% (greater governs)</li>
                      <li>Minimum wall thickness: 1.2 mm (3 perimeters @ 0.4 mm)</li>
                      <li>Hole adjustment: undersize by 0.2–0.4 mm; ream post‑print if critical</li>
                      <li>Surface: visible layer lines; supports leave witness marks</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2">FDM/FFF (PETG/ABS)</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Dimensional tolerance: ±0.4 mm or ±0.7%</li>
                      <li>Warpage risk higher on large flat parts; consider chamfers/fillets and brim/raft</li>
                      <li>Heat resistance: PETG &gt; PLA; ABS requires enclosure for best results</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Resin (SLA/DLP)</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Layer height: 0.05–0.1 mm</li>
                      <li>Dimensional tolerance: ±0.2 mm or ±0.2%</li>
                      <li>Detail: features down to ~0.2 mm; brittle compared with FDM</li>
                      <li>Post‑cure: UV cure per resin datasheet; may change dimensions slightly</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Recommended QC for Makers</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Calibrate e‑steps/flow and bed level weekly</li>
                      <li>Print a 20 mm calibration cube per material batch; record measured XYZ</li>
                      <li>Verify ± tolerance on two critical dimensions per job before delivery</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Use Limitations</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Not for safety‑critical, aerospace, medical, or implantable applications without written approval</li>
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}