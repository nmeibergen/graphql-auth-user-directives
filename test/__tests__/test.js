import { createTestClient } from "apollo-server-testing";
import { server } from "../helpers/test-setup";

import gql from "graphql-tag";
import fetch from "node-fetch";
import { addCatchUndefinedToSchema } from "graphql-tools";

let client;

const headers = {
  "x-error": "Middleware error"
};

beforeAll(() => {});

afterAll(async done => {
  done();
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
    expect(result.errors[0].message).toEqual(
      "You are not authorized for this resource"
    );
  });
  test("Succes if visitor permissions is provided", async () => {
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
      expect(result.data.itemById.id).toEqual(expectedResult.name);
    } catch (e) {
      const x = 1;
    }

    expect.assertions(2);
  });
});

describe("Permission with a provided token", () => {
  test("Success if the required permissions are provided", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInJvbGUiOiJhZG1pbiJ9.Io4L4ougLgBQ9MWotu5I3MOFCoed6NIhsaaBJ2UXotc";

    server.mergeContext({
      req: { headers: { Authorization: `Bearer ${token}` } }
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
  test("Fail if insufficient permissions are provided", async () => {
    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTg4ODQ2NjU1LCJleHAiOjE2MjAzODI2NTUsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsInJvbGUiOiJhZG1pbiJ9.Io4L4ougLgBQ9MWotu5I3MOFCoed6NIhsaaBJ2UXotc";

    server.mergeContext({
      req: { headers: { Authorization: `Bearer ${token}` } }
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
        "You are not authorized for this resource"
      );
    } catch (e) {
      const x = 1;
    }

    expect.assertions(2);
  });
});
