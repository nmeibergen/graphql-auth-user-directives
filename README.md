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

In the case that the token was decoded with no errors the `context.user` will store the payload from the token

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

Configuration is done via environment variables.

(required)
There are two variables to control how tokens are processed.
If you would like the server to verify the tokens used in a request, you must provide the secret used to encode the token in the `JWT_SECRET` variable. Otherwise you will need to set `JWT_NO_VERIFY` to true.

```sh
export JWT_NO_VERIFY=true //Server does not have the secret, but will need to decode tokens
```
or
```sh
export JWT_SECRET=><YOUR_JWT_SECRET_KEY_HERE> //Server has the secret and will verify authenticity
```

(optional)
You can work with scopes both by providing scopes directely in the header, or by providing roles that have scopes attached to them via a JSON specified file, e.g.
```sh
{
  "role1": ["resource1:action1", "resource2:action2"],
  "role2": ["resource3:action3", "resource4:action4"]
}
```
here provided a role to the encoded user you'd like to use the corresponding permissions. Then setup the JSON in a seperate file and base64 encode it to add is as an environment variable, e.g.
```sh
export PERMISSIONS=ewogICJyb2xlMSI6IFsicmVzb3VyY2UxOmFjdGlvbjEiLCAicmVzb3VyY2UyOmFjdGlvbjIiXSwKICAicm9sZTIiOiBbInJlc291cmNlMzphY3Rpb24zIiwgInJlc291cmNlNDphY3Rpb240Il0KfQ==
```
Important note is that at this point in time, this role-based-permissions approach does not yet work with multiple roles.
Furthermore, if you work with such permission JSON you can provide a default user, e.g. the user that will be applied if authentication fails. Specify the user in your JSON and provide the name of the role as an environment variable, e.g.:
```sh
export DEFAULT_ROLE=visitor
```

Finally, in some cases the roles and or scopes in the decoded user object may come with an url such as `https://grandstack.io/roles` and `https://grandstack.io/scopes`, you can map these to `roles` and `scopes` respectively in your final user by providing the meta names comma seperated, e.g.
```sh
export USER_METAS="roles,scopes"
```

## Conditional permissions
This package includes the conditional based authorisation, for example: a mutation may have the scope `object: edit`, however you only wish some user to provide access if he/she is the owner of this object, the scope for this user might be `item: edit: isOwner`. What you need to do is configure query that is needed to check on whether this user is owner. See configuer below.

### Configure
Set the object id that is refered to: by default we provide preferene for `id` followed by `uid`. You can change this by setting the environment variable `OBJECT_IDENTIFIER`. By default it is thus set to the string `"id", "uid"`.  

Set the query for the condition, e.g. for `isOwner`.

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
