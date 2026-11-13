import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InfoPage, meta } from "@/components/site/InfoPage";
import { settingsQuery } from "@/lib/catalog";
export const Route = createFileRoute("/contact")({
  head: () => ({ meta: meta("Contact — ASTRA STYLIN", "Get in touch with ASTRA STYLIN on WhatsApp.") }),
  component: Contact,
});
function Contact() {
  const { data } = useQuery(settingsQuery());
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const num = data?.whatsapp_number ?? "919361617869";
  function send(e: React.FormEvent) {
    e.preventDefault();
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Hi ASTRA STYLIN, I'm ${name}.\n${msg}`)}`, "_blank");
  }
  return (
    <InfoPage eyebrow="Contact" title="We'd love to hear from you">
      <p>The fastest way to reach us is WhatsApp. Write your message below and it opens straight in a chat with us.</p>
      <form onSubmit={send} className="space-y-4">
        <Input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea required rows={5} placeholder="Your message or order number" value={msg} onChange={(e) => setMsg(e.target.value)} />
        <Button type="submit" size="lg">Send on WhatsApp</Button>
      </form>
      {data?.contact_email && <p>Or email us at <a className="underline" href={`mailto:${data.contact_email}`}>{data.contact_email}</a>.</p>}
    </InfoPage>
  );
}
