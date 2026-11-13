import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, meta } from "@/components/site/InfoPage";
export const Route = createFileRoute("/terms")({
  head: () => ({ meta: meta("Terms of Service — ASTRA STYLIN", "The terms that apply when you shop with ASTRA STYLIN.") }),
  component: () => (
    <InfoPage eyebrow="Legal" title="Terms of service">
      <p>By placing an order with ASTRA STYLIN you agree to these terms.</p>
      <h2>Orders</h2>
      <p>An order is confirmed once we've verified it with you on WhatsApp. We may cancel an order if a piece becomes unavailable; any payment made will be refunded.</p>
      <h2>Pricing</h2>
      <p>All prices are in Indian Rupees. Colours may vary slightly from what you see on screen.</p>
      <h2>Exchanges</h2>
      <p>Unworn pieces with tags attached can be exchanged — contact us to arrange it.</p>
    </InfoPage>
  ),
});
