import { startPlugin } from "erxes-api-shared/utils";
import { manifest } from "./config.ts";
import { generateModels } from "./connectionResolvers.ts";
import { resolvers, typeDefs } from "./graphql/schema.ts";
import { intakeHandlers } from "./modules/intake/handlers.ts";
import { permissions } from "./permissions.ts";

// startPlugin serves the federated subgraph on /graphql, mounts /health,
// wires tRPC + agent-tools, parses the gateway `user`/`hostname` headers into
// the context, and registers this service with the erxes gateway through
// Redis — including UI_ENTRY_URL so core-ui can find the UI remote.
//
// apiHandlers adds the public intake page: GET /intake, reachable through the
// gateway at /pl:edu-tech-brave/intake without an erxes account.
startPlugin({
  name: manifest.name,
  port: manifest.api.port,
  meta: { permissions },
  apiHandlers: intakeHandlers,
  graphql: async () => ({ typeDefs, resolvers }),
  apolloServerContext: async (subdomain, context) => {
    context.models = await generateModels(subdomain, context);

    return context;
  },
});
