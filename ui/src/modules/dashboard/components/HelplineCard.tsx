import { IconPhoneCall } from "@tabler/icons-react";
import { Card } from "erxes-ui";

// 108 is the national child helpline. Many children do not know it or fear
// "causing trouble", so it stays visible on the dashboard and the public page.
export const HelplineCard = ({ text }: { text?: string | null }) => (
  <Card className="edutechbrave:border-warning/40 edutechbrave:bg-warning/10">
    <Card.Content className="edutechbrave:flex edutechbrave:items-start edutechbrave:gap-3 edutechbrave:p-4">
      <div className="edutechbrave:flex edutechbrave:size-10 edutechbrave:shrink-0 edutechbrave:items-center edutechbrave:justify-center edutechbrave:rounded-lg edutechbrave:bg-warning/20">
        <IconPhoneCall className="edutechbrave:size-5 edutechbrave:text-warning" />
      </div>
      <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1">
        <span className="edutechbrave:text-2xl edutechbrave:font-bold edutechbrave:leading-none edutechbrave:tracking-tight">108</span>
        <span className="edutechbrave:text-sm">{text || "108 — Хүүхдийн тусламжийн утас, 24/7, үнэгүй"}</span>
        <span className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
          Яаралтай: 102 цагдаа, 103 түргэн тусламж. Анги бүрт байршуулж, сурагчдад тайлбарлана уу.
        </span>
      </div>
    </Card.Content>
  </Card>
);
