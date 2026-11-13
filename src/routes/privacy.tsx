import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, meta } from "@/components/site/InfoPage";
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: meta("Privacy Policy — ASTRA STYLIN", "How ASTRA STYLIN collects, uses and protects your information.") }),
  component: () => (
    <InfoPage eyebrow="Legal" title="Privacy policy">
      <p>We collect only what we need to run your account and deliver your orders: your name, email, phone number and delivery address.</p>
      <h2>How we use it</h2>
      <p>Your details are used to process and deliver orders, contact you about them, and — only if you subscribe — send news about new collections.</p>
      <h2>Sharing</h2>
      <p>We never sell your information. It is shared only with delivery partners where needed to get your order to you.</p>
      <h2>Your choices</h2>
      <p>You can ask us to update or delete your information at any time by contacting us.</p>
    </InfoPage>
  ),
});
