import { ApolloError } from "apollo-server";

class AuthorizationError extends ApolloError {
  constructor({ message = "You are not authorized." }) {
    super(message, "AuthorizationError");
  }
}

module.exports = { AuthorizationError };
