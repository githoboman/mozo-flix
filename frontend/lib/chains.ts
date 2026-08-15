/**
 * lib/chains.ts
 * Multi-chain configuration for MOZOflix.
 *
 * Every chain-aware surface (wallet modal, reward flow, upload page,
 * transaction chips, explorer links) reads from this file so we can add
 * a new chain by adding one entry — no if/else scattered through the app.
 *
 * Right now: Stacks (testnet) is production, Base Sepolia is coming
 * online for the Base grant, Celo Alfajores is scaffolded but disabled.
 * Starknet and Sui slots are stubs so the discriminated union is stable
 * as we grow.
 */

export type ChainKind = "stacks" | "evm";

export type StacksChainConfig = {
  id: "stacks-mainnet" | "stacks-testnet";
  kind: "stacks";
  displayName: string;
  currency: {
    /** Human-readable label, e.g. "STX". */
    symbol: string;
    /** Number of decimals for display formatting. */
    decimals: number;
  };
  /** Deployer / contract-owner address. Used to build fully-qualified contract IDs. */
  contractOwner: string;
  /** Hiro explorer base URL. */
  explorerBase: string;
  /** Marker used for enabling/disabling a chain from the UI without deleting its config. */
  enabled: boolean;
  /** Which wallets the Wallet Modal should surface for this chain. */
  wallets: WalletProviderId[];
};

export type EvmChainConfig = {
  id: "base-sepolia" | "base-mainnet" | "celo-alfajores" | "celo-mainnet";
  kind: "evm";
  displayName: string;
  /** EIP-155 chain id, e.g. Base Sepolia is 84532. */
  chainId: number;
  currency: {
    symbol: string;
    decimals: number;
    /**
     * If the reward token is an ERC20 (USDC etc.), its contract address.
     * When undefined we treat the chain's native coin as the reward token.
     */
    tokenAddress?: `0x${string}`;
  };
  /** Address of the MozoflixRewards contract on this chain (empty until deployed). */
  rewardsContract?: `0x${string}`;
  rpcUrl: string;
  explorerBase: string;
  enabled: boolean;
  wallets: WalletProviderId[];
};

export type ChainConfig = StacksChainConfig | EvmChainConfig;

/**
 * Wallet providers known to the UI. When a wallet ships that we don't
 * know about, add it here and to WALLET_METADATA below — the modal
 * layer picks it up automatically.
 */
export type WalletProviderId =
  | "leather"
  | "xverse"
  | "metamask"
  | "coinbase-wallet"
  | "walletconnect"
  | "valora";

export const WALLET_METADATA: Record<
  WalletProviderId,
  { name: string; icon: string; installUrl: string; kind: ChainKind }
> = {
  leather: {
    name: "Leather",
    icon: "🟤",
    installUrl: "https://leather.io/install-extension",
    kind: "stacks",
  },
  xverse: {
    name: "Xverse",
    icon: "🔵",
    installUrl: "https://www.xverse.app/download",
    kind: "stacks",
  },
  metamask: {
    name: "MetaMask",
    icon: "🦊",
    installUrl: "https://metamask.io/download/",
    kind: "evm",
  },
  "coinbase-wallet": {
    name: "Coinbase Wallet",
    icon: "🔷",
    installUrl: "https://www.coinbase.com/wallet",
    kind: "evm",
  },
  walletconnect: {
    name: "WalletConnect",
    icon: "🔗",
    installUrl: "https://walletconnect.com/",
    kind: "evm",
  },
  valora: {
    name: "Valora",
    icon: "🟩",
    installUrl: "https://valora.xyz/",
    kind: "evm",
  },
};

const STACKS_CONTRACT_OWNER =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";

const isStacksMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";

