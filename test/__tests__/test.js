import { createTestClient } from "apollo-server-testing";
import { scopes } from "../helpers/test-data";
import { server } from "../helpers/test-setup";

import gql from "graphql-tag";

beforeAll(() => {});

afterAll(async done => {
  done();
});

beforeEach(() => {
  server.mergeContext({
    req: {
      headers: {}
    },
    user: null
  });
});

describe("Permissions without a provided token", () => {
  test("Fail if no visitor access is provided", async () => {
    const { query, mutate } = createTestClient(server);

    const result = await query({
      query: gql`
        {
          userById(userId: "123456") {
            id
            name
          }
        }
      `
    });

    expect(result.data.userById).toBeNull();
    expect(result.errors[0].message).toEqual("No authorization token.");
  });
  test("Fail if wrong token is provided", async () => {
    const token = "awefawe";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    const result = await query({
      query: gql`
        {
          userById(userId: "123456") {
            id
            name
          }
        }
      `
    });

    expect(result.data.userById).toBeNull();
    expect(result.errors[0].message).toEqual(
      "You are not authorized for this resource."
    );
  });
  test("Success if visitor permissions is provided", async () => {
    const { query, mutate } = createTestClient(server);

    try {
      const result = await query({
        query: gql`
          {
            itemById(itemId: 1) {
              id
              name
            }
          }
        `
      });

      const expectedResult = {
        id: "123",
        name: "bob"
      };

      expect(result.data.itemById.id).toEqual(expectedResult.id);
      expect(result.data.itemById.name).toEqual(expectedResult.name);
    } catch (e) {
      const x = 1;
    }

    expect.assertions(2);
  });
});

describe("Permission with a provided token", () => {
  test("Success if the required permissions are provided in the form of role based permissions", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInJvbGUiOiJhZG1pbiJ9.Io4L4ougLgBQ9MWotu5I3MOFCoed6NIhsaaBJ2UXotc";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    try {
      const result = await mutate({
        mutation: gql`
          mutation {
            createItem(id: 1, name: "test") {
              id
            }
          }
        `
      });

      expect(result.data.createItem.id).toEqual(1);
    } catch (e) {}

    expect.assertions(1);
  });
  test("Fail if insufficient permissions are provided in the form of role based permissions", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInJvbGUiOiJhZG1pbiJ9.Io4L4ougLgBQ9MWotu5I3MOFCoed6NIhsaaBJ2UXotc";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    try {
      const result = await mutate({
        mutation: gql`
          mutation {
            createUser(id: 1, name: "test") {
              id
            }
          }
        `
      });

      expect(result.data.createUser).toBeNull();
      expect(result.errors[0].message).toEqual(
        "You are not authorized for this resource."
      );
    } catch (e) {
      const x = 1;
    }

    expect.assertions(2);
  });
  test("Success if the required permissions are provided in the form of scopes", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInNjb3BlIjoidXNlcjpkZWxldGUifQ.YJ1AFRWLyVINzDKvLZhHHGtrjvLQDGGKa6OcHowedik";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    try {
      const result = await mutate({
        mutation: gql`
          mutation {
            deleteUser(id: 1) {
              id
            }
          }
        `
      });

      expect(result.data.deleteUser.id).toEqual(1);
    } catch (e) {}

    expect.assertions(1);
  });
  test("Fail if insufficient permissions are provided in the form of scopes", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInNjb3BlIjoidXNlcjpkZWxldGUifQ.YJ1AFRWLyVINzDKvLZhHHGtrjvLQDGGKa6OcHowedik";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    try {
      const result = await mutate({
        mutation: gql`
          mutation {
            createUser(id: 1, name: "test") {
              id
            }
          }
        `
      });

      expect(result.data.createUser).toBeNull();
      expect(result.errors[0].message).toEqual(
        "You are not authorized for this resource."
      );
    } catch (e) {
      const x = 1;
    }

    expect.assertions(2);
  });
});

