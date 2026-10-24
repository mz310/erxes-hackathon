import { IconDatabaseImport, IconPlus, IconWorldShare } from "@tabler/icons-react";
import { Button, Card } from "erxes-ui";
import { Link } from "react-router";
import { PLUGIN_BASE } from "../../cases/views";

// Shown instead of empty work queues while the tenant has no cases at all:
// three ways in, in the order a new department usually takes them.
export const GettingStartedCard = ({ onCreate }: { onCreate: () => void }) => (
  <Card>
    <Card.Header>
      <Card.Title className="edutechbrave:text-sm">Эхлэх</Card.Title>
      <Card.Description>Одоогоор хэрэг бүртгэгдээгүй байна.</Card.Description>
    </Card.Header>
    <Card.Content>
      <ol className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4">
        <li className="edutechbrave:flex edutechbrave:gap-3">
          <IconWorldShare className="edutechbrave:mt-0.5 edutechbrave:size-5 edutechbrave:shrink-0 edutechbrave:text-muted-foreground" />
          <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1">
            <span className="edutechbrave:text-sm edutechbrave:font-medium">Олон нийтийн хуудсыг сургуулиудад түгээх</span>
            <span className="edutechbrave:text-sm edutechbrave:text-muted-foreground">
              Хажуугийн «Олон нийтийн мэдэгдлийн хуудас»-ны холбоосыг хуулж, QR код болгон анги, коридорт байршуулна.
              Тэндээс ирсэн мэдэгдэл энд автоматаар орно.
            </span>
          </div>
        </li>
        <li className="edutechbrave:flex edutechbrave:gap-3">
          <IconPlus className="edutechbrave:mt-0.5 edutechbrave:size-5 edutechbrave:shrink-0 edutechbrave:text-muted-foreground" />
          <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:items-start edutechbrave:gap-2">
            <span className="edutechbrave:text-sm edutechbrave:font-medium">Утсаар, биечлэн ирсэн мэдэгдлийг бүртгэх</span>
            <Button size="sm" onClick={onCreate}>
              Шинэ хэрэг бүртгэх
            </Button>
          </div>
        </li>
        <li className="edutechbrave:flex edutechbrave:gap-3">
          <IconDatabaseImport className="edutechbrave:mt-0.5 edutechbrave:size-5 edutechbrave:shrink-0 edutechbrave:text-muted-foreground" />
          <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:items-start edutechbrave:gap-2">
            <span className="edutechbrave:text-sm edutechbrave:font-medium">Жишээ өгөгдлөөр системтэй танилцах</span>
            <Button size="sm" variant="outline" asChild>
              <Link to={`${PLUGIN_BASE}/settings`}>Тохиргоо руу очих</Link>
            </Button>
          </div>
        </li>
      </ol>
    </Card.Content>
  </Card>
);
