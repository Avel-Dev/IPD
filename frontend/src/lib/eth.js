export const HARDHAT_CHAIN_ID_HEX = "0x7a69"; // 31337
export const HARDHAT_CHAIN_ID_DEC = 31337;

export const HARDHAT_NETWORK = {
  chainId: HARDHAT_CHAIN_ID_HEX,
  chainName: "Hardhat Local",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: []
};

export function shortenAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function getEthereum() {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