export const CHAINS: ChainConfig[] = [
  // ---------- Stacks ----------
  {
    id: isStacksMainnet ? "stacks-mainnet" : "stacks-testnet",
    kind: "stacks",
    displayName: isStacksMainnet ? "Stacks" : "Stacks Testnet",
    currency: { symbol: "STX", decimals: 6 },
    contractOwner: STACKS_CONTRACT_OWNER,
    explorerBase: isStacksMainnet
      ? "https://explorer.hiro.so"
      : "https://explorer.hiro.so",
    enabled: true,
    wallets: ["leather", "xverse"],
  },

  // ---------- Base ----------
  {
    id: "base-sepolia",
    kind: "evm",
    displayName: "Base Sepolia",
    chainId: 84532,
    currency: {
      symbol: "USDC",
      decimals: 6,
      // Base Sepolia USDC (Circle-issued testnet USDC)
      tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    },
    rewardsContract: (process.env.NEXT_PUBLIC_BASE_REWARDS_CONTRACT ??
      undefined) as `0x${string}` | undefined,
    rpcUrl: "https://sepolia.base.org",
    explorerBase: "https://sepolia.basescan.org",
    enabled: true,
    wallets: ["metamask", "coinbase-wallet", "walletconnect"],
  },
  {
    id: "base-mainnet",
    kind: "evm",
    displayName: "Base",
    chainId: 8453,
    currency: {
      symbol: "USDC",
      decimals: 6,
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
    rewardsContract: undefined,
    rpcUrl: "https://mainnet.base.org",
    explorerBase: "https://basescan.org",
    enabled: false, // flip on once contract is deployed and audited
    wallets: ["metamask", "coinbase-wallet", "walletconnect"],
  },

  // ---------- Celo ----------
  {
    id: "celo-alfajores",
    kind: "evm",
    displayName: "Celo Alfajores",
    chainId: 44787,
    currency: {
      symbol: "cUSD",
      decimals: 18,
      tokenAddress: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    },
    rewardsContract: (process.env.NEXT_PUBLIC_CELO_REWARDS_CONTRACT ??
      undefined) as `0x${string}` | undefined,
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    explorerBase: "https://alfajores.celoscan.io",
    enabled: false, // scaffolded, off by default
    wallets: ["metamask", "walletconnect", "valora"],
  },
  {
    id: "celo-mainnet",
    kind: "evm",
    displayName: "Celo",
    chainId: 42220,
    currency: {
      symbol: "cUSD",
      decimals: 18,
      tokenAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    },
    rewardsContract: undefined,
    rpcUrl: "https://forno.celo.org",
    explorerBase: "https://celoscan.io",
    enabled: false,
    wallets: ["metamask", "walletconnect", "valora"],
  },
];

/** All chains currently exposed in the UI. */
export function enabledChains(): ChainConfig[] {
  return CHAINS.filter((c) => c.enabled);
}

export function getChain(id: ChainConfig["id"]): ChainConfig | undefined {
  return CHAINS.find((c) => c.id === id);
}

export function getChainByEvmChainId(
  chainId: number,
): EvmChainConfig | undefined {
  return CHAINS.find(
    (c): c is EvmChainConfig => c.kind === "evm" && c.chainId === chainId,
  );
}

/** The default chain a first-time visitor lands on. Stacks for now. */
export function defaultChain(): ChainConfig {
  const stacks = CHAINS.find((c) => c.kind === "stacks" && c.enabled);
  return stacks ?? enabledChains()[0]!;
}

/** Build a per-chain explorer URL for a tx hash. Handles the 0x prefix quirk on Stacks. */
export function explorerTxUrl(chain: ChainConfig, txId: string): string {
  if (chain.kind === "stacks") {
    const clean = txId.startsWith("0x") ? txId : `0x${txId}`;
    const network = chain.id === "stacks-mainnet" ? "mainnet" : "testnet";
    return `${chain.explorerBase}/txid/${clean}?chain=${network}`;
  }
  return `${chain.explorerBase}/tx/${txId}`;
}

export function explorerAddressUrl(
  chain: ChainConfig,
  address: string,
): string {
  if (chain.kind === "stacks") {
    const network = chain.id === "stacks-mainnet" ? "mainnet" : "testnet";
    return `${chain.explorerBase}/address/${address}?chain=${network}`;
  }
  return `${chain.explorerBase}/address/${address}`;
}