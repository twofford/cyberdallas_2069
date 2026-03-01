import nodemailer from 'nodemailer';

export type SendInviteEmailInput = {
  to: string;
  campaignName: string;
  inviteUrl: string;
  expiresAtIso: string;
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  return value;
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  return value.toLowerCase() === 'true' || value === '1';
}

export async function sendCampaignInviteEmail(input: SendInviteEmailInput): Promise<void> {
  // Keep tests hermetic.
  if (process.env.NODE_ENV === 'test') return;

  // Allow disabling email in environments like E2E.
  if (process.env.DISABLE_EMAIL === 'true') return;

  const host = getEnv('SMTP_HOST');
  const port = Number(getEnv('SMTP_PORT') ?? '587');
  const secure = parseBool(getEnv('SMTP_SECURE'));
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');
  const from = getEnv('SMTP_FROM');

  if (!host) throw new Error('Email not configured: SMTP_HOST is missing');
  if (!from) throw new Error('Email not configured: SMTP_FROM is missing');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  const subject = `You’ve been invited to join ${input.campaignName}`;
  const text = [
    `You’ve been invited to join the campaign: ${input.campaignName}`,
    '',
    `Accept this invite: ${input.inviteUrl}`,
    '',
    `This invite expires at: ${input.expiresAtIso}`,
  ].join('\n');

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    text,
  });
}
