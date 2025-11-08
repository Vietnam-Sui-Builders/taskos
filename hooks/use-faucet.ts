import { useMutation } from "@tanstack/react-query";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";

export function useFaucet() {
  return useMutation({
    mutationFn: async (recipient: string) => {
      return await requestSuiFromFaucetV2({
        host: getFaucetHost("testnet"),
        recipient,
      });
    },
  });
}
