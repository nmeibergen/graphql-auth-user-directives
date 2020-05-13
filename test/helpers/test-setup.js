// TODO: will need to set appropriate env vars

import { ApolloServer } from "apollo-server";
import { makeExecutableSchema } from "graphql-tools";
import GraphQLJSON from "graphql-type-json";

import {
  IsAuthenticatedDirective,
  HasRoleDirective,
  HasScopeDirective
} from "../../src/index";

export const typeDefs = `

directive @hasScope(scopes: [String]) on OBJECT | FIELD_DEFINITION
directive @hasRole(roles: [Role]) on OBJECT | FIELD_DEFINITION
directive @isAuthenticated on OBJECT | FIELD_DEFINITION

scalar JSON

enum Role {
    visitor
    admin
}

type user {
    id: ID!
    name: String
    roles: String
    scopes: JSON
}

type Item  {
    id: ID!
    name: String
}

type Query {
    me: user @hasScope(scopes: ["me:read"])
    authMe: user @isAuthenticated
    roleMe: user @hasRole(roles: [visitor, admin])
    userById(userId: ID!): user @hasScope(scopes: ["user:read"])
    itemById(itemId: ID!): Item @hasScope(scopes: ["item:read"])
}

type Mutation {
    createUser(id: ID!, name: String): user @hasScope(scopes: ["user:create"])
    createItem(id: ID!, name: String): Item @hasScope(scopes: ["item:create"])

    updateUser(id: ID!, name: String): user @hasScope(scopes: ["user:update"])
    updateItem(id: ID!, name: String): Item @hasScope(scopes: ["item:update"])

    deleteUser(id: ID!): user @hasScope(scopes: ["user:delete"])
    deleteItem(id: ID!): Item @hasScope(scopes: ["item:delete"])
    
    addUserItemRelationship(userId: ID!, itemId: ID!): user @hasScope(scopes: ["user:create", "item:create"])
}
`;

const resolvers = {
  Query: {
    me(object, params, ctx, resolveInfo) {
      return {
        id: 1,
        name: ctx.user.name,
        roles: ctx.user.roles,
        scopes: ctx.user.scopes
      };
    },
    authMe(object, params, ctx, resolveInfo) {
      return {
        id: 1,
        name: ctx.user.name,
        roles: ctx.user.roles,
        scopes: ctx.user.scopes
      };
    },
    roleMe(object, params, ctx, resolveInfo) {
      return {
        id: 1,
        name: ctx.user.name,
        roles: ctx.user.roles,
        scopes: ctx.user.scopes
      };
    },
    userById(object, params, ctx, resolveInfo) {
      console.log("userById resolver");
      return {
        id: params.userId,
        name: "bob"
      };
    },
    itemById(object, params, ctx, resolveInfo) {
      console.log("itemById resolver");
      return {
        id: "123",
        name: "bob"
      };
    }
  },
  Mutation: {
    createUser(object, params, ctx, resolveInfo) {
      // createUser mutation should never be called
      throw new Error("createUser resolver called");
    },
    createItem(object, params, ctx, resolveInfo) {
      console.log("createItem resolver");
      return {
        id: 1
      };
    },
    updateUser(object, params, ctx, resolveInfo) {
      console.log("updateUser resolver");
    },
    updateItem(object, params, ctx, resolveInfo) {
      console.log("updateItem resolver");
    },
    deleteUser(object, params, ctx, resolveInfo) {
      console.log("deleteUser resolver");
      return {
        id: 1
      };
    },
    deleteItem(object, params, ctx, resolveInfo) {
      console.log("deleteItem resolver");
    },
    addUserItemRelationship(object, params, ctx, resolveInfo) {
      console.log("addUserItemRelationship resolver");
    }
  }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  schemaDirectives: {
    isAuthenticated: IsAuthenticatedDirective,
    hasRole: HasRoleDirective,
    hasScope: HasScopeDirective
  }
});

export class ApolloTestServer extends ApolloServer {
  constructor(config) {
    super(config);
    this.context = ({ req }) => {
      return req;
    };
  }

  setContext(newContext) {
    this.context = newContext;
  }

  mergeContext(partialContext) {
    this.context = Object.assign({}, this.context, partialContext);
  }

  resetContext() {
    this.context = baseContext;
  }
}

const server = new ApolloTestServer({
  schema: schema
});

module.exports.server = server;
