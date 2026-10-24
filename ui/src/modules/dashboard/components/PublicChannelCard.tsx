import { IconCopy, IconExternalLink, IconWorldShare } from "@tabler/icons-react";
import { Button, Card, REACT_APP_API_URL, toast } from "erxes-ui";
import manifest from "../../../../../erxes.json" with { type: "json" };

// The public intake page is served by this plugin's API through the erxes
// gateway (`/pl:<plugin>/intake`), so it needs no erxes login. Reports go to
// this organization, not to the school.
const intakeUrl = (): string => {
  const base = (REACT_APP_API_URL || window.location.origin).replace(/\/+$/, "");
  return `${base}/pl:${manifest.name}/intake`;
};

export const PublicChannelCard = () => {
  const url = intakeUrl();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Холбоос хуулагдлаа", description: url, variant: "success" });
    } catch {
      toast({ title: "Хуулж чадсангүй", description: url, variant: "destructive" });
    }
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-sm">
          <IconWorldShare className="edutechbrave:size-4" />
          Олон нийтийн мэдэгдлийн хуудас
        </Card.Title>
        <Card.Description>
          Сурагч, эцэг эх, багш нэвтрэхгүйгээр, нэрээ нууцлан мэдэгдэл илгээнэ. Мэдэгдэл
          сургуулийн удирдлагад биш, шууд энд ирнэ.
        </Card.Description>
      </Card.Header>
      <Card.Content className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3">
        <code className="edutechbrave:block edutechbrave:break-all edutechbrave:rounded-md edutechbrave:bg-muted edutechbrave:px-3 edutechbrave:py-2 edutechbrave:font-mono edutechbrave:text-xs">
          {url}
        </code>
        <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:gap-2">
          <Button variant="outline" size="sm" onClick={() => void copy()}>
            <IconCopy />
            Хуулах
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <IconExternalLink />
              Нээх
            </a>
          </Button>
        </div>
        <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
          QR код болгон анги, коридорт 108-ийн хамт байршуулахыг зөвлөж байна.
        </p>
      </Card.Content>
    </Card>
  );
};
