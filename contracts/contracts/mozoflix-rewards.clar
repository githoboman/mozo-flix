;; MOZOflix Rewards Contract
;; - Holds STX in per-video reward pools (funded by creators / sponsors).
;; - Distributes rewards to viewers on verified watch completion.
;; - Records every watch event as an append-only on-chain log.
;; - Enforces: pause switch, anti-double-claim, completion threshold, rate limiting.

;; ---------- Errors ----------
(define-constant ERR_PAUSED (err u3000))
(define-constant ERR_NOT_AUTHORIZED (err u3001))
(define-constant ERR_NOT_CREATOR (err u3002))
(define-constant ERR_VIDEO_NOT_FOUND (err u3003))
(define-constant ERR_VIDEO_INACTIVE (err u3004))
(define-constant ERR_ALREADY_CLAIMED (err u3005))
(define-constant ERR_INSUFFICIENT_COMPLETION (err u3006))
(define-constant ERR_INSUFFICIENT_POOL (err u3007))
(define-constant ERR_INVALID_AMOUNT (err u3008))
(define-constant ERR_INVALID_COMPLETION (err u3009))
(define-constant ERR_RATE_LIMITED (err u3010))
(define-constant ERR_TRANSFER_FAILED (err u3011))
(define-constant ERR_NO_BALANCE (err u3012))

;; ---------- Constants ----------
(define-constant MAX_COMPLETION u100)
(define-constant CLAIM_COOLDOWN_BLOCKS u6) ;; ~1 hour rate limit per viewer

;; ---------- State ----------

;; Per-video reward pool accounting.
(define-map pools
  uint
  {
    balance: uint,
    total-funded: uint,
    total-distributed: uint,
    claim-count: uint
  })

;; Per-(video, viewer) claim record. Presence implies already claimed.
(define-map claims
  {video-id: uint, viewer: principal}
  {amount: uint, completion: uint, block: uint})

;; Last claim block height per viewer (for rate limiting across all videos).
(define-map last-claim-block principal uint)

;; Append-only watch event log.
(define-data-var next-event-id uint u1)
(define-map events
  uint
  {
    video-id: uint,
    viewer: principal,
    completion: uint,
    reward: uint,
    block: uint
  })

;; ---------- Private ----------

(define-private (get-pool-or-default (video-id uint))
  (default-to
    {balance: u0, total-funded: u0, total-distributed: u0, claim-count: u0}
    (map-get? pools video-id)))

;; ---------- Read-only ----------

(define-read-only (get-pool (video-id uint))
  (get-pool-or-default video-id))

(define-read-only (get-pool-balance (video-id uint))
  (get balance (get-pool-or-default video-id)))

(define-read-only (has-claimed (video-id uint) (viewer principal))
  (is-some (map-get? claims {video-id: video-id, viewer: viewer})))

(define-read-only (get-claim (video-id uint) (viewer principal))
  (map-get? claims {video-id: video-id, viewer: viewer}))

(define-read-only (get-event (event-id uint))
  (map-get? events event-id))

(define-read-only (get-total-events)
  (- (var-get next-event-id) u1))

(define-read-only (get-last-claim-block (viewer principal))
  (default-to u0 (map-get? last-claim-block viewer)))

;; ---------- Public ----------

;; Fund a video's reward pool. Anyone may sponsor; platform fee skimmed off the top.
;; The video must exist (creator must have registered it).
(define-public (fund-pool (video-id uint) (amount uint))
  (let (
    (video (unwrap! (contract-call? .mozoflix-videos get-video video-id) ERR_VIDEO_NOT_FOUND))
    (split (contract-call? .mozoflix-admin calc-fee amount))
    (fee (get fee split))
    (net (get net split))
    (fee-to (contract-call? .mozoflix-admin get-fee-recipient))
    (paused (contract-call? .mozoflix-admin is-paused))
    (pool (get-pool-or-default video-id))
  )
    (asserts! (not paused) ERR_PAUSED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    ;; Pay platform fee directly to fee recipient.
    (if (> fee u0)
      (try! (stx-transfer? fee tx-sender fee-to))
      true)
    ;; Move net into the contract's custody.
    (try! (stx-transfer? net tx-sender (as-contract tx-sender)))
    (map-set pools video-id
      (merge pool {
        balance: (+ (get balance pool) net),
        total-funded: (+ (get total-funded pool) net)
      }))
    (ok {funded: net, fee: fee, video-id: video-id})))

;; Distribute reward to a viewer for a verified watch event.
;; Called by the platform backend (an authorized caller in mozoflix-admin)
;; after server-side completion + anti-farming verification.
(define-public (distribute-reward
    (viewer principal)
    (video-id uint)
    (completion uint))
  (let (
    (video (unwrap! (contract-call? .mozoflix-videos get-video video-id) ERR_VIDEO_NOT_FOUND))
    (paused (contract-call? .mozoflix-admin is-paused))
    (authed (contract-call? .mozoflix-admin is-authorized tx-sender))
    (pool (get-pool-or-default video-id))
    (reward (get reward-per-view video))
    (threshold (get min-completion-pct video))
    (last-block (get-last-claim-block viewer))
    (event-id (var-get next-event-id))
  )
    (asserts! (not paused) ERR_PAUSED)
    (asserts! authed ERR_NOT_AUTHORIZED)
    (asserts! (get active video) ERR_VIDEO_INACTIVE)
    (asserts! (<= completion MAX_COMPLETION) ERR_INVALID_COMPLETION)
    (asserts! (>= completion threshold) ERR_INSUFFICIENT_COMPLETION)
    (asserts! (not (has-claimed video-id viewer)) ERR_ALREADY_CLAIMED)
    (asserts! (>= (get balance pool) reward) ERR_INSUFFICIENT_POOL)
    (asserts!
      (or (is-eq last-block u0)
          (>= stacks-block-height (+ last-block CLAIM_COOLDOWN_BLOCKS)))
      ERR_RATE_LIMITED)
    ;; Send reward from contract to viewer.
    (try! (as-contract (stx-transfer? reward tx-sender viewer)))
    ;; Record claim.
    (map-set claims {video-id: video-id, viewer: viewer}
      {amount: reward, completion: completion, block: stacks-block-height})
    ;; Update pool.
    (map-set pools video-id
      (merge pool {
        balance: (- (get balance pool) reward),
        total-distributed: (+ (get total-distributed pool) reward),
        claim-count: (+ (get claim-count pool) u1)
      }))
    ;; Rate limit bookkeeping.
    (map-set last-claim-block viewer stacks-block-height)
    ;; Append watch event.
    (map-set events event-id
      {
        video-id: video-id,
        viewer: viewer,
        completion: completion,
        reward: reward,
        block: stacks-block-height
      })
    (var-set next-event-id (+ event-id u1))
    (ok {event-id: event-id, reward: reward})))

;; Creator withdraws unspent balance from their video's pool.
(define-public (withdraw-pool (video-id uint))
  (let (
    (video (unwrap! (contract-call? .mozoflix-videos get-video video-id) ERR_VIDEO_NOT_FOUND))
    (pool (get-pool-or-default video-id))
    (balance (get balance pool))
    (creator (get creator video))
  )
    (asserts! (is-eq tx-sender creator) ERR_NOT_CREATOR)
    (asserts! (> balance u0) ERR_NO_BALANCE)
    (try! (as-contract (stx-transfer? balance tx-sender creator)))
    (map-set pools video-id (merge pool {balance: u0}))
    (ok balance)))
