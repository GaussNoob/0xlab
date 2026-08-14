import { SpacedReview } from "@/components/progress/spaced-review";
import { reviewCards } from "@/modules/learning/review-catalog";

export const metadata = { title: "Review" };

export default function ReviewPage() {
  return <SpacedReview cards={reviewCards} />;
}

