import { AuthorizationError } from "./errors";
import { IncomingMessage } from "http";
import * as jwt from "jsonwebtoken";
import { SchemaDirectiveVisitor } from "graphql-tools";
import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLList,
  GraphQLString
} from "graphql";

const userMetaMapper = (user, metas) => {
  if (process.env.USER_METAS) {
    metas = process.env.USER_METAS.split(",");
  }

  if (user) {
    // e.g. roles
    // This can be made more generic for more custom meta data
    if (metas == null) {
      return user;
    }
    if (typeof metas === "string") {
      metas = [metas]; // Make an array
    }
    metas.forEach(meta => {
      const key = Object.keys(user).find(key =>
        key.toLowerCase().endsWith(`/${meta}`)
      );
      if (key) {
        user[meta] = user[key];
        delete user[key];
      }
    });

    return user;
  }
  return null;
};

const getScopesFromUser = (
  user,
  permissions = null,
  defaultRole = "visitor"
) => {
  if (process.env.DEFAULT_ROLE) {
    defaultRole = process.env.DEFAULT_ROLE;
  }

  if (process.env.PERMISSIONS) {
    const buff = Buffer.from(process.env.PERMISSIONS, "base64");
    permissions = JSON.parse(buff.toString("utf-8"));
  }

  if (user == null && permissions) {
    return permissions[defaultRole];
  }

  if (user) {
    const role = user.role || user.roles || user.Role || user.Roles;
    const scopes = user.scope || user.scopes || user.Scope || user.Scopes;

    if (permissions == null && scopes) {
      return scopes;
    } else if (role && permissions[role]) {
      return permissions[role];
    } else if (scopes) {
      return scopes;
    } else if (permissions && permissions[defaultRole]) {
      return permissions[defaultRole];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

export const verifyAndDecodeToken = ({ context }) => {
  const req =
    context instanceof IncomingMessage
      ? context
      : context.req || context.request;

  if (
    !req ||
    !req.headers ||
    (!req.headers.authorization && !req.headers.Authorization)
  ) {
    throw new AuthorizationError({ message: "No authorization token." });
  }

  const token = req.headers.authorization || req.headers.Authorization;
  try {
    const id_token = token.replace("Bearer ", "");
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      throw new Error(
        "No JWT secret set. Set environment variable JWT_SECRET to decode token."
      );
    }
    const decoded = jwt.verify(id_token, JWT_SECRET, {
      algorithms: ["HS256", "RS256"]
    });

    return userMetaMapper(decoded); // finally map url metas to metas
  } catch (err) {
    throw new AuthorizationError({
      message: "You are not authorized for this resource"
    });
  }
};

export class HasScopeDirective extends SchemaDirectiveVisitor {
  static getDirectiveDeclaration(directiveName, schema) {
    return new GraphQLDirective({
      name: "hasScope",
      locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
      args: {
        scopes: {
          type: new GraphQLList(GraphQLString),
          defaultValue: "none:read"
        }
      }
    });
  }

  // used for example, with Query and Mutation fields
  visitFieldDefinition(field) {
    const expectedScopes = this.args.scopes;
    const next = field.resolve;

    // wrap resolver with auth check
    field.resolve = function(result, args, context, info) {
      try {
        context.user = verifyAndDecodeToken({ context });
      } catch (e) {
        // nothing to catch
      }

      const scopes = getScopesFromUser(context.user);

      if (
        scopes !== null &&
        expectedScopes.some(scope => scopes.indexOf(scope) !== -1)
      ) {
        return next(result, args, context, info);
      }

      throw new AuthorizationError({
        message: "You are not authorized for this resource"
      });
    };
  }

  visitObject(obj) {
    const fields = obj.getFields();
    const expectedScopes = this.args.scopes;

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const next = field.resolve;
      field.resolve = function(result, args, context, info) {
        try {
          context.user = verifyAndDecodeToken({ context });
        } catch (e) {
          // nothing to catch
        }

        const scopes = getScopesFromUser(context.user);

        if (
          scopes !== null &&
          expectedScopes.some(role => scopes.indexOf(role) !== -1)
        ) {
          return next(result, args, context, info);
        }
        throw new AuthorizationError({
          message: "You are not authorized for this resource"
        });
      };
    });
  }
}

export class HasRoleDirective extends SchemaDirectiveVisitor {
  static getDirectiveDeclaration(directiveName, schema) {
    return new GraphQLDirective({
      name: "hasRole",
      locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
      args: {
        roles: {
          type: new GraphQLList(schema.getType("Role")),
          defaultValue: "reader"
        }
      }
    });
  }

  visitFieldDefinition(field) {
    const expectedRoles = this.args.roles;
    const next = field.resolve;

    field.resolve = function(result, args, context, info) {
      const decoded = verifyAndDecodeToken({ context });

      // FIXME: override with env var
      const roles = process.env.AUTH_DIRECTIVES_ROLE_KEY
        ? decoded[process.env.AUTH_DIRECTIVES_ROLE_KEY] || []
        : decoded["Roles"] ||
          decoded["roles"] ||
          decoded["Role"] ||
          decoded["role"] ||
          [];

      if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
        context.user = decoded;
        return next(result, args, context, info);
      }

      throw new AuthorizationError({
        message: "You are not authorized for this resource"
      });
    };
  }

  visitObject(obj) {
    const fields = obj.getFields();
    const expectedRoles = this.args.roles;

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const next = field.resolve;
      field.resolve = function(result, args, context, info) {
        const decoded = verifyAndDecodeToken({ context });

        const roles = process.env.AUTH_DIRECTIVES_ROLE_KEY
          ? decoded[process.env.AUTH_DIRECTIVES_ROLE_KEY] || []
          : decoded["Roles"] ||
            decoded["roles"] ||
            decoded["Role"] ||
            decoded["role"] ||
            [];

        if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
          context.user = decoded;
          return next(result, args, context, info);
        }
        throw new AuthorizationError({
          message: "You are not authorized for this resource"
        });
      };
    });
  }
}

export class IsAuthenticatedDirective extends SchemaDirectiveVisitor {
  static getDirectiveDeclaration(directiveName, schema) {
    return new GraphQLDirective({
      name: "isAuthenticated",
      locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT]
    });
  }

  visitObject(obj) {
    const fields = obj.getFields();

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const next = field.resolve;

      field.resolve = function(result, args, context, info) {
        const decoded = verifyAndDecodeToken({ context }); // will throw error if not valid signed jwt
        context.user = decoded;
        return next(result, args, context, info);
      };
    });
  }

  visitFieldDefinition(field) {
    const next = field.resolve;

    field.resolve = function(result, args, context, info) {
      const decoded = verifyAndDecodeToken({ context });
      context.user = decoded;
      return next(result, args, context, info);
    };
  }
}
