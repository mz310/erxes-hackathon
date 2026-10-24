import { MembersInline } from "ui-modules";

// MembersInline renders an avatar and a name as siblings and relies on a flex
// parent to put them on one line; outside a table cell they would stack.
export const MemberName = ({ id }: { id: string }) => (
  <span className="edutechbrave:inline-flex edutechbrave:min-w-0 edutechbrave:items-center edutechbrave:gap-1.5">
    <MembersInline memberIds={[id]} size="sm" />
  </span>
);
