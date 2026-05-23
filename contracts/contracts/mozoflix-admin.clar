;; MOZOflix Admin Contract
;; Central authority + global config: owner, pause switch, platform fee, fee recipient.
;; Other MOZOflix contracts read state here for authorization and fee parameters.

;; ---------- Errors ----------
(define-constant ERR_NOT_OWNER (err u1000))
(define-constant ERR_INVALID_FEE (err u1001))

;; ---------- Constants ----------
(define-constant MAX_FEE_BPS u1000) ;; 10% cap on platform fee

;; ---------- State ----------
(define-data-var contract-owner principal tx-sender)
(define-data-var fee-recipient principal tx-sender)
(define-data-var platform-fee-bps uint u500) ;; default 5%
(define-data-var paused bool false)

;; Authorized callers (platform backend wallets allowed to call
;; privileged distribution functions on the rewards contract).
(define-map authorized-callers principal bool)

;; ---------- Internal ----------
(define-private (is-owner (who principal))
  (is-eq who (var-get contract-owner)))

;; ---------- Read-only ----------
(define-read-only (get-owner)
  (var-get contract-owner))

(define-read-only (get-fee-recipient)
  (var-get fee-recipient))

(define-read-only (get-fee-bps)
  (var-get platform-fee-bps))

(define-read-only (is-paused)
  (var-get paused))

(define-read-only (is-authorized (who principal))
  (or
    (is-owner who)
    (default-to false (map-get? authorized-callers who))))

;; Calculate fee + net for a given gross amount.
(define-read-only (calc-fee (amount uint))
  (let ((fee (/ (* amount (var-get platform-fee-bps)) u10000)))
    {fee: fee, net: (- amount fee)}))

;; ---------- Public: owner-only ----------
(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-owner tx-sender) ERR_NOT_OWNER)
    (var-set contract-owner new-owner)
    (ok true)))

(define-public (set-fee-recipient (new-recipient principal))
  (begin
    (asserts! (is-owner tx-sender) ERR_NOT_OWNER)
    (var-set fee-recipient new-recipient)
    (ok true)))

(define-public (set-fee-bps (new-bps uint))
  (begin
    (asserts! (is-owner tx-sender) ERR_NOT_OWNER)
    (asserts! (<= new-bps MAX_FEE_BPS) ERR_INVALID_FEE)
    (var-set platform-fee-bps new-bps)
    (ok true)))

(define-public (set-paused (new-state bool))
  (begin
    (asserts! (is-owner tx-sender) ERR_NOT_OWNER)
    (var-set paused new-state)
    (ok true)))

(define-public (set-authorized (who principal) (allowed bool))
  (begin
    (asserts! (is-owner tx-sender) ERR_NOT_OWNER)
    (map-set authorized-callers who allowed)
    (ok true)))
