;; MOZOflix Creators
;; On-chain creator profiles + admin verification flag.
;; Reputation/stats are aggregated off-chain from the rewards event log;
;; this contract stores the identity layer (display name, bio, avatar CID,
;; verified badge) and admin-pushed reputation scores.

;; ---------- Errors ----------
(define-constant ERR_NOT_ADMIN (err u4000))
(define-constant ERR_NOT_REGISTERED (err u4001))
(define-constant ERR_ALREADY_REGISTERED (err u4002))
(define-constant ERR_INVALID_NAME (err u4003))
(define-constant ERR_INVALID_BIO (err u4004))
(define-constant ERR_INVALID_AVATAR (err u4005))

;; ---------- State ----------
(define-map profiles
  principal
  {
    display-name: (string-ascii 32),
    bio: (string-utf8 200),
    avatar-hash: (buff 64),
    verified: bool,
    joined-at: uint,
    reputation: uint
  })

(define-data-var total-creators uint u0)

;; ---------- Internal ----------
(define-private (is-admin (who principal))
  (contract-call? .mozoflix-admin is-authorized who))

;; ---------- Read-only ----------
(define-read-only (get-profile (creator principal))
  (map-get? profiles creator))

(define-read-only (is-registered (creator principal))
  (is-some (map-get? profiles creator)))

(define-read-only (is-verified (creator principal))
  (match (map-get? profiles creator)
    p (get verified p)
    false))

(define-read-only (get-reputation (creator principal))
  (match (map-get? profiles creator)
    p (get reputation p)
    u0))

(define-read-only (get-total-creators)
  (var-get total-creators))

;; ---------- Public ----------

(define-public (register-profile
    (display-name (string-ascii 32))
    (bio (string-utf8 200))
    (avatar-hash (buff 64)))
  (begin
    (asserts! (is-none (map-get? profiles tx-sender)) ERR_ALREADY_REGISTERED)
    (asserts! (> (len display-name) u0) ERR_INVALID_NAME)
    (map-set profiles tx-sender
      {
        display-name: display-name,
        bio: bio,
        avatar-hash: avatar-hash,
        verified: false,
        joined-at: stacks-block-height,
        reputation: u0
      })
    (var-set total-creators (+ (var-get total-creators) u1))
    (ok true)))

(define-public (update-profile
    (display-name (string-ascii 32))
    (bio (string-utf8 200))
    (avatar-hash (buff 64)))
  (let ((p (unwrap! (map-get? profiles tx-sender) ERR_NOT_REGISTERED)))
    (asserts! (> (len display-name) u0) ERR_INVALID_NAME)
    (map-set profiles tx-sender
      (merge p {
        display-name: display-name,
        bio: bio,
        avatar-hash: avatar-hash
      }))
    (ok true)))

;; Admin-only: toggle verified badge.
(define-public (set-verified (creator principal) (verified bool))
  (let ((p (unwrap! (map-get? profiles creator) ERR_NOT_REGISTERED)))
    (asserts! (is-admin tx-sender) ERR_NOT_ADMIN)
    (map-set profiles creator (merge p {verified: verified}))
    (ok true)))

;; Admin-only: push aggregated reputation score (computed off-chain).
(define-public (set-reputation (creator principal) (score uint))
  (let ((p (unwrap! (map-get? profiles creator) ERR_NOT_REGISTERED)))
    (asserts! (is-admin tx-sender) ERR_NOT_ADMIN)
    (map-set profiles creator (merge p {reputation: score}))
    (ok true)))
