# Project PRD: MOZOflix

## 1. Product Overview
MOZOflix is a premium "watch-to-earn" video platform built on the Stacks blockchain (Bitcoin Layer 2). It bridges the gap between high-quality content consumption and Web3 incentives, allowing viewers to earn STX tokens for their attention while providing creators with a direct, transparent way to fund and reward their audience.

### Value Proposition
*   **For Viewers:** Earn real STX rewards for watching content, with guaranteed on-chain payouts.
*   **For Creators:** Grow a loyal audience by funding reward pools directly via Clarity smart contracts.
*   **For the Ecosystem:** Increase activity on the Stacks blockchain through high-frequency, consumer-facing interactions.

---

## 2. Design System & Visual Identity
The visual language is "Cinematic Futurist"—premium, editorial, and Web3-native.

### Brand Tokens
*   **Primary Color:** MOZO Orange (`#FF6B00`)
*   **Backgrounds:** Deep Space (`#0A0A18`), Surface (`#0F0F22`)
*   **Typography:**
    *   **Bebas Neue:** Headlines, numbers, and display text (Condensed, All-Caps).
    *   **Syne:** UI labels and buttons (Wide tracking, Bold).
    *   **DM Sans:** Body copy and descriptions (Clean, readable).
*   **Motifs:** 60px orange grid overlays, film-grain texture, radial glows, and "ticker-tape" dividers.

---

## 3. Core User Flows

### A. Viewer Flow
1.  **Discovery:** Browse the video feed, filtered by reward size or trending status.
2.  **Authentication:** Connect Stacks-compatible wallets (Leather, Xverse, Boom).
3.  **Consumption:** Watch videos with a real-time progress tracker.
4.  **Reward Unlock:** Earn STX automatically once 70% watch completion is reached (On-chain event).
5.  **Withdrawal:** Manage and withdraw earned STX from the Viewer Dashboard.

### B. Creator Flow
1.  **Campaign Management:** Create "Watch-to-Earn" campaigns for uploaded videos.
2.  **Funding:** Deposit STX into reward pool smart contracts.
3.  **Analytics:** Track completion rates, unique wallet interactions, and total STX distributed.
4.  **Optimization:** Manage unspent funds and active campaign status.

---

## 4. Feature Specifications

### Video Player
*   Custom HTML5 player with MOZO branding.
*   **Watch-to-Earn Progress Bar:** A gradient bar that visually "unlocks" or changes state at the 70% threshold.
*   **Live Reward Log:** A sidebar feed displaying real-time on-chain reward distributions to other users.

### Dashboards
*   **Viewer:** High-level stats (Total Earned, Withdrawable) and a detailed transaction history with Explorer links.
*   **Creator:** Campaign-specific analytics cards and fund management tools.

---

## 5. Technical Infrastructure
*   **Blockchain:** Stacks (Bitcoin L2).
*   **Smart Contracts:** Written in Clarity for transparent reward distribution.
*   **Wallet Integration:** Support for SIP-010 compatible wallets.
*   **Storage:** Decentralized video hosting (suggested) to align with Web3 ethos.
