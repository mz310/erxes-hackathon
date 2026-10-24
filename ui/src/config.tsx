import "./styles.css";
import { IconFolderOpen, IconLayoutDashboard, IconSettings, IconShieldCheck } from "@tabler/icons-react";
import type { IUIConfig } from "erxes-ui";
import manifest from "../../erxes.json" with { type: "json" };

// CONFIG.name is the public service/permission identity, including dashes.
// Only manifest.ui.remote is normalized for the federation container.
const { name, path } = manifest.ui;

// core-ui registers only `/<path>/*` for `./<name>`. This plugin owns its
// nested routes, sidebar and settings through AppLayout in Main.tsx.
export const CONFIG: IUIConfig = {
  name,
  path,
  // Advisory compatibility range read by current core-ui hosts.
  platform: "3.3.2",
  icon: IconShieldCheck,
  navigationGroup: {
    name: "Эрх хамгаалал",
    icon: IconShieldCheck,
    defaultPath: path,
  },
  modules: [
    { name, icon: IconLayoutDashboard, path },
    { name: `${name}-cases`, icon: IconFolderOpen, path: `${path}/cases` },
    { name: `${name}-settings`, icon: IconSettings, path: `${path}/settings` },
  ],
};
