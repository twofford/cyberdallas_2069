export const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      email
    }
  }
`;

export const LOGOUT_MUTATION = /* GraphQL */ `
  mutation Logout {
    logout
  }
`;
