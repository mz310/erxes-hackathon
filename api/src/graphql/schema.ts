import { gql } from "graphql-tag";
import { manifest } from "../config.ts";
import type { Context } from "../connectionResolvers.ts";
import { aiPublicMutations } from "../modules/ai/graphql/publicResolvers.ts";
import { aiMutations, aiQueries } from "../modules/ai/graphql/resolvers.ts";
import { aiMutations as aiMutationDefs, aiQueries as aiQueryDefs, aiTypes } from "../modules/ai/graphql/typeDefs.ts";
import { caseMutations } from "../modules/cases/graphql/mutations.ts";
import { publicMutations, publicQueries } from "../modules/cases/graphql/publicResolvers.ts";
import { caseQueries } from "../modules/cases/graphql/queries.ts";
import { caseMutations as caseMutationDefs, caseQueries as caseQueryDefs, caseTypes } from "../modules/cases/graphql/typeDefs.ts";

// Every type and operation is prefixed with the plugin name: the gateway
// composes all plugins into one supergraph, so names must be unique across it.
export const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.9", import: ["@key"])

  type EduTechBraveStatus {
    plugin: String!
    version: String!
    subdomain: String!
    userId: String
    userEmail: String
  }

  ${caseTypes}
  ${aiTypes}

  type Query {
    eduTechBraveStatus: EduTechBraveStatus!
    ${caseQueryDefs}
    ${aiQueryDefs}
  }

  type Mutation {
    ${caseMutationDefs}
    ${aiMutationDefs}
  }
`;

export const resolvers = {
  Query: {
    eduTechBraveStatus: (_parent: unknown, _args: unknown, { subdomain, user }: Context) => ({
      plugin: manifest.name,
      version: manifest.version,
      subdomain,
      userId: user?._id ?? null,
      userEmail: user?.email ?? null,
    }),
    ...caseQueries,
    ...publicQueries,
    ...aiQueries,
  },
  Mutation: {
    ...caseMutations,
    ...publicMutations,
    ...aiMutations,
    ...aiPublicMutations,
  },
};
