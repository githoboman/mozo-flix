;; MOZOflix Videos Registry
;; Tracks creator-uploaded videos: IPFS content hash, reward-per-view,
;; minimum completion threshold, and active/paused state per video.

;; ---------- Errors ----------
(define-constant ERR_NOT_CREATOR (err u2000))
(define-constant ERR_VIDEO_NOT_FOUND (err u2001))
(define-constant ERR_INVALID_THRESHOLD (err u2002))
(define-constant ERR_INVALID_REWARD (err u2003))
(define-constant ERR_INVALID_HASH (err u2004))

;; ---------- Constants ----------
(define-constant MIN_THRESHOLD u1)
(define-constant MAX_THRESHOLD u100)

;; ---------- State ----------
(define-data-var next-video-id uint u1)
(define-data-var total-videos uint u0)

(define-map videos
  uint
  {
    creator: principal,
    content-hash: (buff 64),     ;; IPFS CID bytes
    reward-per-view: uint,        ;; STX micro-units per qualifying view
    min-completion-pct: uint,     ;; 1..100 (README default 70)
    active: bool,
    created-at: uint              ;; block-height
  })

;; ---------- Read-only ----------
(define-read-only (get-video (video-id uint))
  (map-get? videos video-id))

(define-read-only (get-creator (video-id uint))
  (match (map-get? videos video-id)
    v (ok (get creator v))
    ERR_VIDEO_NOT_FOUND))

(define-read-only (get-reward-rate (video-id uint))
  (match (map-get? videos video-id)
    v (ok (get reward-per-view v))
    ERR_VIDEO_NOT_FOUND))

(define-read-only (get-threshold (video-id uint))
  (match (map-get? videos video-id)
    v (ok (get min-completion-pct v))
    ERR_VIDEO_NOT_FOUND))

(define-read-only (is-active (video-id uint))
  (match (map-get? videos video-id)
    v (get active v)
    false))

(define-read-only (get-total-videos)
  (var-get total-videos))

(define-read-only (get-next-id)
  (var-get next-video-id))

;; ---------- Public ----------
(define-public (register-video
    (content-hash (buff 64))
    (reward-per-view uint)
    (min-completion-pct uint))
  (let ((video-id (var-get next-video-id)))
    (asserts! (> (len content-hash) u0) ERR_INVALID_HASH)
    (asserts! (> reward-per-view u0) ERR_INVALID_REWARD)
    (asserts! (and (>= min-completion-pct MIN_THRESHOLD)
                   (<= min-completion-pct MAX_THRESHOLD))
              ERR_INVALID_THRESHOLD)
    (map-set videos video-id
      {
        creator: tx-sender,
        content-hash: content-hash,
        reward-per-view: reward-per-view,
        min-completion-pct: min-completion-pct,
        active: true,
        created-at: stacks-block-height
      })
    (var-set next-video-id (+ video-id u1))
    (var-set total-videos (+ (var-get total-videos) u1))
    (ok video-id)))

(define-public (set-video-active (video-id uint) (active bool))
  (let ((v (unwrap! (map-get? videos video-id) ERR_VIDEO_NOT_FOUND)))
    (asserts! (is-eq tx-sender (get creator v)) ERR_NOT_CREATOR)
    (map-set videos video-id (merge v {active: active}))
    (ok true)))

(define-public (update-reward-rate (video-id uint) (new-rate uint))
  (let ((v (unwrap! (map-get? videos video-id) ERR_VIDEO_NOT_FOUND)))
    (asserts! (is-eq tx-sender (get creator v)) ERR_NOT_CREATOR)
    (asserts! (> new-rate u0) ERR_INVALID_REWARD)
    (map-set videos video-id (merge v {reward-per-view: new-rate}))
    (ok true)))

(define-public (update-threshold (video-id uint) (new-threshold uint))
  (let ((v (unwrap! (map-get? videos video-id) ERR_VIDEO_NOT_FOUND)))
    (asserts! (is-eq tx-sender (get creator v)) ERR_NOT_CREATOR)
    (asserts! (and (>= new-threshold MIN_THRESHOLD)
                   (<= new-threshold MAX_THRESHOLD))
              ERR_INVALID_THRESHOLD)
    (map-set videos video-id (merge v {min-completion-pct: new-threshold}))
    (ok true)))
