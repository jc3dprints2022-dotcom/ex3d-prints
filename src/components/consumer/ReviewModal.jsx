import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function ReviewModal({ isOpen, onClose, order, reviewType, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      if (reviewType === 'product' && order.items && order.items.length > 0) {
        // Create a review for each product in the order
        for (const item of order.items) {
          if (!item.product_id) continue; // Skip custom prints without product_id
          
          const reviewData = {
            order_id: order.id,
            customer_id: order.customer_id,
            product_id: item.product_id,
            designer_id: item.designer_id,
            review_type: 'product',
            rating,
            title,
            comment,
            verified_purchase: true
          };

          // Create the review
          await base44.entities.Review.create(reviewData);
          
          // Update product rating
          try {
            const product = await base44.entities.Product.get(item.product_id);
            
            if (product) {
              // Get all reviews for this product
              const allReviews = await base44.entities.Review.list();
              const productReviews = allReviews.filter(r => 
                r.product_id === item.product_id && r.review_type === 'product'
              );
              
              // Add the new review to calculate average
              const updatedReviews = [...productReviews, { rating }];
              const newAvgRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
              
              // Update product with new rating and count
              await base44.entities.Product.update(item.product_id, {
                rating: newAvgRating,
                review_count: updatedReviews.length
              });
            }
          } catch (productError) {
            console.log("Product not found, skipping product rating update:", productError);
          }
        }
      } else if (reviewType === 'maker') {
        const reviewData = {
          order_id: order.id,
          customer_id: order.customer_id,
          maker_id: order.maker_id,
          review_type: 'maker',
          rating,
          title,
          comment,
          verified_purchase: true
        };
        
        await base44.entities.Review.create(reviewData);
      }
      
      toast({ title: "Review submitted successfully!" });
      onSuccess();
      onClose();
      
      // Reset form
      setRating(0);
      setTitle("");
      setComment("");
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast({ title: "Failed to submit review", variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reviewType === 'product' ? 'Review Design' : 'Review Maker'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label className="mb-2 block">Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum up your experience"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your experience..."
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}