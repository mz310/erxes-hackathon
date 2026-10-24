import type { ComponentType, ReactNode } from "react";
import { Fragment } from "react";
import { Breadcrumb, Button, Separator } from "erxes-ui";
import { PageHeader } from "ui-modules";
import { Link } from "react-router";

export type Crumb = { label: string; to: string };

// Shared header: breadcrumb trail, favorite toggle, and page actions on the
// right. Every page of the plugin uses it so navigation reads the same.
export const PluginPageHeader = ({
  crumbs,
  icon: Icon,
  favoriteIcon,
  children,
}: {
  crumbs: Crumb[];
  icon: ComponentType<{ className?: string }>;
  favoriteIcon: string;
  children?: ReactNode;
}) => (
  <PageHeader>
    <PageHeader.Start>
      <Breadcrumb>
        <Breadcrumb.List className="edutechbrave:gap-1">
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.to}>
              {index > 0 && <Breadcrumb.Separator />}
              <Breadcrumb.Item>
                <Button variant="ghost" asChild>
                  <Link to={crumb.to}>
                    {index === 0 && <Icon />}
                    {crumb.label}
                  </Link>
                </Button>
              </Breadcrumb.Item>
            </Fragment>
          ))}
        </Breadcrumb.List>
      </Breadcrumb>
      <Separator.Inline />
      <PageHeader.FavoriteToggleButton
        breadcrumb={crumbs.map((crumb) => crumb.label)}
        icon={favoriteIcon}
      />
    </PageHeader.Start>
    {children ? <PageHeader.End>{children}</PageHeader.End> : null}
  </PageHeader>
);
