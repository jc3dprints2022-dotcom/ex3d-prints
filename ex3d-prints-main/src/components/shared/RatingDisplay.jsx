import React from "react";
import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function RatingDisplay({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl font-bold text-gray-300 mb-2">—</div>
        <div className="text-gray-500">No ratings yet</div>
      </div>
    );
  }

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  
  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: (reviews.filter(r => r.rating === stars).length / reviews.length) * 100
  }));

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Overall Rating */}
      <div className="text-center">
        <div className="text-5xl font-bold text-gray-900 mb-2">
          {avgRating.toFixed(1)}
        </div>
        <div className="flex justify-center mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-6 h-6 ${
                star <= Math.round(avgRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <div className="text-gray-600">
          Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="space-y-2">
        {distribution.map(({ stars, count, percentage }) => (
          <div key={stars} className="flex items-center gap-3">
            <div className="flex items-center gap-1 w-12">
              <span className="text-sm font-medium text-gray-900">{stars}</span>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            </div>
            <Progress value={percentage} className="flex-1 h-2" />
            <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}