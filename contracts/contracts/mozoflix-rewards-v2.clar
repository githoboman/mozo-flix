;; MOZOflix Rewards v2
;; - Holds STX in per-video reward pools.
;; - Fees are ESCROWED inside the contract (not sent directly to a recipient)
;;   so the deployer / fee-recipient can also fund pools without tripping
;;   Clarity's sender==recipient guard (err u2 from stx-transfer?).
;; - Distributes rewards to viewers on verified watch completion.
;; - Provides `register-and-fund` for one-signature creator onboarding.

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
(define-constant ERR_NOT_OWNER (err u3013))
(define-constant ERR_REGISTER_FAILED (err u3014))

;; ---------- Constants ----------
(define-constant MAX_COMPLETION u100)
(define-constant CLAIM_COOLDOWN_BLOCKS u6)

;; ---------- State ----------

(define-map pools
  uint
  {
    balance: uint,
    total-funded: uint,
    total-distributed: uint,
    claim-count: uint
  })

(define-map claims
  {video-id: uint, viewer: principal}
  {amount: uint, completion: uint, block: uint})

(define-map last-claim-block principal uint)

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

;; NEW: accumulated fees, withdrawable by the owner via withdraw-fees.
(define-data-var fees-collected uint u0)

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

(define-read-only (get-fees-collected)
  (var-get fees-collected))

;; ---------- Public ----------

;; Fund a video's reward pool. The funder transfers the FULL amount in a
;; single STX transfer to the contract. The platform fee is bookkept inside
;; the contract (in `fees-collected`) and the net is added to the pool.
(define-public (fund-pool (video-id uint) (amount uint))
  (let (
    (video (unwrap! (contract-call? .mozoflix-videos get-video video-id) ERR_VIDEO_NOT_FOUND))
    (split (contract-call? .mozoflix-admin calc-fee amount))
    (fee (get fee split))
    (net (get net split))
    (paused (contract-call? .mozoflix-admin is-paused))
    (pool (get-pool-or-default video-id))
  )
    (asserts! (not paused) ERR_PAUSED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    ;; Single transfer: full amount into contract custody.
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    ;; Track fee separately so the owner can sweep it later.
    (var-set fees-collected (+ (var-get fees-collected) fee))
    (map-set pools video-id
      (merge pool {
        balance: (+ (get balance pool) net),
        total-funded: (+ (get total-funded pool) net)
      }))
    (ok {funded: net, fee: fee, video-id: video-id})))

;; One-signature flow: register a new video AND fund its pool atomically.
;; If either step would fail the whole tx reverts.
(define-public (register-and-fund
    (content-hash (buff 64))
    (reward-per-view uint)
    (min-completion-pct uint)
    (fund-amount uint))
  (let ((reg-result (contract-call?
                      .mozoflix-videos
                      register-video
                      content-hash
                      reward-per-view
                      min-completion-pct)))
    (match reg-result
      video-id (begin
        (try! (fund-pool video-id fund-amount))
        (ok {video-id: video-id, funded: fund-amount}))
      err-code (err err-code))))

;; Distribute reward to a viewer for a verified watch event.
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
    (try! (as-contract (stx-transfer? reward tx-sender viewer)))
    (map-set claims {video-id: video-id, viewer: viewer}
      {amount: reward, completion: completion, block: stacks-block-height})
    (map-set pools video-id
      (merge pool {
        balance: (- (get balance pool) reward),
        total-distributed: (+ (get total-distributed pool) reward),
        claim-count: (+ (get claim-count pool) u1)
      }))
    (map-set last-claim-block viewer stacks-block-height)
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

;; Owner sweeps accumulated platform fees to a chosen recipient.
;; Only the admin-contract owner may call this.
(define-public (withdraw-fees (to principal))
  (let (
    (fee-amount (var-get fees-collected))
    (owner (contract-call? .mozoflix-admin get-owner))
  )
    (asserts! (is-eq tx-sender owner) ERR_NOT_OWNER)
    (asserts! (> fee-amount u0) ERR_NO_BALANCE)
    (try! (as-contract (stx-transfer? fee-amount tx-sender to)))
    (var-set fees-collected u0)
    (ok fee-amount)))
