# graphql-auth-user-directives

[![CircleCI](https://circleci.com/gh/grand-stack/graphql-auth-user-directives.svg?style=svg)](https://circleci.com/gh/grand-stack/graphql-auth-user-directives)

Add authentication to your GraphQL API with schema directives.

## Schema directives for authorization

- [ ] `@isAuthenticated`
- [ ] `@hasRole`
- [ ] `@hasScope`

## Quick start

```sh
npm install --save graphql-auth-user-directives
```

Then import the schema directives you'd like to use and attach them during your GraphQL schema construction. For example using [neo4j-graphql.js' `makeAugmentedSchema`](https://grandstack.io/docs/neo4j-graphql-js-api.html#makeaugmentedschemaoptions-graphqlschema):


```js
import { IsAuthenticatedDirective, HasRoleDirective, HasScopeDirective } from "graphql-auth-user-directives";

const augmentedSchema = makeAugmentedSchema({
  typeDefs,
  schemaDirectives: {
    isAuthenticated: IsAuthenticatedDirective,
    hasRole: HasRoleDirective,
    hasScope: HasScopeDirective
  }
});
```

The `@hasRole`, `@hasScope`, and `@isAuthenticated` directives will now be available for use in your GraphQL schema:

```
type Query {
    userById(userId: ID!): User @hasScope(scopes: ["User:Read"])
    itemById(itemId: ID!): Item @hasScope(scopes: ["Item:Read"])
}
```

Be sure to inject the request headers into the GraphQL resolver context. For example, with Apollo Server:

```js
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    return req;
  }
});
```

In the case that the token was decoded without errors the `context.user` will store the payload from the token, that is, you could for example create a Query `me` with the following resolver:

```js
me: (parent, args, context) => {
      console.log(context.user.id);
}
```

A JWT must then be included in each GraphQL request in the Authorization header. For example, with Apollo Client:

```js
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';


const httpLink = createHttpLink({
    uri: <YOUR_GRAPHQL_API_URI>
});

const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('id_token'); // here we are storing the JWT in localStorage
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        }
    }
});

const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache()
});
```

If all is set up correctly you should be able to use the directives and resolvers that use any of these directives the roles and/or permissions will be attached to the user which is provided in the context.

## Configure

### Setting the JWT token (required)

There are two variables to control how tokens are processed.
If you would like the server to verify the tokens used in a request, you must provide the secret used to encode the token in the `JWT_SECRET` variable. Otherwise you will need to set `JWT_NO_VERIFY` to true.

```sh
export JWT_NO_VERIFY=true //Server does not have the secret, but will need to decode tokens
```
or
```sh
export JWT_SECRET=><YOUR_JWT_SECRET_KEY_HERE> //Server has the secret and will verify authenticity
```

### JSON based scopes (optional)
You might provide scopes directly to the encoded user. However you may also control the scopes of a role within your backend, changing it with a mere change of an environmental variable. With this approach you do not depend on another system to refresh scopes.   
To do so you need to define a JSON specified file, e.g.
```sh
{
  "role1": ["resource1:action1", "resource2:action2"],
  "role2": ["resource3:action3", "resource4:action4"]
}
```
Assuming your user has a provided role, this package will determine the corresponding permissions. To insert this JSON file you'll need to base64 encode it to add is as an environment variable, e.g.
```sh
export PERMISSIONS=ewogICJyb2xlMSI6IFsicmVzb3VyY2UxOmFjdGlvbjEiLCAicmVzb3VyY2UyOmFjdGlvbjIiXSwKICAicm9sZTIiOiBbInJlc291cmNlMzphY3Rpb24zIiwgInJlc291cmNlNDphY3Rpb240Il0KfQ==
```
Note that a user might have multiple roles, in this case all permissions of the corresponding roles will be concatenated, providing the expected results.  
Furthermore, if you work with such permission JSON you can provide a default user, e.g. the role that will be applied if authentication fails. Specify the user in your JSON and provide the name of the role as an environment variable, e.g.:
```sh
export DEFAULT_ROLE=visitor
```
This option allows you to specify a clear set of permissions for non-authenticated users.  
Finally, in some cases the roles and or scopes in the decoded user object may come with an url such as `https://grandstack.io/roles` and `https://grandstack.io/scopes`, you can map these to `roles` and `scopes` respectively in your final user by providing the meta names comma separated, e.g.
```sh
export USER_METAS="roles,scopes"
```

## Conditional permissions
This package includes a conditional based authorisation functionality, for example: a mutation may have the scope 
`object: edit`, however you only wish some user to provide access if he/she is the owner of this object, the scope for 
this user might be `object: edit: isOwner` (this is also the way to define such permission, using another `:` and 
specifying the condition, however you'd like to name it).  
What you need to do is configure a query that is needed to check on whether this user is the owner. 

```$xslt
import { conditionalQueryMap } from 'graphql-auth-user-directives';

conditionalQueryMap.set(
    "object:isOwner",
    (user, objectId) => { return `
    MATCH path=(a:Object {uid: "${objectId}"})<-[:OWNS]-(u:User {uid:"${user.uid}"})
    WITH CASE WHEN path IS NULL THEN false ELSE true END as is_allowed
    ` }
);
```

Three things are important to note:
1. The key used to set the map is set the name of the object (in this example `object`), and the condition (in this case 
`isOwner`) separated by a `:`.
2. You should end the Cypher query with a `WITH` statement that defines a variable called `is_allowed`.
3. The function defined returns a string (the query used to perform the permission lookup in Neo4j) and it gets two 
input arguments, the user as it is decoded and the objectId which is strongly related to the object itself. See the next 
part on this object id.

This object id is extracted from the provided parameters in Apollo. Usually it will be `id` or `uid`. By default we 
provide preference for `id` followed by `uid`. You can change this by setting the environment variable 
`OBJECT_IDENTIFIER`. By default it is thus set to the string `"id", "uid"`.  

Set the query for the condition, e.g. for `isOwner`.

### Separately checking conditional permissions
You may want to verify conditional permissions separately, e.g. to check whether the frontend should present a piece of 
code. Therefore you can now call the conditional permission check function:

```$xslt
// Example of how this function could be used in a Query
import { satisfiesConditionalScopes } from "graphql-auth-user-directives";

exports.resolver = {
    Query: {
        checkConditionalPermission: async (obj, params, ctx, resolveInfo) => {
            // (optional) First check if scopes are defined for the user
            const userScopes = ctx.user && ctx.user.scopes;
            if(userScopes == null){
                throw new UserInputError("You have no scopes and therefore no access");
            }

            // params.scopes contains the array of conditional scopes that should be checked.
            return await satisfiesConditionalScopes(
                ctx.driver, params.scopes, userScopes, ctx.user, params.objectId
            );
        }
    }
}
```

Note that it is a more trivial exercise to verify non-conditional scopes for this is merely a direct lookup in the 
scopes of the user. Therefore this is not expected to be required to be exported.

## Running Tests Locally

You'll need to set node 13 or higher (due to the triple dot operator).
```sh
nvm use 13
```
Then run the tests by performing
```sh
yarn test
```


## Test JWTs

Scopes: user:CRUD

~~~
key: qwertyuiopasdfghjklzxcvbnm123456
~~~

~~~
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTQ5MTQ1Mjk0LCJleHAiOjE2OTE3ODEzMDcsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsIlJvbGUiOiJBRE1JTiIsIlNjb3BlIjpbIlVzZXI6UmVhZCIsIlVzZXI6Q3JlYXRlIiwiVXNlcjpVcGRhdGUiLCJVc2VyOkRlbGV0ZSJdfQ.WJffOec05r8KuzW76asax1iCzv5q4rwRv9kvFyw7c_E
~~~
