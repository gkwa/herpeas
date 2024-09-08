interface CLIArgs {
  startUrl: string;
  domains?: string[];
}

export function parseArguments(): CLIArgs {
  const args = process.argv.slice(2);
  const startUrl = args[0];
  const domains: string[] = [];

  for (let i = 1; i < args.length; i += 2) {
    if (args[i] === "--domain" && i + 1 < args.length) {
      domains.push(args[i + 1]);
    }
  }

  return { startUrl, domains: domains.length > 0 ? domains : undefined };
}
