import type { KeyServerConfig, SealClientOptions } from "@mysten/seal";
import { EncryptedObject, SealClient, SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import type { WalletAccount } from "@mysten/wallet-standard";
import { Transaction } from "@mysten/sui/transactions";
import { fromB64 } from "@mysten/sui/utils";

type SignPersonalMessage = (args: {
  message: Uint8Array;
  account?: WalletAccount | null;
  chain?: string;
}) => Promise<{ bytes: number[]; signature: string }>;

const parseSingleServerConfig = (raw: string): KeyServerConfig | null => {
  const [objectId, weightRaw] = raw.trim().split("@");
  if (!objectId) return null;

  const weight = weightRaw ? Number(weightRaw) : 1;
  if (Number.isNaN(weight) || weight <= 0) return null;

  return { objectId, weight };
};

export const parseKeyServerList = (input: string): KeyServerConfig[] => {
  if (!input.trim()) return [];
  return input
    .split(",")
    .map(parseSingleServerConfig)
    .filter((item): item is KeyServerConfig => Boolean(item));
};

export const DEFAULT_SERVER_CONFIGS: KeyServerConfig[] = parseKeyServerList(
  process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS ?? "",
);

export function createSealClient(
  suiClient: SuiClient,
  serverConfigs: KeyServerConfig[] = DEFAULT_SERVER_CONFIGS,
  options?: Omit<SealClientOptions, "suiClient" | "serverConfigs">,
) {
  if (!serverConfigs.length) {
    throw new Error(
      "No Seal key servers configured. Provide NEXT_PUBLIC_SEAL_KEY_SERVERS or pass serverConfigs.",
    );
  }

  return new SealClient({
    suiClient: suiClient as unknown as SealClientOptions["suiClient"],
    serverConfigs,
    ...options,
  });
}

export async function createSessionKeyWithWallet({
  address,
  packageId,
  ttlMinutes,
  suiClient,
  signPersonalMessage,
  mvrName,
  account,
}: {
  address: string;
  packageId: string;
  ttlMinutes?: number;
  suiClient: SuiClient;
  signPersonalMessage: SignPersonalMessage;
  mvrName?: string;
  account?: WalletAccount | null;
}) {
  const sessionKey = await SessionKey.create({
    address,
    packageId,
    ttlMin: ttlMinutes ?? 15,
    mvrName,
    suiClient: suiClient as unknown as any,
  });

  const { signature } = await signPersonalMessage({
    message: sessionKey.getPersonalMessage(),
    account,
  });

  await sessionKey.setPersonalMessageSignature(signature);
  return sessionKey;
}

export async function buildSealApproveTxBytes({
  packageId,
  taskId,
  identity,
  suiClient,
  sender,
}: {
  packageId: string;
  taskId: string;
  identity: string;
  suiClient: SuiClient;
  sender: string;
}) {
  const tx = new Transaction();
  tx.setSenderIfNotSet(sender);
  tx.moveCall({
    target: `${packageId}::task_manage::seal_approve`,
    arguments: [
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(identity))),
      tx.object(taskId),
    ],
  });

  const txBytes = await tx.build({ client: suiClient });
  return new Uint8Array(txBytes);
}

export function decodeEncryptedPayload(base64Payload: string) {
  const cleaned = base64Payload.trim();
  const bytes = fromB64(cleaned);
  const parsed = EncryptedObject.parse(bytes);

  return { bytes, parsed };
}
