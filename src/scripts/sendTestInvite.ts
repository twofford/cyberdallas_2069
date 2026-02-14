import { pathToFileURL } from 'node:url';

export type SendTestInviteOptions = {
  graphqlUrl: string;
  ownerEmail: string;
  ownerPassword: string;
  campaignId: string;
  inviteEmail: string;
};

type GraphqlResponse<T> = {
  data: T | null;
  errors?: Array<{ message?: string }>;
};

type GraphqlRequestResult<T> = {
  body: GraphqlResponse<T>;
  setCookie: string | null;
};

async function graphqlRequest<T>(input: {
  url: string;
  query: string;
  variables?: Record<string, unknown>;
  cookie?: string;
}): Promise<GraphqlRequestResult<T>> {
  const origin = new URL(input.url).origin;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    origin,
  };
  if (input.cookie) headers.cookie = input.cookie;

  const response = await fetch(input.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: input.query, variables: input.variables }),
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON response from GraphQL (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`);
  }

  return {
    body: parsed as GraphqlResponse<T>,
    setCookie: response.headers.get('set-cookie'),
  };
}

function firstErrorMessage(errors: GraphqlResponse<unknown>['errors']): string {
  if (!errors?.length) return '';
  return String(errors[0]?.message ?? '');
}

function cookiePairFromSetCookie(setCookie: string | null): string {
  return (setCookie?.split(';')[0] ?? '').trim();
}

async function getAuthCookie(options: SendTestInviteOptions): Promise<string> {
  const loginQuery = /* GraphQL */ `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        user {
          id
        }
      }
    }
  `;

  const registerQuery = /* GraphQL */ `
    mutation Register($email: String!, $password: String!) {
      register(email: $email, password: $password) {
        user {
          id
        }
      }
    }
  `;

  const variables = { email: options.ownerEmail, password: options.ownerPassword };

  const login = await graphqlRequest<{ login: { user: { id: string } } }>({
    url: options.graphqlUrl,
    query: loginQuery,
    variables,
  });

  const loginCookie = cookiePairFromSetCookie(login.setCookie);
  if (login.body.data?.login?.user?.id && loginCookie) return loginCookie;

  const loginMsg = firstErrorMessage(login.body.errors);
  const shouldTryRegister = /invalid credentials/i.test(loginMsg) || /not authenticated/i.test(loginMsg);

  if (!shouldTryRegister) {
    throw new Error(loginMsg || 'Login failed');
  }

  const register = await graphqlRequest<{ register: { user: { id: string } } }>({
    url: options.graphqlUrl,
    query: registerQuery,
    variables,
  });

  const registerCookie = cookiePairFromSetCookie(register.setCookie);
  if (register.body.data?.register?.user?.id && registerCookie) return registerCookie;

  const registerMsg = firstErrorMessage(register.body.errors);
  if (/already exists/i.test(registerMsg)) {
    const retry = await graphqlRequest<{ login: { user: { id: string } } }>({
      url: options.graphqlUrl,
      query: loginQuery,
      variables,
    });
    const retryCookie = cookiePairFromSetCookie(retry.setCookie);
    if (retry.body.data?.login?.user?.id && retryCookie) return retryCookie;
    throw new Error(firstErrorMessage(retry.body.errors) || 'Login failed');
  }

  throw new Error(registerMsg || 'Register failed');
}

export async function runSendTestInvite(
  options: SendTestInviteOptions,
): Promise<{ inviteToken: string; expiresAt: string }> {
  const cookie = await getAuthCookie(options);

  // Backdoor: first joiner becomes owner.
  const join = await graphqlRequest<{ joinCampaign: { id: string } }>({
    url: options.graphqlUrl,
    query: /* GraphQL */ `
      mutation {
        joinCampaign(campaignId: "${options.campaignId}") {
          id
        }
      }
    `,
    cookie,
  });

  if (!join.body.data?.joinCampaign?.id) {
    throw new Error(firstErrorMessage(join.body.errors) || 'joinCampaign failed');
  }

  const invite = await graphqlRequest<{ createCampaignInvite: { token: string; expiresAt: string } }>({
    url: options.graphqlUrl,
    query: /* GraphQL */ `
      mutation CreateInvite($campaignId: ID!, $email: String!) {
        createCampaignInvite(campaignId: $campaignId, email: $email) {
          token
          expiresAt
        }
      }
    `,
    variables: { campaignId: options.campaignId, email: options.inviteEmail },
    cookie,
  });

  if (!invite.body.data?.createCampaignInvite?.token) {
    throw new Error(firstErrorMessage(invite.body.errors) || 'createCampaignInvite failed');
  }

  return {
    inviteToken: invite.body.data.createCampaignInvite.token,
    expiresAt: invite.body.data.createCampaignInvite.expiresAt,
  };
}

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  return value;
}

function buildDefaultGraphqlUrl(): string {
  const base = getEnv('APP_BASE_URL') ?? 'http://localhost:3001';
  return `${base.replace(/\/$/, '')}/api/graphql`;
}

async function runCli(): Promise<void> {
  const graphqlUrl = getEnv('GRAPHQL_URL') ?? buildDefaultGraphqlUrl();

  const ownerEmail = getEnv('OWNER_EMAIL') ?? `owner+${Date.now()}@example.com`;
  const ownerPassword = getEnv('OWNER_PASSWORD') ?? 'password1234!';

  const campaignId = getEnv('CAMPAIGN_ID') ?? 'camp_1';
  const inviteEmail = getEnv('INVITE_EMAIL') ?? 'taylor.wofford@gmail.com';

  const { inviteToken, expiresAt } = await runSendTestInvite({
    graphqlUrl,
    ownerEmail,
    ownerPassword,
    campaignId,
    inviteEmail,
  });

  // Avoid printing secrets; only print operational info.
  // If email is enabled and SMTP is configured, the invite should arrive at INVITE_EMAIL.
  console.log(`Invite created for ${inviteEmail}`);
  console.log(`Campaign: ${campaignId}`);
  console.log(`Expires at: ${expiresAt}`);
  console.log(`Token: ${inviteToken}`);
}

const isRunDirectly = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
if (isRunDirectly) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
