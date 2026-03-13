export const HARDHAT_CHAIN_ID_HEX = "0x7a69"; // 31337
export const HARDHAT_CHAIN_ID_DEC = 31337;

export const HARDHAT_NETWORK = {
  chainId: HARDHAT_CHAIN_ID_HEX,
  chainName: "Hardhat Local",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: []
};

const NETWORK_NAME_BY_CHAIN_ID = {
  1: "Ethereum Mainnet",
  11155111: "Sepolia Testnet",
  [HARDHAT_CHAIN_ID_DEC]: "Hardhat Local Network"
};

export function getReadableNetworkName(chainId, fallbackName) {
  if (!chainId && chainId !== 0) return fallbackName || "-";
  const numId = Number(chainId);
  if (Number.isNaN(numId)) return fallbackName || "Unknown Network";
  return NETWORK_NAME_BY_CHAIN_ID[numId] || fallbackName || "Unknown Network";
}

export function shortenAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function getEthereum() {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

