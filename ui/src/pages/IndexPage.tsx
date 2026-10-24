import { useQuery } from "@apollo/client";
import type { ComponentType, ReactNode } from "react";
import {
  IconBook,
  IconDatabase,
  IconExternalLink,
  IconLayoutDashboard,
  IconSandbox,
  IconSettings,
} from "@tabler/icons-react";
// Root imports on purpose: core-ui shares `erxes-ui`/`ui-modules` as Module
// Federation singletons keyed on the bare specifier, so deep imports would
// bundle second private copies instead of reusing the host's.
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Separator,
  Skeleton,
  cn,
} from "erxes-ui";
import { PageHeader } from "ui-modules";
import { Link } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import { STATUS_QUERY } from "../graphql";
import { Samples } from "../Samples";

const { path } = manifest.ui;

const Dot = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "edutechbrave:inline-block edutechbrave:size-2 edutechbrave:rounded-full",
      className,
    )}
  />
);

const StatusRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="edutechbrave:flex edutechbrave:items-center edutechbrave:justify-between edutechbrave:gap-4 edutechbrave:text-sm">
    <span className="edutechbrave:text-muted-foreground">{label}</span>
    <span className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2 edutechbrave:font-medium">
      {children}
    </span>
  </div>
);

const ConnectionCard = () => {
  const { data, loading, error, refetch } = useQuery(STATUS_QUERY);
  const status = data?.eduTechBraveStatus;

  const pending = (
    <>
      <Dot className="edutechbrave:animate-pulse edutechbrave:bg-muted-foreground" />
      <Skeleton className="edutechbrave:h-4 edutechbrave:w-24" />
    </>
  );

  return (
    <Card className="edutechbrave:w-full edutechbrave:md:w-80 edutechbrave:shrink-0">
      <Card.Header>
        <Card.Title className="edutechbrave:text-sm">Connection</Card.Title>
        <Card.Description>
          Live status of this plugin inside erxes
        </Card.Description>
      </Card.Header>
      <Card.Content className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3">
        <StatusRow label="API">
          {loading ? (
            pending
          ) : error ? (
            <>
              <Dot className="edutechbrave:bg-destructive" />
              <span>Unreachable</span>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </>
          ) : (
            <>
              <Dot className="edutechbrave:bg-success" />
              <span>Connected · v{status?.version}</span>
            </>
          )}
        </StatusRow>
        <StatusRow label="Gateway">
          {loading ? (
            pending
          ) : error ? (
            <>
              <Dot className="edutechbrave:bg-destructive" />
              <span
                className="edutechbrave:truncate edutechbrave:max-w-40"
                title={error.message}
              >
                {error.message}
              </span>
            </>
          ) : (
            <>
              <Dot className="edutechbrave:bg-success" />
              <span>Federated as {status?.plugin}</span>
            </>
          )}
        </StatusRow>
        <StatusRow label="Tenant">
          {loading ? pending : (status?.subdomain ?? "—")}
        </StatusRow>
        <StatusRow label="Signed in">
          {loading
            ? pending
            : (status && (status.userEmail ?? status.userId ?? "Anonymous")) ||
              "—"}
        </StatusRow>
      </Card.Content>
    </Card>
  );
};

const StepCard = ({
  icon: Icon,
  title,
  description,
  code,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  code: string;
}) => (
  <Card>
    <Card.Header>
      <div className="edutechbrave:flex edutechbrave:size-9 edutechbrave:items-center edutechbrave:justify-center edutechbrave:rounded-lg edutechbrave:bg-accent">
        <Icon className="edutechbrave:size-5" />
      </div>
      <Card.Title>{title}</Card.Title>
      <Card.Description>{description}</Card.Description>
    </Card.Header>
    <Card.Content>
      <code className="edutechbrave:rounded edutechbrave:bg-muted edutechbrave:px-1.5 edutechbrave:py-0.5 edutechbrave:font-mono edutechbrave:text-xs">
        {code}
      </code>
    </Card.Content>
  </Card>
);

const STEPS = [
  {
    icon: IconDatabase,
    title: "Model your data",
    description:
      "Define the records this plugin owns and expose them on the federated graph.",
    code: "api/src/modules/sample",
  },
  {
    icon: IconLayoutDashboard,
    title: "Build the page",
    description:
      "Replace this overview with your module: lists with RecordTable, forms with Form, details in a Sheet.",
    code: "ui/src/pages/IndexPage.tsx",
  },
];

export const IndexPage = () => (
  <div className="edutechbrave:flex edutechbrave:h-full edutechbrave:flex-col">
    <PageHeader>
      <PageHeader.Start>
        <Breadcrumb>
          <Breadcrumb.List className="edutechbrave:gap-1">
            <Breadcrumb.Item>
              <Button variant="ghost" asChild>
                <Link to={`/${path}`}>
                  <IconSandbox />
                  {manifest.title}
                </Link>
              </Button>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb>
        <Separator.Inline />
        <PageHeader.FavoriteToggleButton
          breadcrumb={[manifest.title]}
          icon="IconSandbox"
        />
      </PageHeader.Start>
      <PageHeader.End>
        <Button variant="outline" asChild>
          <Link to={`/${path}/settings`}>
            <IconSettings />
            Settings
          </Link>
        </Button>
      </PageHeader.End>
    </PageHeader>
    <div className="edutechbrave:flex-1 edutechbrave:overflow-auto">
      <div className="edutechbrave:mx-auto edutechbrave:flex edutechbrave:w-full edutechbrave:max-w-5xl edutechbrave:flex-col edutechbrave:gap-6 edutechbrave:p-6">
        <section className="edutechbrave:relative edutechbrave:overflow-hidden edutechbrave:rounded-xl edutechbrave:border edutechbrave:border-border edutechbrave:bg-background edutechbrave:p-8 edutechbrave:shadow-xs">
          <div
            aria-hidden
            className="edutechbrave:pointer-events-none edutechbrave:absolute edutechbrave:inset-0 edutechbrave:bg-gradient-to-br edutechbrave:from-primary/10 edutechbrave:via-transparent edutechbrave:to-transparent"
          />
          <div className="edutechbrave:relative edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-6 edutechbrave:md:flex-row edutechbrave:md:items-start edutechbrave:md:justify-between">
            <div className="edutechbrave:flex edutechbrave:max-w-xl edutechbrave:flex-col edutechbrave:gap-4">
              <div>
                <Badge variant="info">Plugin · v{manifest.version}</Badge>
              </div>
              <h1 className="edutechbrave:text-2xl edutechbrave:font-semibold edutechbrave:tracking-tight">
                Welcome to {manifest.title}
              </h1>
              <p className="edutechbrave:text-sm edutechbrave:leading-relaxed edutechbrave:text-muted-foreground">
                {manifest.description}
              </p>
              <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:gap-2">
                <Button asChild>
                  <Link to={`/${path}/settings`}>
                    <IconSettings />
                    Open settings
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href="https://erxes.io/docs/create-plugin-standalone"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconBook />
                    Developer guide
                    <IconExternalLink />
                  </a>
                </Button>
              </div>
            </div>
            <ConnectionCard />
          </div>
        </section>
        <Samples />
        <div className="edutechbrave:grid edutechbrave:gap-4 edutechbrave:md:grid-cols-2">
          {STEPS.map((step) => (
            <StepCard key={step.title} {...step} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
