import { formatINR } from "./catalog";

export type WhatsAppOrder = {
  order_number: string;
  items: { product_name: string; colour: string | null; size: string; quantity: number; unit_price: number }[];
  total: number;
  shipping_name: string;
  shipping_phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  notes?: string | null;
};

export function buildOrderMessage(o: WhatsAppOrder) {
  const lines = [
    `Hello ASTRA STYLIN, I'd like to confirm my order ${o.order_number}.`,
    "",
    ...o.items.map(
      (i, idx) =>
        `${idx + 1}. ${i.product_name}${i.colour ? ` – ${i.colour}` : ""} – Size ${i.size} × ${i.quantity} = ${formatINR(i.unit_price * i.quantity)}`,
    ),
    "",
    `Total: ${formatINR(o.total)}`,
    "",
    "Deliver to:",
    o.shipping_name,
    o.shipping_phone,
    [o.line1, o.line2].filter(Boolean).join(", "),
    `${o.city}, ${o.state} ${o.postal_code}`,
  ];
  if (o.notes) lines.push("", `Note: ${o.notes}`);
  return lines.join("\n");
}

export function whatsappLink(number: string, message: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
