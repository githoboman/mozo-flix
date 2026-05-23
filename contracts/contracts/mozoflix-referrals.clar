;; MOZOflix Referrals
;; Phase 2 referral rewards: a referrer earns a percentage of every reward
;; their referees claim during the first 30 days after they join.
;;
;; Design:
;;   - Each referee can have exactly one referrer (set once, immutable).
;;   - Bonuses are accrued (not transferred immediately) per referrer in
;;     this contract's STX treasury and pulled via `claim-bonus`.
;;   - The treasury is funded by `deposit` calls (e.g. platform-fee revenue
;;     routed in by the owner).
;;   - Bonus accruals are recorded by an authorized backend after each
;;     reward distribution succeeds on the rewards contract.

;; ---------- Errors ----------
(define-constant ERR_NOT_AUTHORIZED (err u5000))
(define-constant ERR_ALREADY_REFERRED (err u5001))
(define-constant ERR_SELF_REFERRAL (err u5002))
(define-constant ERR_NO_REFERRER (err u5003))
(define-constant ERR_NOTHING_TO_CLAIM (err u5004))
(define-constant ERR_INSUFFICIENT_TREASURY (err u5005))
(define-constant ERR_INVALID_AMOUNT (err u5006))

;; ---------- Constants ----------
(define-constant REFERRAL_BPS u1000)             ;; 10% of referee rewards
(define-constant REFERRAL_WINDOW_BLOCKS u4320)   ;; ~30 days at 10-min blocks

;; ---------- State ----------

;; referee -> referrer (1:1, immutable once set)
(define-map referrer-of principal principal)

;; referee -> block height of registration (window starts here)
(define-map referee-joined-at principal uint)

;; referrer -> unclaimed STX balance accrued from referee rewards
(define-map pending principal uint)

;; referrer -> aggregate stats
(define-map stats
  principal
  {total-referees: uint, total-earned: uint})

(define-data-var total-referrals uint u0)
(define-data-var total-paid uint u0)

;; ---------- Internal ----------
(define-private (is-admin (who principal))
  (contract-call? .mozoflix-admin is-authorized who))

(define-private (get-stats-or-default (who principal))
  (default-to {total-referees: u0, total-earned: u0} (map-get? stats who)))

(define-read-only (calc-bonus (base-amount uint))
  (/ (* base-amount REFERRAL_BPS) u10000))

;; ---------- Read-only ----------
(define-read-only (get-referrer (referee principal))
  (map-get? referrer-of referee))

(define-read-only (get-joined-at (referee principal))
  (default-to u0 (map-get? referee-joined-at referee)))

(define-read-only (get-pending (referrer principal))
  (default-to u0 (map-get? pending referrer)))

(define-read-only (get-stats (referrer principal))
  (get-stats-or-default referrer))

(define-read-only (is-active-referee (referee principal))
  (let ((joined (default-to u0 (map-get? referee-joined-at referee))))
    (and
      (> joined u0)
      (< stacks-block-height (+ joined REFERRAL_WINDOW_BLOCKS)))))

(define-read-only (get-treasury)
  (stx-get-balance (as-contract tx-sender)))

(define-read-only (get-total-referrals)
  (var-get total-referrals))

(define-read-only (get-total-paid)
  (var-get total-paid))

;; ---------- Public ----------

;; Viewer self-registers under a referrer. One-shot, irreversible.
(define-public (register-referral (referrer principal))
  (begin
    (asserts! (is-none (map-get? referrer-of tx-sender)) ERR_ALREADY_REFERRED)
    (asserts! (not (is-eq tx-sender referrer)) ERR_SELF_REFERRAL)
    (map-set referrer-of tx-sender referrer)
    (map-set referee-joined-at tx-sender stacks-block-height)
    (let ((s (get-stats-or-default referrer)))
      (map-set stats referrer
        (merge s {total-referees: (+ (get total-referees s) u1)})))
    (var-set total-referrals (+ (var-get total-referrals) u1))
    (ok true)))

;; Authorized backend records that a referee earned `base-amount` STX, so
;; the referrer can accrue 10% of it (if still inside the 30-day window).
(define-public (record-reward (referee principal) (base-amount uint))
  (let (
    (authed (contract-call? .mozoflix-admin is-authorized tx-sender))
    (referrer-opt (map-get? referrer-of referee))
    (joined (default-to u0 (map-get? referee-joined-at referee)))
    (bonus (calc-bonus base-amount))
  )
    (asserts! authed ERR_NOT_AUTHORIZED)
    (asserts! (> base-amount u0) ERR_INVALID_AMOUNT)
    ;; If no referrer, silently no-op (this lets the backend call it
    ;; unconditionally without first checking).
    (match referrer-opt referrer
      (begin
        (asserts!
          (< stacks-block-height (+ joined REFERRAL_WINDOW_BLOCKS))
          (ok {credited: u0, referrer: referrer}))
        (map-set pending referrer (+ (get-pending referrer) bonus))
        (let ((s (get-stats-or-default referrer)))
          (map-set stats referrer
            (merge s {total-earned: (+ (get total-earned s) bonus)})))
        (ok {credited: bonus, referrer: referrer}))
      ;; no referrer
      (ok {credited: u0, referrer: tx-sender}))))

;; Referrer pulls all accrued bonus.
(define-public (claim-bonus)
  (let ((amount (get-pending tx-sender))
        (recipient tx-sender))
    (asserts! (> amount u0) ERR_NOTHING_TO_CLAIM)
    (asserts! (>= (stx-get-balance (as-contract tx-sender)) amount)
              ERR_INSUFFICIENT_TREASURY)
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    (map-set pending tx-sender u0)
    (var-set total-paid (+ (var-get total-paid) amount))
    (ok amount)))

;; Anyone can fund the referral treasury (typically the platform owner
;; depositing a slice of platform-fee revenue).
(define-public (deposit (amount uint))
  (begin
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (ok amount)))

;; Admin escape hatch: sweep any over-funded treasury back out.
(define-public (admin-withdraw (amount uint) (recipient principal))
  (let ((authed (contract-call? .mozoflix-admin is-authorized tx-sender)))
    (asserts! authed ERR_NOT_AUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= (stx-get-balance (as-contract tx-sender)) amount)
              ERR_INSUFFICIENT_TREASURY)
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    (ok amount)))
