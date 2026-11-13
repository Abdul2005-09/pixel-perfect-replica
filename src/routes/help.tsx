import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, meta } from "@/components/site/InfoPage";
const CHART = [["S", 38, 27, 17], ["M", 40, 28, 17.5], ["L", 42, 29, 18], ["XL", 44, 30, 18.5], ["XXL", 46, 31, 19]] as const;
export const Route = createFileRoute("/help")({
  head: () => ({ meta: meta("Help & Size Guide — ASTRA STYLIN", "Size guide, ordering, delivery and returns at ASTRA STYLIN.") }),
  component: () => (
    <InfoPage eyebrow="Help" title="Help & size guide">
      <h2 id="sizing">Size guide</h2>
      <p>Measurements in inches, taken flat across the garment. Between sizes? Size up for a relaxed fit.</p>
      <div className="overflow-x-auto"><table className="w-full border text-left text-sm">
        <thead className="bg-secondary"><tr>{["Size", "Chest", "Length", "Shoulder"].map((h) => <th key={h} className="eyebrow p-3">{h}</th>)}</tr></thead>
        <tbody>{CHART.map((r) => <tr key={r[0]} className="border-t">{r.map((c, i) => <td key={i} className="p-3">{c}</td>)}</tr>)}</tbody>
      </table></div>
      <h2 id="ordering">Ordering</h2>
      <p>Add pieces to your bag, sign in and place your order. We then confirm the order, payment and delivery with you on WhatsApp.</p>
      <h2>Delivery</h2>
      <p>Orders are dispatched once confirmed. You can follow every order's status from your account.</p>
      <h2>Exchanges & returns</h2>
      <p>If something doesn't fit, message us on WhatsApp and we'll help you with an exchange.</p>
    </InfoPage>
  ),
});