describe("@hasScope: Roles and permissions are attached to the user", () => {
  test("Visitor roles are attached if no token is provided", async () => {
    const { query, mutate } = createTestClient(server);

    const result = await query({
      query: gql`
        query {
          me {
            roles
            scopes
          }
        }
      `
    });

    expect(result.data.me.roles).toEqual("visitor");
    expect(result.data.me.scopes).toEqual(scopes.visitor);
  });
  test("Admin roles and scopes are attached if a token is provided", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInJvbGUiOiJhZG1pbiJ9.Io4L4ougLgBQ9MWotu5I3MOFCoed6NIhsaaBJ2UXotc";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    const result = await query({
      query: gql`
        query {
          me {
            roles
            scopes
          }
        }
      `
    });

    expect(result.data.me.roles).toEqual("admin");
    expect(result.data.me.scopes).toEqual(scopes.admin);
  });
  test("Admin roles and scopes are attached if a token is provided with multiple roles - using meta mapper: https://www.example.com/role", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MDUyODIwNjgsImV4cCI6MTc2MzA0ODQ2OCwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6Ik5hdGhhbiIsIlN1cm5hbWUiOiJNZWliZXJnZW4iLCJFbWFpbCI6Im5tQGVpLmNvbSIsImh0dHA6Ly93d3cuZXhhbXBsZS5jb20vcm9sZSI6WyJhZG1pbiIsImVkaXRvciJdfQ.TOP75bHu-lI4ZXRBl7L5cud_W68L1u9r9DtBH3qRnFs";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    const result = await query({
      query: gql`
        query {
          me {
            roles
            scopes
          }
        }
      `
    });

    expect(result.data.me.roles).toEqual(["admin", "editor"]);
    expect(result.data.me.scopes).toEqual(scopes.admin.concat(scopes.editor));
  });
  test("Unauthorised if conditional permission is not satisfies", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MDY1NjYzMTYsImV4cCI6MTYzODEwMjMxNiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJodHRwOi8vd3d3LmV4YW1wbGUuY29tL3JvbGUiOiJlZGl0b3IifQ.66saNhPHBzNBOCXnuR4JptnKOKTPpCr0KjRqhvLcc5U";

    // mock driver query function
    let query_result = new Map();
    let query_result_error = new Map();
    query_result.set("result", false);
    query_result_error.set("result", true);
    const driver = {
      session: () => {
        return {
          run: async query => {
            if (
              query ===
              `WITH false AS result
            WITH false as is_allowed, result
            WITH result OR is_allowed as result
    RETURN result as result`
            ) {
              return { records: [query_result] };
            } else {
              return { records: [query_result_error] };
            }
          }
        };
      }
    };

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } },
      driver: driver
    });

    const { query, mutate } = createTestClient(server);

    const result = await mutate({
      mutation: gql`
        mutation {
          updateItemConditionfalse(id: 1, name: "newname") {
            id
            name
          }
        }
      `
    });

    expect(result.errors[0].message).toEqual(
      "You are not authorized for this resource."
    );
  });
  test("Authorised if conditional permission is satisfied", async () => {
    // mock driver query function
    let query_result = new Map();
    let query_result_error = new Map();
    query_result.set("result", true);
    query_result_error.set("result", false);
    const driver = {
      session: () => {
        return {
          run: async query => {
            if (
              query ===
              `WITH false AS result
            WITH true as is_allowed, result
            WITH result OR is_allowed as result
    RETURN result as result`
            ) {
              return { records: [query_result] };
            } else {
              return { records: [query_result_error] };
            }
          }
        };
      }
    };

    server.mergeContext({
      req: {},
      driver: driver
    });

    const { query, mutate } = createTestClient(server);

    const result = await mutate({
      mutation: gql`
        mutation {
          updateItemConditiontrue(id: 1, name: "newname") {
            id
            name
          }
        }
      `
    });

    expect(result.data.updateItemConditiontrue.id).toEqual("123");
  });
  test("Conditional permission is checked if the equivalent nonconditional scope is required", async () => {
    // mock driver query function
    let query_result = new Map();
    let query_result_error = new Map();
    query_result.set("result", true);
    query_result_error.set("result", false);
    const driver = {
      session: () => {
        return {
          run: async query => {
            if (
              query ===
              `WITH false AS result
            WITH true as is_allowed, result
            WITH result OR is_allowed as result
    RETURN result as result`
            ) {
              return { records: [query_result] };
            } else {
              return { records: [query_result_error] };
            }
          }
        };
      }
    };

    server.mergeContext({
      req: {},
      driver: driver
    });

    const { query, mutate } = createTestClient(server);

    const result = await mutate({
      mutation: gql`
        mutation {
          updateItem(id: 1, name: "newname") {
            id
            name
          }
        }
      `
    });

    expect(result.data.updateItem.id).toEqual("123");
  });
  test("Multiple conditional permissions are successfully handled", async () => {
    // mock driver query function
    let query_result = new Map();
    let query_result_error = new Map();
    query_result.set("result", true);
    query_result_error.set("result", false);
    const driver = {
      session: () => {
        return {
          run: async query => {
            if (
              query ===
              `WITH false AS result
            WITH true as is_allowed, result
            WITH result OR is_allowed as result
    RETURN result as result`
            ) {
              return { records: [query_result] };
            } else {
              return { records: [query_result_error] };
            }
          }
        };
      }
    };

    server.mergeContext({
      req: {},
      driver: driver
    });

    const { query, mutate } = createTestClient(server);

    const result = await mutate({
      mutation: gql`
        mutation {
          updateItemMultiCondition(id: 1, name: "newname") {
            id
            name
          }
        }
      `
    });

    expect(result.data.updateItemMultiCondition.id).toEqual("123");
  });
  test("Throw driver missing error if no driver is provided when needed", async () => {
    server.mergeContext({
      req: {},
      driver: null
    });

    const { query, mutate } = createTestClient(server);

    const result = await mutate({
      mutation: gql`
        mutation {
          updateItemConditiontrue(id: 1, name: "newname") {
            id
            name
          }
        }
      `
    });

    expect(result.errors[0].message).toEqual(
      "No driver to the database is provided, therefore conditional scopes cannot be verified."
    );
  });
});

describe("@isAuthenticated: Roles and permissions are attached to the user", () => {
  test("Admin roles and scopes are attached if a token is provided", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInJvbGUiOiJhZG1pbiJ9.Io4L4ougLgBQ9MWotu5I3MOFCoed6NIhsaaBJ2UXotc";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    const result = await query({
      query: gql`
        query {
          authMe {
            roles
            scopes
          }
        }
      `
    });

    expect(result.data.authMe.roles).toEqual("admin");
    expect(result.data.authMe.scopes).toEqual(scopes.admin);
  });
});

describe("@hasRole: Roles and permissions are attached to the user", () => {
  test("Visitor roles are attached if no token is provided", async () => {
    const { query, mutate } = createTestClient(server);

    const result = await query({
      query: gql`
        query {
          roleMe {
            roles
          }
        }
      `
    });

    expect(result.data.roleMe.roles).toEqual("visitor");
  });
  test("Admin roles are attached if a token is provided", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInJvbGUiOiJhZG1pbiJ9.Io4L4ougLgBQ9MWotu5I3MOFCoed6NIhsaaBJ2UXotc";

    server.mergeContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });

    const { query, mutate } = createTestClient(server);

    const result = await query({
      query: gql`
        query {
          roleMe {
            roles
          }
        }
      `
    });

    expect(result.data.roleMe.roles).toEqual("admin");
  });
});
