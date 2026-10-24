import { IconScale, IconShieldX } from "@tabler/icons-react";
import { Alert, Button } from "erxes-ui";
import type { CaseAccess } from "./shared";

// Shown above any form the API would refuse for this user, with a way back to
// the declaration, so nobody types a note or uploads evidence only to get a
// FORBIDDEN toast at the end.
export const CaseGateNotice = ({ access, onDeclare }: { access: CaseAccess; onDeclare: () => void }) => {
  if (access === "ok") {
    return null;
  }
  const conflict = access === "conflict";
  return (
    <Alert variant={conflict ? "destructive" : "warning"}>
      {conflict ? <IconShieldX /> : <IconScale />}
      <Alert.Title>
        {conflict ? "Та энэ хэрэгт холбоотой гэж мэдүүлсэн" : "Эхлээд ашиг сонирхлын мэдүүлэг өгнө үү"}
      </Alert.Title>
      <Alert.Description className="edutechbrave:flex edutechbrave:flex-col edutechbrave:items-start edutechbrave:gap-2">
        <span>
          {conflict
            ? "Холбоотой ажилтан энэ хэрэгт өөрчлөлт оруулахгүй, зөвхөн харна."
            : "Буруутгагдагчтай холбоогүй гэдгээ мэдүүлсний дараа энд бичих, тэмдэглэх боломжтой болно."}
        </span>
        <Button variant="outline" size="sm" onClick={onDeclare}>
          {conflict ? "Мэдүүлгээ харах" : "Мэдүүлэг өгөх"}
        </Button>
      </Alert.Description>
    </Alert>
  );
};
