import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default function ReviewList({ reviews, showProductName = false }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No reviews yet. Be the first to leave a review!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Verified Purchase
                  </Badge>
                </div>
                {review.title && (
                  <h4 className="font-semibold text-gray-900 mb-1">{review.title}</h4>
                )}
                {showProductName && review.product_name && (
                  <p className="text-sm text-gray-600 mb-2">Product: {review.product_name}</p>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(review.created_date).toLocaleDateString()}
              </div>
            </div>
            {review.comment && (
              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
            )}
            <div className="mt-3 text-sm text-gray-500">
              by {review.customer_name || 'Anonymous'}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}