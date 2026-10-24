import { GraphQLError } from "graphql";

// Expected business errors carry a code the UI and the public page can
// branch on; erxes's error classifier treats them as non-system errors.
export const badInput = (message: string): GraphQLError =>
  new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });

export const notFound = (message: string): GraphQLError =>
  new GraphQLError(message, { extensions: { code: "NOT_FOUND" } });

export const forbidden = (message: string): GraphQLError =>
  new GraphQLError(message, { extensions: { code: "FORBIDDEN" } });

export const tooManyRequests = (message: string): GraphQLError =>
  new GraphQLError(message, { extensions: { code: "TOO_MANY_REQUESTS" } });

export const unauthenticated = (message: string): GraphQLError =>
  new GraphQLError(message, { extensions: { code: "UNAUTHENTICATED" } });
