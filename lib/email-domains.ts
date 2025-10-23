// Helper function to check if an email is from a personal email provider
export function isPersonalEmailDomain(email: string): boolean {
  const personalDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'protonmail.com',
    'mail.com',
    'zoho.com',
    'yandex.com',
    'live.com',
    'me.com',
    'msn.com'
  ];

  const domain = email.toLowerCase().split('@')[1];
  return personalDomains.includes(domain);
}

