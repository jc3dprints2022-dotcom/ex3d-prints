
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// This component is now designed to be a modal for a single request,
// receiving its state (open/closed, current request) from a parent component.
export default function CustomRequestDetailModal({ isOpen, onClose, request, onUpdate }) {
  const [quotePrice, setQuotePrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [printTimeHours, setPrintTimeHours] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });
  const [declineReason, setDeclineReason] = useState('');

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  const [loading, setLoading] = useState(false); // For quote submission
  const [isDecliningLoading, setIsDecliningLoading] = useState(false); // For decline submission

  const { toast } = useToast();

  // Effect to reset form states when a new request is loaded or modal opens/closes
  useEffect(() => {
    if (request && isOpen) {
      setQuotePrice(request.quoted_price || '');
      setAdminNotes(request.admin_notes || '');
      setPrintTimeHours(request.print_time_hours || '');
      setWeightGrams(request.weight_grams || '');
      setDimensions(request.dimensions || { length: '', width: '', height: '' });
      setDeclineReason(''); // Clear decline reason for new view

      // Show the relevant form if the request is already in that state
      setShowQuoteForm(request.status === 'quoted' || request.status === 'pending');
      setShowDeclineForm(request.status === 'declined');

      setLoading(false);
      setIsDecliningLoading(false);
    } else if (!isOpen) {
      // Reset all states when modal closes
      setQuotePrice('');
      setAdminNotes('');
      setPrintTimeHours('');
      setWeightGrams('');
      setDimensions({ length: '', width: '', height: '' });
      setDeclineReason('');
      setShowQuoteForm(false);
      setShowDeclineForm(false);
      setLoading(false);
      setIsDecliningLoading(false);
    }
  }, [request, isOpen]);
  
  const handleProvideQuote = async () => {
    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      toast({ title: "Please enter a valid quote price", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Format dimensions properly
      let formattedDimensions = null;
      if (dimensions && (dimensions.length || dimensions.width || dimensions.height)) {
        // Convert to number, default to 0 if not a valid number (e.g., empty string)
        const parsedLength = parseFloat(dimensions.length);
        const parsedWidth = parseFloat(dimensions.width);
        const parsedHeight = parseFloat(dimensions.height);

        // Only include a dimension if it's a valid number and greater than 0, or 0 if explicitly set
        // The requirement is that we store numbers, not empty strings for the object.
        formattedDimensions = {
            length: !isNaN(parsedLength) ? parsedLength : null,
            width: !isNaN(parsedWidth) ? parsedWidth : null,
            height: !isNaN(parsedHeight) ? parsedHeight : null
        };

        // If all sub-dimensions are null after parsing, set formattedDimensions to null
        if (formattedDimensions.length === null && formattedDimensions.width === null && formattedDimensions.height === null) {
            formattedDimensions = null;
        }
      }

      await base44.entities.CustomPrintRequest.update(request.id, {
        status: 'quoted',
        quoted_price: parseFloat(quotePrice),
        admin_notes: adminNotes,
        print_time_hours: printTimeHours ? parseFloat(printTimeHours) : null,
        weight_grams: weightGrams ? parseFloat(weightGrams) : null,
        dimensions: formattedDimensions
      });

      // Send email to customer
      const customer = (await base44.entities.User.list()).find(u => u.id === request.customer_id);
      if (customer) {
         await base44.functions.invoke('sendEmail', {
            to: customer.email,
            subject: "You've Received a Quote for Your Custom Print!",
            body: `Hi ${customer.full_name},

A quote is ready for your custom print request: "${request.title}".

Quote Amount: $${parseFloat(quotePrice).toFixed(2)}
Notes from our team: ${adminNotes || 'N/A'}

Please visit your dashboard to review and accept the quote to proceed with the order.

Thank you,
The EX3D Prints Team`
        });
      }

      toast({ title: "Quote sent successfully!" });
      onUpdate(); // Notify parent to refresh list/data
      onClose();  // Close the modal
    } catch (error) {
      toast({ title: "Failed to send quote", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDeclineQuote = async () => {
    if (!declineReason) {
      toast({ title: "Please provide a reason for declining", variant: "destructive" });
      return;
    }
    
    setIsDecliningLoading(true);
    try {
      await base44.entities.CustomPrintRequest.update(request.id, {
        status: 'declined',
        admin_notes: `Declined: ${declineReason}`,
      });

      const customer = (await base44.entities.User.list()).find(u => u.id === request.customer_id);
      if (customer) {
        await base44.functions.invoke('sendEmail', {
          to: customer.email,
          subject: "Update on Your Custom Print Request",
          body: `Hi ${customer.full_name},

We're writing to provide an update on your custom print request: "${request.title}".

Unfortunately, we are unable to proceed with this request at this time.
Reason: ${declineReason}

We apologize for any inconvenience. Please feel free to submit another request or browse our marketplace.

Thank you,
The EX3D Prints Team`
        });
      }

      toast({ title: "Request Declined" });
      onUpdate(); // Notify parent to refresh list/data
      onClose();  // Close the modal
    } catch (error) {
      toast({ title: "Failed to decline request", variant: "destructive" });
    }
    setIsDecliningLoading(false);
  };
  
  if (!request) return null; // Or handle empty request gracefully if modal can be open without a request

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Request Details: {request?.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div className="col-span-2 space-y-2">
                    <p><strong>Status:</strong> <Badge>{request.status}</Badge></p>
                    <p><strong>Description:</strong> {request.description}</p>
                </div>
                
                <div className="space-y-1">
                    <strong>Material:</strong><p>{request.material_preference}</p>
                </div>
                    <div className="space-y-1">
                    <strong>Color:</strong><p>{request.color_preference}</p>
                </div>
                <div className="space-y-1">
                    <strong>Quantity:</strong><p>{request.quantity}</p>
                </div>
                <div className="space-y-1">
                    <strong>Timeline:</strong><p>{request.timeline}</p>
                </div>
                    <div className="space-y-1">
                    <strong>Budget:</strong><p>{request.budget_range || 'N/A'}</p>
                </div>
                    <div className="space-y-1">
                    <strong>Requested Dimensions:</strong><p>{request.dimensions ? `${request.dimensions.length || 'N/A'}x${request.dimensions.width || 'N/A'}x${request.dimensions.height || 'N/A'}` : 'N/A'}</p>
                </div>
                <div className="col-span-2 space-y-2">
                    <strong>Special Requirements:</strong><p>{request.special_requirements || 'N/A'}</p>
                </div>
                
                <div className="col-span-2">
                    <h4 className="font-semibold mb-2">Uploaded Files</h4>
                    {request.files && request.files.length > 0 ? (
                        request.files.map((file, idx) => (
                            <a key={idx} href={file} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                <Download className="w-4 h-4" />
                                <span>{file.split('/').pop()}</span>
                            </a>
                        ))
                    ) : (
                        <p>No files uploaded.</p>
                    )}
                </div>

                {request.status === 'pending' && (
                  <div className="col-span-2 mt-4 space-x-4">
                    {!showDeclineForm && (
                        <Button onClick={() => setShowQuoteForm(true)} disabled={showQuoteForm}>Provide Quote</Button>
                    )}
                    {!showQuoteForm && (
                        <Button variant="destructive" onClick={() => setShowDeclineForm(true)} disabled={showDeclineForm}>Decline Request</Button>
                    )}
                  </div>
                )}
                
                {(showQuoteForm || request.status === 'quoted') && (
                    <div className="col-span-2 mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-semibold">Quote Details</h3>
                        <div>
                          <Label htmlFor="quotePrice">Quote Price ($)</Label>
                          <Input 
                              id="quotePrice" 
                              type="number"
                              value={quotePrice}
                              onChange={(e) => setQuotePrice(e.target.value)}
                              placeholder="e.g., 49.99"
                              disabled={request.status !== 'pending'}
                          />
                        </div>
                        <div>
                          <Label htmlFor="printTimeHours">Estimated Print Time (Hours)</Label>
                          <Input
                            id="printTimeHours"
                            type="number"
                            value={printTimeHours}
                            onChange={(e) => setPrintTimeHours(e.target.value)}
                            placeholder="e.g., 10.5"
                            disabled={request.status !== 'pending'}
                          />
                        </div>
                        <div>
                          <Label htmlFor="weightGrams">Estimated Weight (Grams)</Label>
                          <Input
                            id="weightGrams"
                            type="number"
                            value={weightGrams}
                            onChange={(e) => setWeightGrams(e.target.value)}
                            placeholder="e.g., 250"
                            disabled={request.status !== 'pending'}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="dimensionsLength">Length (mm)</Label>
                                <Input
                                    id="dimensionsLength"
                                    type="number"
                                    value={dimensions.length || ''}
                                    onChange={(e) => setDimensions({ ...dimensions, length: e.target.value })}
                                    placeholder="e.g., 50"
                                    disabled={request.status !== 'pending'}
                                />
                            </div>
                            <div>
                                <Label htmlFor="dimensionsWidth">Width (mm)</Label>
                                <Input
                                    id="dimensionsWidth"
                                    type="number"
                                    value={dimensions.width || ''}
                                    onChange={(e) => setDimensions({ ...dimensions, width: e.target.value })}
                                    placeholder="e.g., 30"
                                    disabled={request.status !== 'pending'}
                                />
                            </div>
                            <div>
                                <Label htmlFor="dimensionsHeight">Height (mm)</Label>
                                <Input
                                    id="dimensionsHeight"
                                    type="number"
                                    value={dimensions.height || ''}
                                    onChange={(e) => setDimensions({ ...dimensions, height: e.target.value })}
                                    placeholder="e.g., 80"
                                    disabled={request.status !== 'pending'}
                                />
                            </div>
                        </div>
                        <div>
                          <Label htmlFor="adminNotes">Notes for Customer (Optional)</Label>
                          <Textarea 
                              id="adminNotes"
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="e.g., This price includes high-quality resin material."
                              disabled={request.status !== 'pending'}
                          />
                        </div>
                        {request.status === 'pending' && (
                            <Button onClick={handleProvideQuote} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Quote
                            </Button>
                        )}
                        {request.status === 'quoted' && (
                            <p className="text-sm text-gray-600">Quote sent: ${request.quoted_price?.toFixed(2)}</p>
                        )}
                    </div>
                )}
                
                {(showDeclineForm || request.status === 'declined') && (
                  <div className="col-span-2 mt-4 space-y-4 p-4 bg-red-50 rounded-lg">
                    <h3 className="text-lg font-semibold">Decline Request</h3>
                    <div>
                       <Label htmlFor="declineReason">Reason</Label>
                       <Select onValueChange={setDeclineReason} value={declineReason || ''} disabled={request.status !== 'pending'}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Inappropriate content">Inappropriate content</SelectItem>
                              <SelectItem value="Violates copyright">Violates copyright</SelectItem>
                              <SelectItem value="Model is not printable">Model is not printable</SelectItem>
                              <SelectItem value="Outside our capabilities">Outside our capabilities</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    {request.status === 'pending' && (
                        <Button variant="destructive" onClick={handleDeclineQuote} disabled={isDecliningLoading}>
                            {isDecliningLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Decline
                        </Button>
                    )}
                    {request.status === 'declined' && <p>Reason: {request.admin_notes}</p>}
                  </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
