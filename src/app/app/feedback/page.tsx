import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function FeedbackPage() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Feedback is disabled</CardTitle>
        <CardDescription>
          The MVP currently does not show a feedback form to users.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
