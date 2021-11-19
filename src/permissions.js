import { UserInputError } from "apollo-server-express";

// dictionary with indicator of condition and function to retrieve conditional query based on userId and crudObjectId
export let conditionalQueryMap = new Map(); // initialize as empty map -> editable by end user

export const satisfiesScopes = async (
  driver,
  scopes,
  userScopes,
  user,
  objectId
) => {
  if (!Array.isArray(scopes)) scopes = [scopes];
  if (!Array.isArray(userScopes)) userScopes = [userScopes];

  // Get all scopes that might be verified as these are found in the user Scopes.
  // This corresponds to all exact scope matches, as well as all conditional scope matches, e.g.
  // if the scope required is 'item:edit', then scopes to verify are both 'item:edit' as well as
  // 'item:edit:somecondition'. If the scope 'item:edit:somecondition' is required, then only this conditional scope
  // is matched on.
  const ListOfScopesToVerify = scopes.map(scope => {
    return userScopes.filter(userScope => {
      return userScope.indexOf(scope) === 0;
    });
  });
  const scopesToVerifyDuplicates = [].concat.apply([], ListOfScopesToVerify);
  const scopesToVerify = [...new Set(scopesToVerifyDuplicates)]; // remove duplicates

  // extract conditional and non conditional scopes
  const nonConditionalScopes = scopesToVerify.filter(
    scope => scope.split(":").length === 2
  );
  const conditionalScopes = scopesToVerify.filter(
    scope => scope.split(":").length === 3
  );

  // check non conditional scopes (easiest to verify)
  if (nonConditionalScopes.length > 0) return true;

  if (conditionalScopes.length > 0) {
    return await checkConditionalScopes(
      driver,
      conditionalScopes,
      user,
      objectId
    );
  } else {
    return false;
  }
};

export const satisfiesConditionalScopes = async (
  driver,
  scopes,
  userScopes,
  user,
  objectId,
  no_intersection_result = false
) => {
  // set conditions to be an array
  if (!Array.isArray(scopes)) scopes = [scopes];
  if (!Array.isArray(userScopes)) userScopes = [userScopes];

  // intersection of requiredScopes and userScopes
  const conditionalScopes = scopes.filter(scope => userScopes.includes(scope));

  if (conditionalScopes.length === 0) return no_intersection_result;

  if (driver) {
    return await checkConditionalScopes(
      driver,
      conditionalScopes,
      user,
      objectId
    );
  } else {
    return false;
  }
};

export const checkConditionalScopes = async (
  driver,
  scopes,
  user,
  objectId
) => {
  // if no driver has been provided throw error
  if (driver == null) {
    throw new Error(
      "No driver to the database is provided, therefore conditional scopes cannot be verified."
    );
  }

  // set conditions to be an array
  if (!Array.isArray(scopes)) scopes = [scopes];

  const crudObjects = scopes.map(scope => {
    const brokenUp = scope.split(":");
    return brokenUp[0].trim();
  });

  if (!crudObjects.every((val, i, arr) => val === arr[0])) {
    throw new UserInputError("All crud objects must be the same");
  }
  const crudObject = crudObjects[0];

  const conditions = scopes.map(scope => {
    const brokenUp = scope.split(":");
    return crudObject + ":" + brokenUp[brokenUp.length - 1].trim();
  });

  let query = "WITH false AS result";
  conditions.forEach(condition => {
    // Todo: first check the existence of the condition in the conditionalQueryMap
    const conditionalQuery = conditionalQueryMap.get(condition);
    if (conditionalQuery) {
      query = `${query}
            ${conditionalQuery(user, objectId)}, result
            WITH result OR is_allowed as result`; // if we find a single occurrence of true, then result is true
    }
  });
  query = `${query}
    RETURN result as result`;

  try {
    const result = await driver.session().run(query);
    return result.records[0].get("result");
  } catch (e) {
    return false;
  }
};
