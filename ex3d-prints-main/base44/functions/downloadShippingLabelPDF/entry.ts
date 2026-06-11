import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { labelData } = await req.json();
    
    if (!labelData) {
      return Response.json({ error: 'Missing label data' }, { status: 400 });
    }

    // Create PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIPPING LABEL', 105, 20, { align: 'center' });
    
    // Carrier and Tracking
    doc.setFontSize(12);
    doc.text(`${labelData.carrier} - ${labelData.packageType} - ${labelData.speed}`, 105, 30, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Tracking: ${labelData.trackingNumber}`, 105, 40, { align: 'center' });
    
    // Barcode representation (simplified)
    doc.setFontSize(24);
    doc.setFont('courier', 'normal');
    doc.text(labelData.barcode, 105, 55, { align: 'center' });
    
    // From Address
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', 20, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(labelData.from.name, 20, 82);
    doc.text(labelData.from.street, 20, 88);
    doc.text(`${labelData.from.city}, ${labelData.from.state} ${labelData.from.zip}`, 20, 94);
    doc.text(labelData.from.country, 20, 100);
    if (labelData.from.phone) {
      doc.text(`Phone: ${labelData.from.phone}`, 20, 106);
    }
    
    // To Address (larger and prominent)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SHIP TO:', 20, 130);
    doc.setFontSize(16);
    doc.text(labelData.to.name, 20, 140);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(labelData.to.street, 20, 150);
    doc.text(`${labelData.to.city}, ${labelData.to.state} ${labelData.to.zip}`, 20, 160);
    doc.text(labelData.to.country, 20, 170);
    if (labelData.to.phone) {
      doc.text(`Phone: ${labelData.to.phone}`, 20, 180);
    }
    
    // Package Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Weight: ${labelData.weight} lbs`, 20, 200);
    doc.text(`Order: ${labelData.orderId.slice(-8)}`, 20, 206);
    doc.text(`Date: ${new Date(labelData.createdAt).toLocaleDateString()}`, 20, 212);
    
    // Footer
    doc.setFontSize(8);
    doc.text('EXpressPrints - www.expressprints.com', 105, 280, { align: 'center' });
    doc.text(`Label Cost: $${labelData.cost.toFixed(2)}`, 105, 285, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=shipping-label-${labelData.trackingNumber}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    }, { status: 500 });
  }
});