// TODO: will need to set appropriate env vars

import { ApolloServer } from "apollo-server-express";
import { makeExecutableSchema } from "graphql-tools";
import * as permissions from "../../src/permissions";

const {
  IsAuthenticatedDirective,
  HasRoleDirective,
  HasScopeDirective
} = require("../../src/index");

// const dotenv = require("dotenv");

// dotenv.config();

export const typeDefs = `

directive @hasScope(scopes: [String]) on OBJECT | FIELD_DEFINITION
directive @hasRole(roles: [Role]) on OBJECT | FIELD_DEFINITION
directive @isAuthenticated on OBJECT | FIELD_DEFINITION

scalar JSON

enum Role {
    visitor
    editor
    admin
}

type user {
    id: ID!
    name: String
    roles: JSON
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
  
    updateItemConditiontrue(id: ID!, name: String): Item @hasScope(scopes: ["item:update:conditiontrue"])
    updateItemConditionfalse(id: ID!, name: String): Item @hasScope(scopes: ["item:update:conditionfalse"])
    updateItemMultiCondition(id: ID!, name: String): Item @hasScope(scopes: ["item:update:conditionfalse", "item:update:conditiontrue"])
    
    deleteUser(id: ID!): user @hasScope(scopes: ["user:delete"])
    deleteItem(id: ID!): Item @hasScope(scopes: ["item:delete"])
    
    addUserItemRelationship(userId: ID!, itemId: ID!): user @hasScope(scopes: ["user:create", "item:create"])
}
`;

permissions.conditionalQueryMap.set(
  "item:conditiontrue",
  (userId, objectId) => {
    return `WITH true as is_allowed`;
  }
);
permissions.conditionalQueryMap.set(
  "item:conditionfalse",
  (userId, objectId) => {
    return `WITH false as is_allowed`;
  }
);

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
      return {
        id: params.userId,
        name: "bob"
      };
    },
    itemById(object, params, ctx, resolveInfo) {
      return {
        id: "123",
        name: "bob"
      };
    }
  },
  Mutation: {
    createItem(object, params, ctx, resolveInfo) {
      return {
        id: 1
      };
    },
    createUser(object, params, ctx, resolveInfo) {
      // createUser mutation should never be called
      throw new Error("createUser resolver called");
    },
    updateUser(object, params, ctx, resolveInfo) {},
    updateItem(object, params, ctx, resolveInfo) {
      return {
        id: "123",
        name: "bob"
      };
    },
    updateItemConditiontrue(object, params, ctx, resolveInfo) {
      return {
        id: "123",
        name: "conditiontrue"
      };
    },
    updateItemConditionfalse(object, params, ctx, resolveInfo) {
      return {
        id: "123",
        name: "conditionfalse"
      };
    },
    updateItemMultiCondition(object, params, ctx, resolveInfo) {
      return {
        id: "123",
        name: "conditionfalse"
      };
    },
    deleteUser(object, params, ctx, resolveInfo) {
      return {
        id: 1
      };
    },
    deleteItem(object, params, ctx, resolveInfo) {},
    addUserItemRelationship(object, params, ctx, resolveInfo) {}
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
  // =======
  // server.listen(3000).then(({ url }) => {
  //   console.log(`GraphQL server ready at ${url}`);
  // >>>>>>> c09bb0fe60447ae7bcb53670a49c8e12dc3cd46b
});

server.start();

module.exports.server = server;
