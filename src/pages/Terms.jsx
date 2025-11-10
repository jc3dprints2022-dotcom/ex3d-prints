import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Scale, Users, FileText, DollarSign, AlertTriangle, Mail, Shield, Package, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-6">
            <Scale className="w-8 h-8 text-slate-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">
            EX3D PRINTS — TERMS OF SERVICE (v1.0)
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective date: October 17, 2025
          </p>
        </div>

        {/* Important Status Note */}
        <Alert className="mb-12 border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-gray-900">
            <strong>IMPORTANT STATUS NOTE:</strong> EX3D Prints ("EX3D," "we," "us") is currently operating as a 
            pre‑incorporation business in Arizona, USA. These Terms constitute a binding agreement between you and 
            EX3D Prints as an Arizona sole proprietorship until a formal entity is formed. Upon entity formation, 
            references to EX3D will mean that entity without further action by you.
          </AlertDescription>
        </Alert>

        {/* Content */}
        <div className="prose prose-slate max-w-none">
          
          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By creating an account, placing an order, uploading a file, listing a design, or using EX3D's website 
              (the "Services"), you agree to these Terms and all policies referenced here (Privacy Policy, Prohibited 
              Items Policy, Copyright/DMCA Policy, Maker Terms, Designer Terms). If you do not agree, do not use the Services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Who We Are & Contact</h2>
            <div className="bg-blue-50 p-6 rounded-lg">
              <ul className="list-none space-y-2 text-gray-900">
                <li><strong>Business name:</strong> EX3D Prints</li>
                <li><strong>Address:</strong> 3700 Willow Creek Rd, Prescott, AZ 86301, USA</li>
                <li><strong>Email:</strong> <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a></li>
                <li><strong>Service territory:</strong> Arizona, USA (campus/local launch; shipping within AZ only at this stage)</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Consumers:</strong> You must be 16+ to use the Services. If 16–17, you represent you have parental consent.</li>
              <li><strong>Makers & Designers:</strong> You must be 18+ and able to enter a binding contract.</li>
              <li>Not available where prohibited by law. We may verify eligibility.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Roles on the Platform</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <Users className="w-6 h-6 text-green-600 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Consumers</h3>
                <p className="text-sm text-gray-700">Buy ready‑to‑order items or request prints of uploaded designs</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Package className="w-6 h-6 text-orange-600 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Makers</h3>
                <p className="text-sm text-gray-700">Independent contractors who fulfill assigned print jobs</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                <FileText className="w-6 h-6 text-pink-600 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Designers</h3>
                <p className="text-sm text-gray-700">Provide designs that can be printed via the marketplace and earn royalties</p>
              </div>
            </div>
            <p className="text-gray-700">
              EX3D operates the platform, routes jobs, handles payments and customer support, and may set fees and incentives.
            </p>
            <p className="text-gray-700 mt-2">
              <strong>Campus Pilot:</strong> Orders may be routed for local pickup/drop‑off. Details appear at checkout.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Account Registration & Security</h2>
            <p className="text-gray-700 mb-4">
              Provide accurate information and keep it updated. You are responsible for account credentials and all 
              activity under your account. We may suspend or terminate accounts for violations, fraud risk, abuse, or 
              repeated low‑quality fulfillment.
            </p>
            <p className="text-gray-700">
              <strong>Account requirement (pilot):</strong> During the campus pilot, an EX3D account is required to 
              place orders or list designs. We may enable guest checkout in the future.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Orders, Quotes & Fulfillment</h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-700">
              <li>
                <strong>Catalog items:</strong> The price you see is the price you pay (plus taxes, if any).
              </li>
              <li>
                <strong>Custom prints (manual quotes):</strong> All custom orders are manually quoted. You must approve 
                the quote and the design proof before we begin production. Changes after approval require a new quote and proof.
              </li>
              <li>
                <strong>Designer listings:</strong> Designers may update models, but new versions require EX3D approval; 
                the previous version remains available until the update is approved.
              </li>
              <li>
                <strong>Acceptance:</strong> An order is accepted when payment is successfully authorized. EX3D may 
                refuse/cancel any order and will refund if payment was captured in error.
              </li>
              <li>
                <strong>Lead times & SLA:</strong> Lead times may be provided at quote time. We expect to publish a formal 
                Service Level Agreement (SLA); until then, lead times are estimates. Rush production may be available for an added fee.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              7. Pricing, Fees & Payments
            </h2>
            
            <div className="space-y-6">
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Consumers</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Pay the item price and applicable taxes at checkout</li>
                  <li>For the campus pilot, there is no shipping fee; pickup is at the Student Union</li>
                  <li><strong>Payment timing:</strong> Payment is captured upfront when you place the order; no deposits are required</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Makers</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>EX3D charges a <strong>30% platform fee</strong> on the order subtotal (excluding taxes)</li>
                  <li>Makers may subscribe for <strong>$10/month</strong> to reduce the platform fee to <strong>6%</strong></li>
                  <li>Payouts are initiated within 7 days after pickup is confirmed and may be delayed for fraud or quality investigations</li>
                </ul>
              </div>

              <div className="bg-pink-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Designers</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Designers earn a <strong>10% royalty</strong> per printed unit sold via the marketplace (calculated on the item price, excluding taxes)</li>
                  <li>Royalties are paid monthly once cumulative royalties exceed $20; unpaid amounts roll over</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Processing & Taxes</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Processors:</strong> Payments are handled by Stripe (PayPal may be added in the future). We do not store full card numbers; Stripe provides tokenization.</li>
                  <li><strong>Taxes:</strong> Applicable sales tax is collected at purchase and remitted where required. You are responsible for any other taxes or duties.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Pickup (Campus Pilot) & Risk of Loss</h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-700">
              <li>
                <strong>Method:</strong> During the campus pilot, Makers deliver completed orders to the Student Union 
                pickup desk. Consumers pick up orders from the same location during posted hours. Carrier shipping is not 
                used during the pilot.
              </li>
              <li>
                <strong>Pickup window:</strong> We hold orders for 10 business days after notification. After the window, 
                the order may be considered delivered and may be recycled/donated without refund.
              </li>
              <li>
                <strong>Proof of pickup:</strong> Bring your order code (QR or ID) and a matching name on your account 
                or email. Authorized delegates must present the order code.
              </li>
              <li>
                <strong>Risk/Title (pilot):</strong> Pass to the buyer upon pickup handoff at the Student Union.
              </li>
              <li>
                <strong>Lost/Damaged before pickup:</strong> Report to EX3D within 48 hours of notice that the order is 
                ready; we will coordinate a reprint or remedy.
              </li>
              <li>
                <strong>Future carrier shipping (post‑pilot):</strong> When shipping is enabled, we expect to use USPS 
                (no signature by default). Risk/Title will transfer upon carrier handoff. Optional shipping insurance may 
                be offered at checkout; details will be published with the shipping launch.
              </li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Returns, Reprints & Cancellations</h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-700">
              <li>
                <strong>Custom/On‑Demand items</strong> are made to order and are not returnable.
              </li>
              <li>
                <strong>Out‑of‑tolerance / low quality:</strong> If you believe your item is out of spec or defective, 
                notify us within 7 days of pickup with photos/videos and measurements. Upon EX3D validation, you may 
                choose (a) refund or (b) reprint. If you choose reprint, the Maker covers the reprint (and shipping, if applicable).
              </li>
              <li>
                <strong>Cancellations:</strong> Submit a cancellation request in your order page. We will notify the 
                assigned Maker, who may approve or deny based on production status. If production has not started (no 
                material consumed, no meaningful labor), the cancellation should be approved and you will be refunded. 
                If production has started, the Maker may deny; EX3D may override in exceptional cases.
              </li>
              <li>
                <strong>Design changes after approval:</strong> Not permitted for accepted quotes. Submit a new quote for 
                changes. For marketplace items, designer updates require approval; the old version remains available until 
                the new one is approved.
              </li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Quality, Materials & Use Restrictions</h2>
            <div className="bg-purple-50 p-6 rounded-lg mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tolerances (default)</h3>
              <p className="text-gray-700 mb-2">
                Unless specified on the product page:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>FDM/FFF prints target ±0.3 mm or ±0.5% (whichever is greater)</li>
                <li>Resin prints typically target ±0.2 mm or ±0.2%, subject to geometry</li>
                <li>Surface finish may show layer lines or support marks</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2 italic">
                See Appendix E (Quality Specs) in our Privacy Policy for detailed specifications
              </p>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Suitability:</strong> Prints are not certified for safety‑critical, aerospace, medical, or 
                implantable use unless we expressly agree in writing.
              </li>
              <li>
                <strong>Care:</strong> Avoid high heat, solvents, or loads beyond the design intent.
              </li>
            </ul>
          </section>

          {/* Section 11 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              11. Prohibited & Restricted Items/Uses
            </h2>
            <div className="bg-red-50 p-6 rounded-lg mb-4">
              <p className="text-gray-900 font-semibold mb-3">
                We mirror major online marketplace restrictions. Examples include:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Illegal items</li>
                <li>Weapons, weapon parts or accessories</li>
                <li>Illegal drugs/drug paraphernalia</li>
                <li>Hazardous materials</li>
                <li>Items that promote hate or violence</li>
                <li>Human remains/body parts</li>
                <li>Stolen goods</li>
                <li>Counterfeit or unauthorized replicas</li>
                <li>Personal data or government IDs</li>
                <li>Highly regulated medical devices</li>
                <li>Items facilitating illegal activity</li>
                <li>Sexual/explicit items</li>
              </ul>
            </div>
            <p className="text-gray-700">
              We may remove listings or reject orders at our discretion. A non‑exhaustive, illustrative list appears 
              in our <Link to={createPageUrl("Privacy")} className="text-blue-600 hover:underline">Prohibited Items Policy</Link> (incorporated by reference) and may be updated.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              12. Intellectual Property; Designs & Prints
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">12.1 Consumer Uploads (Custom One‑Off Prints)</h3>
            <p className="text-gray-700 mb-6">
              You retain ownership of your uploaded design. You grant EX3D and assigned Makers a non‑exclusive, worldwide, 
              royalty‑free license to use, reproduce, modify (mesh repair/slicing), and manufacture the design solely to 
              fulfill your order. We may retain encrypted backups for 30 days for support and reprint purposes.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">12.2 Designer Listings (Marketplace Catalog)</h3>
            <p className="text-gray-700 mb-6">
              Designers retain ownership of their designs and grant EX3D an exclusive, transferable, sublicensable license 
              to use, manufacture, market, and fulfill physical‑print orders using the design through the EX3D platform, 
              including the right to create technical derivatives necessary for manufacturing (e.g., mesh repair, orientation, 
              supports, per‑order slicing). This exclusivity applies only to physical manufacturing via EX3D and does not 
              authorize EX3D to sell or distribute the underlying digital files to consumers.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">12.3 Maker Access & File Controls</h3>
            <div className="bg-orange-50 p-6 rounded-lg mb-6">
              <p className="text-gray-900 mb-3">
                To protect designer IP, Makers receive order‑specific, time‑limited production files (e.g., per‑order G‑code). 
                Makers must:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Use files only to fulfill the assigned order</li>
                <li>Not reverse engineer, copy, share, or reuse files</li>
                <li>Delete files after fulfillment</li>
                <li>Comply with any watermarks or identifiers in production files</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">12.4 Representations</h3>
            <p className="text-gray-700">
              You represent you have commercial rights to the content you upload and that your content does not infringe any third‑party 
              rights or laws. You agree to compensate EX3D for claims arising from your content.
            </p>
          </section>

          {/* Section 13 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Copyright/DMCA Policy</h2>
            <p className="text-gray-700 mb-4">
              We respond to notices of alleged infringement under the U.S. Digital Millennium Copyright Act (DMCA). 
            </p>
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Our Designated Agent:</h3>
              <ul className="list-none space-y-2 text-gray-900">
                <li><strong>DMCA Agent:</strong> EX3D Prints</li>
                <li><strong>Address:</strong> 3700 Willow Creek Rd, Prescott, AZ 86301, USA</li>
                <li><strong>Email:</strong> <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a></li>
              </ul>
            </div>
            <p className="text-gray-700 mt-4">
              We may remove or disable access to allegedly infringing material and, when appropriate, suspend repeat 
              infringers. Counter‑notices must meet statutory requirements.
            </p>
          </section>

          {/* Section 14 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Community & Conduct</h2>
            <p className="text-gray-700">
              No harassment, hate speech, doxxing, scams, or circumvention of platform protections. Reviews must be 
              honest and based on actual experience. You may report listings, reviews, or users for policy violations; 
              EX3D will review and may remove content or restrict accounts to protect the community.
            </p>
          </section>

          {/* Section 15 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Subscriptions & Promotions</h2>
            <p className="text-gray-700 mb-4">
              EX3D offers an optional <strong>Maker Subscription for $10/month</strong> that reduces the platform fee 
              from 12% → 6%. Subscriptions auto‑renew monthly until canceled. You can cancel anytime; cancellation takes 
              effect at the end of the current billing period. Subscription fees are non‑refundable once the period starts.
            </p>
            <p className="text-gray-700">
              Other promotions or tiers may be offered; details will be shown at purchase and on the Fees Page.
            </p>
          </section>

          {/* Section 16 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Disclaimers; Limitation of Liability</h2>
            <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300">
              <p className="text-gray-900 mb-4">
                The Services are provided <strong>as‑is</strong> and <strong>as‑available</strong>. To the fullest extent 
                permitted by law, EX3D disclaims warranties of merchantability, fitness for a particular purpose, and non‑infringement.
              </p>
              <p className="text-gray-900 font-semibold">
                <strong>Liability cap:</strong> EX3D's aggregate liability for any claim is limited to the greater of 
                (a) the amounts you paid to EX3D for the order giving rise to the claim or (b) USD $100. EX3D is not liable 
                for indirect, incidental, special, consequential, or punitive damages.
              </p>
            </div>
          </section>

          {/* Section 17 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Indemnification</h2>
            <p className="text-gray-700">
              You agree to defend, indemnify, and hold harmless EX3D from claims arising out of your content, your use 
              of the Services, or your violation of these Terms or law.
            </p>
          </section>

          {/* Section 18 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">18. Governing Law; Venue</h2>
            <p className="text-gray-700">
              Arizona law governs these Terms, without regard to conflict of laws. Exclusive venue lies in the state 
              courts of Yavapai County, Arizona or the federal court for the District of Arizona.
            </p>
          </section>

          {/* Section 19 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">19. Changes to the Terms</h2>
            <p className="text-gray-700">
              We may update these Terms. Material changes will be noticed by email and/or site notice at least 30 days 
              before they take effect, unless required sooner by law or security needs.
            </p>
          </section>

          {/* Section 20 */}
          <section className="mb-12 bg-slate-50 p-8 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Mail className="w-6 h-6 text-blue-600" />
              20. Contact
            </h2>
            <p className="text-gray-700 mb-4">
              Questions about these Terms of Service?
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> <a href="mailto:ex3dprint@gmail.com" className="text-blue-600 hover:underline">ex3dprint@gmail.com</a></p>
              <p><strong>Address:</strong> 3700 Willow Creek Rd, Prescott, AZ 86301, USA</p>
            </div>
          </section>

          <div className="text-center py-8 border-t border-gray-200">
            <p className="text-gray-600">
              These Terms of Service are effective as of October 17, 2025 and govern your use of the EX3D Prints platform.
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <Link to={createPageUrl("Privacy")} className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              <Link to={createPageUrl("Contact")} className="text-blue-600 hover:underline">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}