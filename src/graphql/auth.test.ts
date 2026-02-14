import { describe, expect, it } from 'vitest';

import { createYogaServer } from './yoga';

describe('auth', () => {
  it('registers a user and allows querying me', async () => {
    const yoga = createYogaServer();

    const registerResponse = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user {
                id
                email
              }
            }
          }
        `,
        variables: {
          email: 'alice@example.com',
          password: 'correct-horse-battery-staple',
        },
      }),
    });

    expect(registerResponse.status).toBe(200);
    const registerBody = await registerResponse.json();
    expect(registerBody.errors).toBeUndefined();
    expect(registerBody.data.register.user.email).toBe('alice@example.com');

    const setCookie = registerResponse.headers.get('set-cookie');
    const cookieHeader = (setCookie?.split(';')[0] ?? '').trim();
    expect(cookieHeader).toMatch(/=/);

    const meResponse = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Me {
            me {
              id
              email
            }
          }
        `,
      }),
    });

    expect(meResponse.status).toBe(200);
    const meBody = await meResponse.json();
    expect(meBody.errors).toBeUndefined();
    expect(meBody.data.me.email).toBe('alice@example.com');
  });

  it('canonicalizes emails to lowercase', async () => {
    const yoga = createYogaServer();

    const registerResponse = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user {
                id
                email
              }
            }
          }
        `,
        variables: {
          email: 'Alice@Example.COM',
          password: 'correct-horse-battery-staple',
        },
      }),
    });

    expect(registerResponse.status).toBe(200);
    const registerBody = await registerResponse.json();
    expect(registerBody.errors).toBeUndefined();
    expect(registerBody.data.register.user.email).toBe('alice@example.com');

    const setCookie = registerResponse.headers.get('set-cookie');
    const cookieHeader = (setCookie?.split(';')[0] ?? '').trim();
    expect(cookieHeader).toMatch(/=/);

    const meResponse = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Me {
            me {
              id
              email
            }
          }
        `,
      }),
    });

    expect(meResponse.status).toBe(200);
    const meBody = await meResponse.json();
    expect(meBody.errors).toBeUndefined();
    expect(meBody.data.me.email).toBe('alice@example.com');
  });

  it('rejects duplicate registrations', async () => {
    const yoga = createYogaServer();

    const mutation = /* GraphQL */ `
      mutation Register($email: String!, $password: String!) {
        register(email: $email, password: $password) {
          user {
            id
            email
          }
        }
      }
    `;

    const first = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ variables: { email: 'bob@example.com', password: 'pw12345678' }, query: mutation }),
    });
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.errors).toBeUndefined();

    const second = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ variables: { email: 'bob@example.com', password: 'pw12345678' }, query: mutation }),
    });

    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.data).toBeNull();
    expect(secondBody.errors?.[0]?.message ?? '').toMatch(/already exists|duplicate/i);
  });

  it('rejects invalid login credentials', async () => {
    const yoga = createYogaServer();

    await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user {
                id
              }
            }
          }
        `,
        variables: { email: 'carol@example.com', password: 'valid-password-123' },
      }),
    });

    const loginResponse = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              user {
                email
              }
            }
          }
        `,
        variables: { email: 'carol@example.com', password: 'wrong-password' },
      }),
    });

    expect(loginResponse.status).toBe(200);
    const body = await loginResponse.json();
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.message ?? '').toMatch(/invalid credentials/i);
  });
});
