import { IconFolderOpen, IconLayoutDashboard, IconSettings } from "@tabler/icons-react";
// Root import on purpose: core-ui shares `erxes-ui` as a Module Federation
// singleton keyed on the bare specifier, so deep imports would bundle a second
// private copy instead of reusing the host's.
import { NavigationMenuLinkItem, Sidebar } from "erxes-ui";
import manifest from "../../../erxes.json" with { type: "json" };

const base = `/${manifest.ui.path}`;

export const Navigation = () => (
  <Sidebar.Group>
    <Sidebar.GroupLabel>Эрх хамгаалал</Sidebar.GroupLabel>
    <Sidebar.GroupContent>
      <Sidebar.Menu>
        <NavigationMenuLinkItem name="Хяналтын самбар" icon={IconLayoutDashboard} path={base} />
        <NavigationMenuLinkItem name="Хэргүүд" icon={IconFolderOpen} path={`${base}/cases`} />
        <NavigationMenuLinkItem name="Тохиргоо" icon={IconSettings} path={`${base}/settings`} />
      </Sidebar.Menu>
    </Sidebar.GroupContent>
  </Sidebar.Group>
);
