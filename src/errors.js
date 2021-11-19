import { ApolloError } from "apollo-server-express";

class AuthorizationError extends ApolloError {
  constructor({ message = "You are not authorized." }) {
    super(message, "AuthorizationError");
  }
}

module.exports = { AuthorizationError };
