import { FeedbackForm } from "@/components/FeedbackForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function FeedbackPage() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Feedback</CardTitle>
        <CardDescription>
          Tell us whether Introbase ranked your messages usefully.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FeedbackForm />
      </CardContent>
    </Card>
  );
}
