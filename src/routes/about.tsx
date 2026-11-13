import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, meta } from "@/components/site/InfoPage";
export const Route = createFileRoute("/about")({
  head: () => ({ meta: meta("Our Story — ASTRA STYLIN", "ASTRA STYLIN makes premium polos and T-shirts with timeless, everyday style.") }),
  component: () => (
    <InfoPage eyebrow="Our story" title="Timeless styles for everyone">
      <p>ASTRA STYLIN began with a simple idea: everyday essentials deserve the same care as statement pieces. Our polos and T-shirts are cut for an easy, confident fit and made to be worn again and again.</p>
      <h2>Craft</h2>
      <p>From textured knits to clean zip polos, every piece is chosen for its fabric, finish and how it feels through a long day. Details stay quiet so the fit can speak.</p>
      <h2>Our promise</h2>
      <p>Honest pricing, sizes from S to XXL, and personal service — every order is confirmed with you directly on WhatsApp.</p>
    </InfoPage>
  ),
});
