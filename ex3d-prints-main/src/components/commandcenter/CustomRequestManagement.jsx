
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Inbox, FileDown, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CustomRequestManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null); // This will hold the request object
  const [showQuoteDialog, setShowQuoteDialog] = useState(false); // Controls the new detailed quote dialog
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false); // Controls delete confirmation dialog
  const [requestToDelete, setRequestToDelete] = useState(null); // Holds the request to be deleted

  // New state for the detailed quote form
  const [quoteForm, setQuoteForm] = useState({
    quoted_price: '',
    print_time_hours: '',
    weight_grams: '',
    dimensions: { length: '', width: '', height: '' },
    admin_notes: ''
  });

  const [submitting, setSubmitting] = useState(false); // For quote submission or decline action
  const [deleting, setDeleting] = useState(false); // For delete operation
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const allRequests = await base44.entities.CustomPrintRequest.list();
      setRequests(allRequests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      toast({ title: "Failed to load custom requests", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // New function to handle reviewing a request and opening the detailed quote dialog
  const handleReviewRequest = (request) => {
    setSelectedRequest(request);
    setQuoteForm({
      quoted_price: request.quoted_price || '',
      print_time_hours: request.print_time_hours || '', // Populate if already quoted
      weight_grams: request.weight_grams || '', // Populate if already quoted
      dimensions: request.dimensions || { length: '', width: '', height: '' }, // Populate if already quoted
      admin_notes: request.admin_notes || ''
    });
    setShowQuoteDialog(true);
  };

  // Replaced handleSendQuote with handleSubmitQuote as per outline
  const handleSubmitQuote = async () => {
    if (!selectedRequest) return;

    if (!quoteForm.quoted_price || parseFloat(quoteForm.quoted_price) <= 0) {
      toast({ title: "Please enter a valid quoted price", variant: "destructive" });
      return;
    }

    if (!quoteForm.print_time_hours || parseFloat(quoteForm.print_time_hours) <= 0) {
      toast({ title: "Please enter estimated print time", variant: "destructive" });
      return;
    }

    if (!quoteForm.weight_grams || parseFloat(quoteForm.weight_grams) <= 0) {
      toast({ title: "Please enter estimated weight", variant: "destructive" });
      return;
    }

    if (
      !quoteForm.dimensions.length || parseFloat(quoteForm.dimensions.length) <= 0 ||
      !quoteForm.dimensions.width || parseFloat(quoteForm.dimensions.width) <= 0 ||
      !quoteForm.dimensions.height || parseFloat(quoteForm.dimensions.height) <= 0
    ) {
      toast({ title: "Please enter all dimensions with positive values", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.CustomPrintRequest.update(selectedRequest.id, {
        status: 'quoted',
        quoted_price: parseFloat(quoteForm.quoted_price),
        print_time_hours: parseFloat(quoteForm.print_time_hours),
        weight_grams: parseFloat(quoteForm.weight_grams),
        dimensions: {
          length: parseFloat(quoteForm.dimensions.length),
          width: parseFloat(quoteForm.dimensions.width),
          height: parseFloat(quoteForm.dimensions.height)
        },
        admin_notes: quoteForm.admin_notes
      });

      // Send email to customer
      try {
        const customer = await base44.entities.User.get(selectedRequest.customer_id);

        if (customer && customer.email) {
          await base44.functions.invoke('sendEmail', {
            to: customer.email,
            subject: 'Quote Ready for Your Custom Print Request - EX3D Prints',
            body: `Hi ${customer.full_name || customer.email},

Great news! We've reviewed your custom print request "${selectedRequest.title}" and prepared a quote for you.

Quote Details:
- Price: $${parseFloat(quoteForm.quoted_price).toFixed(2)}
- Estimated Print Time: ${parseFloat(quoteForm.print_time_hours).toFixed(1)} hours
- Weight: ${parseFloat(quoteForm.weight_grams)}g
- Dimensions: ${parseFloat(quoteForm.dimensions.length)} × ${parseFloat(quoteForm.dimensions.width)} × ${parseFloat(quoteForm.dimensions.height)} mm

${quoteForm.admin_notes ? `\nAdditional Notes:\n${quoteForm.admin_notes}` : ''}

To accept this quote and proceed with your order, please visit your dashboard and go to the Custom Requests section.

Best regards,
The EX3D Team`
          });
          toast({ title: "Quote sent successfully!", description: "Customer has been notified via email and can now accept the quote from their dashboard." });
        } else {
          toast({ title: "Quote saved, but email notification failed", description: "Customer email not found or user doesn't exist.", variant: "destructive" });
        }
      } catch (emailError) {
        console.error("Failed to send quote email:", emailError);
        toast({ title: "Quote saved, but email notification failed", description: "There was an error sending the email notification.", variant: "destructive" });
      }

      setShowQuoteDialog(false);
      setSelectedRequest(null);
      loadRequests(); // Reload requests to update status
    } catch (error) {
      console.error("Failed to submit quote:", error);
      toast({ title: "Failed to submit quote", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  // Original handleDeclineRequest - Now callable from the list item
  const handleDeclineRequest = async (request) => {
    const reason = prompt("Please provide a reason for declining this request (will be sent to user):");
    if (!reason) return;
    setSubmitting(true);
    try {
      await base44.entities.CustomPrintRequest.update(request.id, {
        status: 'declined',
        admin_notes: `Declined: ${reason}`
      });

      const allUsers = await base44.entities.User.list();
      const customer = allUsers.find(u => u.id === request.customer_id);

      if (customer && customer.email) {
        try {
          await base44.functions.invoke('sendEmail', {
            to: customer.email,
            subject: 'Update on Your Custom Print Request',
            body: `Hi ${customer.full_name},

Regarding your custom print request "${request.title}", we are unable to fulfill it at this time.

Reason: ${reason}

We apologize for any inconvenience.

Best regards,
The EX3D Team`
          });
        } catch (emailError) {
          console.error("Failed to send decline email:", emailError);
          toast({ title: "Request declined, but email notification failed", description: "There was an error sending the decline email.", variant: "destructive" });
        }
      } else {
        toast({ title: "Request declined", description: "Customer email not found for notification." });
      }

      toast({ title: "Request declined successfully" });
      loadRequests();
    } catch (error) {
      toast({ title: "Failed to decline request", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  // New functions for deleting a request
  const confirmDeleteRequest = (request) => {
    setRequestToDelete(request);
    setShowDeleteConfirmDialog(true);
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;
    setDeleting(true);
    try {
      await base44.entities.CustomPrintRequest.delete(requestToDelete.id);
      toast({ title: "Request deleted successfully" });
      setShowDeleteConfirmDialog(false);
      setRequestToDelete(null);
      loadRequests();
    } catch (error) {
      console.error("Failed to delete request:", error);
      toast({ title: "Failed to delete request", description: error.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'accepted':
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'quoted':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'declined':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: // pending
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;
  }

  // Filter requests for display based on status (e.g., only pending in the main list)
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const otherRequests = requests.filter(r => r.status !== 'pending');


  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Pending Custom Print Requests</CardTitle>
          <p className="text-slate-400 text-sm">Review, quote, or decline new custom print requests from users.</p>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <Inbox className="w-12 h-12 mx-auto mb-4" />
              <p>No pending custom requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-slate-900 p-4 rounded-lg border border-cyan-500/20 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{req.title}</h3>
                    <p className="text-gray-400 text-sm">Requested on: {new Date(req.created_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadgeColor(req.status)}>{req.status}</Badge>
                    <Button
                      onClick={() => handleReviewRequest(req)}
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Review & Quote
                    </Button>
                    <Button
                      onClick={() => handleDeclineRequest(req)}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={submitting}
                    >
                      Decline
                    </Button>
                    <Button
                      onClick={() => confirmDeleteRequest(req)}
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display other statuses */}
      {otherRequests.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Other Requests (Quoted, Accepted, Declined)</CardTitle>
            <p className="text-slate-400 text-sm">Review existing quotes, accepted, or declined requests.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {otherRequests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((req) => (
                 <div key={req.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                 <div>
                   <h3 className="text-lg font-semibold text-white">{req.title}</h3>
                   <p className="text-gray-400 text-sm">Requested on: {new Date(req.created_date).toLocaleDateString()}</p>
                   {req.status === 'quoted' && req.quoted_price && (
                     <p className="text-blue-400 text-sm">Quoted: ${parseFloat(req.quoted_price).toFixed(2)}</p>
                   )}
                 </div>
                 <div className="flex items-center gap-2">
                   <Badge className={getStatusBadgeColor(req.status)}>{req.status}</Badge>
                   <Button
                       onClick={() => handleReviewRequest(req)} // Re-use handleReviewRequest to populate details
                       variant="outline"
                       className="text-white border-slate-600 hover:bg-slate-700"
                   >
                       View Details
                   </Button>
                   <Button
                     onClick={() => confirmDeleteRequest(req)}
                     variant="ghost"
                     className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                   >
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Quote Dialog - as per outline */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">
                {selectedRequest?.status === 'pending' ? 'Submit Quote for:' : 'View Request Details:'} {selectedRequest?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Customer Request Details */}
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <h4 className="font-semibold mb-2 text-cyan-400">Customer Request Details</h4>
                <p className="text-sm text-gray-300 mb-2">{selectedRequest.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <div><span className="font-medium text-white">Material Preference:</span> {selectedRequest.material_preference || 'N/A'}</div>
                  <div><span className="font-medium text-white">Color Preference:</span> {selectedRequest.color_preference || 'N/A'}</div>
                  <div><span className="font-medium text-white">Quantity:</span> {selectedRequest.quantity}</div>
                  <div><span className="font-medium text-white">Timeline:</span> {selectedRequest.timeline || 'N/A'}</div>
                  {selectedRequest.budget_range && (
                    <div className="col-span-2"><span className="font-medium text-white">Budget Range:</span> {selectedRequest.budget_range}</div>
                  )}
                  {selectedRequest.is_class_project && (
                    <div className="col-span-2">
                      <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                        🎓 CLASS PROJECT - 25% OFF ELIGIBLE
                      </span>
                    </div>
                  )}
                  {selectedRequest.special_requirements && (
                    <div className="col-span-2"><span className="font-medium text-white">Special Requirements:</span> {selectedRequest.special_requirements}</div>
                  )}
                </div>

                {selectedRequest.files && selectedRequest.files.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-sm mb-1 text-white">Attached Files:</p>
                    {selectedRequest.files.map((file, idx) => (
                      <a key={idx} href={file} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-400 text-sm hover:underline">
                        <FileDown className="w-4 h-4" /> File {idx + 1}
                      </a>
                    ))}
                  </div>
                )}

                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-sm mb-1 text-white">Reference Images:</p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {selectedRequest.images.map((img, idx) => (
                        <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-24 object-cover rounded border border-cyan-500/30 hover:border-cyan-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quote Form */}
              <div className="space-y-4">
                <h4 className="font-semibold mb-2 text-cyan-400">Quote Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quoted_price" className="text-white">Quoted Price (USD) *</Label>
                    <Input
                      id="quoted_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quoteForm.quoted_price}
                      onChange={(e) => setQuoteForm({...quoteForm, quoted_price: e.target.value})}
                      placeholder="e.g., 25.50"
                      className="bg-slate-900 border-cyan-500/30 text-white"
                      required
                      readOnly={selectedRequest.status !== 'pending'} // Make read-only if not pending
                    />
                  </div>

                  <div>
                    <Label htmlFor="print_time" className="text-white">Est. Print Time (hours) *</Label>
                    <Input
                      id="print_time"
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={quoteForm.print_time_hours}
                      onChange={(e) => setQuoteForm({...quoteForm, print_time_hours: e.target.value})}
                      placeholder="e.g., 5.3"
                      className="bg-slate-900 border-cyan-500/30 text-white"
                      required
                      readOnly={selectedRequest.status !== 'pending'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weight" className="text-white">Est. Weight (grams) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="1"
                      min="1"
                      value={quoteForm.weight_grams}
                      onChange={(e) => setQuoteForm({...quoteForm, weight_grams: e.target.value})}
                      placeholder="e.g., 120"
                      className="bg-slate-900 border-cyan-500/30 text-white"
                      required
                      readOnly={selectedRequest.status !== 'pending'}
                    />
                  </div>

                  <div>
                    <Label className="text-white">Dimensions (mm) *</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        placeholder="L"
                        value={quoteForm.dimensions.length}
                        onChange={(e) => setQuoteForm({...quoteForm, dimensions: {...quoteForm.dimensions, length: e.target.value}})}
                        className="bg-slate-900 border-cyan-500/30 text-white"
                        required
                        readOnly={selectedRequest.status !== 'pending'}
                      />
                      <Input
                        type="number"
                        placeholder="W"
                        value={quoteForm.dimensions.width}
                        onChange={(e) => setQuoteForm({...quoteForm, dimensions: {...quoteForm.dimensions, width: e.target.value}})}
                        className="bg-slate-900 border-cyan-500/30 text-white"
                        required
                        readOnly={selectedRequest.status !== 'pending'}
                      />
                      <Input
                        type="number"
                        placeholder="H"
                        value={quoteForm.dimensions.height}
                        onChange={(e) => setQuoteForm({...quoteForm, dimensions: {...quoteForm.dimensions, height: e.target.value}})}
                        className="bg-slate-900 border-cyan-500/30 text-white"
                        required
                        readOnly={selectedRequest.status !== 'pending'}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="admin_notes" className="text-white">Notes for Customer (Optional)</Label>
                  <Textarea
                    id="admin_notes"
                    value={quoteForm.admin_notes}
                    onChange={(e) => setQuoteForm({...quoteForm, admin_notes: e.target.value})}
                    placeholder="Any additional information about the quote, timeline, or special considerations..."
                    rows={4}
                    className="bg-slate-900 border-cyan-500/30 text-white"
                    readOnly={selectedRequest.status !== 'pending'}
                  />
                </div>

                {selectedRequest.status !== 'pending' && (
                  <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-500/30">
                    <p className="text-sm text-blue-300">
                      <strong>Note:</strong> This request has been {selectedRequest.status}.
                      {selectedRequest.status === 'quoted' && ' The customer can now accept this quote from their dashboard to create an order.'}
                      {selectedRequest.status === 'accepted' && ' An order has been created from this request and assigned to a maker.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center mt-6">
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)} className="text-white border-slate-600 hover:bg-slate-700">Close</Button>
            {selectedRequest?.status === 'pending' && (
                <Button onClick={handleSubmitQuote} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Send Quote to Customer
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="bg-slate-800 border-red-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-400">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to delete the request for "{requestToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)} disabled={deleting} className="text-white border-slate-600 hover:bg-slate-700">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRequest} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2"/>}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
