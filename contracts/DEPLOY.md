# Deploying MOZOflix contracts to Stacks Testnet

End-to-end checklist for deploying all 5 contracts to testnet.

---

## 1. Generate a testnet keychain

You need a 24-word seed phrase for the deployer account. **Use a fresh one — never your personal wallet seed.**

### Option A — Stacks CLI (recommended, scriptable)

```bash
npx @stacks/cli make_keychain -t
```

Output looks like:
```json
{
  "mnemonic": "twelve to twenty-four words ...",
  "keyInfo": {
    "privateKey": "...",
    "address": "ST...",
    "btcAddress": "..."
  }
}
```

Copy the **mnemonic** and the **address** (starts with `ST`).

### Option B — Leather / Xverse

1. Install [Leather](https://leather.io) or [Xverse](https://xverse.app)
2. Create a new wallet, **save the seed phrase**
3. Switch the wallet to **testnet** (Settings → Network)
4. Copy your testnet address (starts with `ST`)
5. Reveal the seed phrase in Settings to use as the deployer mnemonic

---

## 2. Fund the testnet account

The deployer needs STX to pay deployment fees (~5 STX total for 5 contracts).

Visit: <https://platform.hiro.so/faucet>

Paste your testnet address (`ST...`) and request testnet STX. Wait ~30 seconds for confirmation.

Verify balance:
```bash
curl https://api.testnet.hiro.so/extended/v1/address/ST_YOUR_ADDRESS/balances
```

---

## 3. Configure `settings/Testnet.toml`

Open `contracts/settings/Testnet.toml` and replace the placeholder:

```toml
[network]
name = "testnet"
stacks_node_rpc_address = "https://api.testnet.hiro.so"
deployment_fee_rate = 10

[accounts.deployer]
mnemonic = "your 24-word mnemonic here separated by single spaces"
```

> ⚠️ **Do not commit this file with a real mnemonic.** Add a `.gitignore` rule
> or use `git update-index --assume-unchanged contracts/settings/Testnet.toml`.

---

## 4. Generate the deployment plan

```bash
cd contracts
clarinet deployments generate --testnet
```

This creates `deployments/default.testnet-plan.yaml` listing every contract
in the dependency-correct order:

1. `mozoflix-admin`     (no deps)
2. `mozoflix-videos`    (no deps)
3. `mozoflix-creators`  (depends on admin)
4. `mozoflix-rewards`   (depends on admin + videos)
5. `mozoflix-referrals` (depends on admin)

Inspect it before applying.

---

## 5. Apply the plan

```bash
clarinet deployments apply --testnet
```

You'll be prompted to confirm. Each contract is deployed in a separate
transaction. Total time: ~5–10 minutes (one tx per Stacks block).

---

## 6. Verify deployment

Once applied, your contracts will be at `<deployer-address>.<contract-name>`.

Check each on the Hiro Explorer:

```
https://explorer.hiro.so/address/ST_YOUR_ADDRESS?chain=testnet
```

You should see 5 successful contract-deploy transactions.

---

## 7. Wire the frontend

Add your deployer address to `frontend/.env.local`:

```bash
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=ST_YOUR_ADDRESS
```

Restart the Next.js dev server and `lib/stacks.ts` will now point at your
live testnet contracts.

---

## 8. Bootstrap admin

After deployment, the deployer is the contract owner of `mozoflix-admin`.
Authorize your platform backend wallet (the one that will call
`distribute-reward`) by running this contract call from the deployer wallet:

```clarity
(contract-call? .mozoflix-admin set-authorized 'ST_BACKEND_ADDRESS true)
```

You can do this via:
- Hiro Explorer's contract-call sandbox
- A one-shot script using `@stacks/transactions`
- The MOZOflix admin UI (if/when we build one)

---

## 9. Optional: auto-redeploy on contract changes

If you change a contract, regenerate the plan:

```bash
clarinet deployments generate --testnet
```

It diffs against the current on-chain state. Then `apply --testnet` again.

---

## Troubleshooting

| Error | Fix |
|---|---|
| `mnemonic has an invalid word count` | Use a real 24-word phrase — not 12 |
| `insufficient balance` | Hit the faucet again, wait for confirmation |
| `contract already exists` | The deployer already owns that contract name on testnet — delete and redeploy under a different deployer, or use new contract names |
| `nonce mismatch` | Wait 30s, retry. Stacks needs each tx in its own block |
