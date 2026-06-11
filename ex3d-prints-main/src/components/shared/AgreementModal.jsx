import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

const MAKER_AGREEMENT = `EX3D PRINTS — MAKER AGREEMENT
Effective Date: May 8, 2026

This Maker Agreement governs participation as a Maker on the EX3D platform.

1. INDEPENDENT CONTRACTOR STATUS
Maker operates as an independent contractor. Nothing in this Agreement creates employment, partnership, franchise, agency, or joint venture. Maker is solely responsible for taxes, insurance, licensing, equipment, labor, and regulatory compliance.

2. MANUFACTURING RESPONSIBILITIES
Maker agrees to manufacture products according to provided specifications, use approved materials, follow quality standards, meet delivery requirements, and maintain safe operations. Maker may not alter designs, materials, or specifications without authorization.

3. INTELLECTUAL PROPERTY RESTRICTIONS
Maker may only use files for authorized EX3D orders. Maker may not redistribute files, copy files, reuse designs, sell unauthorized reproductions, reverse engineer designs, or retain files beyond operational necessity. All platform files are confidential. Unauthorized use may result in immediate termination, financial liability, legal action, and permanent bans.

4. CONFIDENTIALITY
Maker agrees to protect confidential information including designs, pricing, customer information, manufacturing systems, routing systems, and internal operations. Confidentiality obligations survive termination.

5. QUALITY STANDARDS
Maker agrees to maintain timely fulfillment, acceptable defect rates, accurate manufacturing, safe packaging, and honest communication. EX3D may establish minimum performance thresholds. Repeated failures may result in suspension or termination.

6. PRODUCT LIABILITY
Maker is solely responsible for manufacturing defects, unsafe manufacturing, material misuse, equipment failures, and regulatory noncompliance. Maker agrees to indemnify EX3D for claims arising from Maker operations or manufacturing. EX3D is not responsible for Maker workplace safety.

7. NON-CIRCUMVENTION
Maker may not directly solicit or fulfill orders outside the platform for customers introduced through EX3D for 24 months after last interaction.

8. PAYMENTS
Maker payouts are subject to platform fees, subscription plans, chargebacks, refunds, fraud reviews, and quality investigations. EX3D may temporarily withhold payouts during investigations.

9. INSURANCE
EX3D may require Makers to maintain insurance coverage including general liability, product liability, and commercial coverage upon notice.

10. TERMINATION
Either party may terminate participation at any time. EX3D may immediately terminate access for IP violations, quality failures, fraud, unsafe manufacturing, confidentiality breaches, or circumvention. Sections intended to survive termination remain enforceable.`;

const DESIGNER_AGREEMENT = `EX3D PRINTS — DESIGNER AGREEMENT
Effective Date: May 8, 2026

This Designer Agreement governs participation as a Designer on the EX3D platform.

1. OWNERSHIP
Designer retains ownership of uploaded intellectual property. Nothing in this Agreement transfers ownership to EX3D.

2. PLATFORM LICENSE
Designer grants EX3D a worldwide, sublicensable, transferable license to host, display, market, manufacture, fulfill, and distribute physical products derived from uploaded designs through the EX3D platform. This license includes manufacturing derivatives including sliced files, G-code, supports, orientations, and technical manufacturing modifications.

3. EXCLUSIVITY
Unless otherwise agreed in writing, exclusivity applies only to physical fulfillment through the EX3D platform. Designer retains rights to sell digital files elsewhere, license designs elsewhere, and use designs commercially outside EX3D, provided such activity does not violate separate written agreements.

4. ROYALTIES
Designer royalties shall be determined by platform policies or written agreements. EX3D may deduct refunds, chargebacks, fraudulent transactions, and taxes where legally required. Minimum payout thresholds may apply.

5. DESIGNER REPRESENTATIONS
Designer represents and warrants that Designer owns or controls all rights necessary, content does not infringe copyrights, trademarks, patents, or other rights, and content complies with laws and regulations. Designer accepts full legal responsibility for uploaded content.

6. INDEMNIFICATION
Designer agrees to defend, indemnify, and hold harmless EX3D from claims arising from uploaded content, IP infringement, trademark disputes, patent disputes, product claims tied to designs, and violations of law, including attorney fees and litigation costs.

7. DESIGN REMOVAL & REVOCATION
Designers may request removal of designs. However, existing paid orders may still be fulfilled, pending disputes may delay removal, and EX3D may retain archival copies for compliance, auditing, and legal obligations. Future sales shall stop after removal processing is completed.

8. FILE PROTECTION
EX3D may implement watermarking, encrypted delivery, access restrictions, and technical protections. Designers acknowledge no system is completely secure. EX3D does not guarantee absolute prevention of infringement or unauthorized copying.

9. ENFORCEMENT RIGHTS
EX3D may remove infringing content, suspend accounts, cooperate with investigations, preserve evidence, and respond to legal requests. EX3D is not obligated to pursue legal enforcement on behalf of Designers.

10. TERMINATION
Either party may terminate participation at any time. Sections intended to survive termination remain enforceable, including indemnification, confidentiality, existing order fulfillment rights, and payment obligations.`;

export default function AgreementModal({ type, open, onClose }) {
  const title = type === 'maker' ? 'Maker Agreement' : 'Designer Agreement';
  const content = type === 'maker' ? MAKER_AGREEMENT : DESIGNER_AGREEMENT;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">EX3D Prints — {title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-500">Effective Date: May 8, 2026</p>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-2">
          <div className="pr-4">
            {content.split('\n\n').map((paragraph, idx) => {
              const isHeader = /^\d+\.\s+[A-Z]/.test(paragraph) || /^EX3D PRINTS/.test(paragraph);
              return (
                <p key={idx} className={`mb-3 text-sm leading-relaxed ${isHeader ? 'font-bold text-gray-900 mt-4' : 'text-gray-700'}`}>
                  {paragraph}
                </p>
              );
            })}
          </div>
        </ScrollArea>
        <div className="flex-shrink-0 pt-4 border-t">
          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}