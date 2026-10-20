import fs from "fs/promises";

const SECRETS_AGENT_URL = "http://localhost:2773/secretsmanager/get";

/** Token file of the AWS Secrets Manager Agent; `SECRETS_AGENT_TOKEN_FILE` may override it. */
export const secretsAgentTokenFile = () =>
  (process.env.SECRETS_AGENT_TOKEN_FILE || "").trim() || "/var/run/awssmatoken";

/** Read a plain-text secret from the AWS Secrets Manager Agent running on this server. */
export const readSecret = async (secretId, tokenFile = secretsAgentTokenFile()) => {
  const token = (await fs.readFile(tokenFile, "utf8")).trim();
  const response = await fetch(`${SECRETS_AGENT_URL}?secretId=${encodeURIComponent(secretId)}`, {
    headers: { "X-Aws-Parameters-Secrets-Token": token },
  });
  if (!response.ok) throw new Error(`Secrets Manager Agent returned status ${response.status}.`);
  const { SecretString } = await response.json();
  if (typeof SecretString !== "string" || !SecretString) {
    throw new Error("Secret has no SecretString.");
  }
  return SecretString;
};
