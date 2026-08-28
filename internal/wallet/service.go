package wallet

import (
	"context"
	"errors"
	"time"

	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/redis/go-redis/v9"
)

type Service interface {
	GetBalance(ctx context.Context, userID string) (*WalletBalanceResponse, error)
	TopUp(ctx context.Context, userID string, req *TopUpRequest) (*Transaction, error)
	Transfer(ctx context.Context, senderUserID string, req *TransferRequest) (*Transaction, error)
	GetTransaction(ctx context.Context, userID string, limit int, offset int) ([]*Transaction, error)
}

type service struct {
	walletRepo Repository
	userRepo   auth.Repository
	rdb        *redis.Client
}

func NewService(walletRepo Repository, userRepo auth.Repository, rdb *redis.Client) Service {
	return &service{
		walletRepo: walletRepo,
		userRepo:   userRepo,
		rdb:        rdb,
	}
}

func (s *service) GetBalance(ctx context.Context, userID string) (*WalletBalanceResponse, error) {
	wallet, err := s.walletRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &WalletBalanceResponse{
		WalletID:        wallet.ID,
		UserID:          wallet.UserID,
		Balance:         wallet.Balance,
		Currency:        wallet.Currency,
		MaxBalanceLimit: wallet.MaxBalanceLimit,
	}, nil
}

func (s *service) TopUp(ctx context.Context, userID string, req *TopUpRequest) (*Transaction, error) {

	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	wallet, err := s.walletRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	lockKey := "lock:idempotency:" + req.IdempotencyKey
	locked, err := s.rdb.SetNX(ctx, lockKey, "locked", 5*time.Second).Result()
	if err != nil {
		return nil, err
	}
	if !locked {
		return nil, errors.New("concurrent request detected for the same idempotency key")
	}
	defer s.rdb.Del(ctx, lockKey)

	desc := req.Description
	if desc == "" {
		desc = "Top Up Balance"
	}

	return s.walletRepo.ExecuteTopUp(ctx, wallet.ID, req.Amount, req.IdempotencyKey, desc)
}

func (s *service) Transfer(ctx context.Context, senderUserID string, req *TransferRequest) (*Transaction, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	senderUser, err := s.userRepo.FindByID(ctx, senderUserID)
	if err != nil {
		return nil, errors.New("sender user not found")
	}

	if !senderUser.IsVerified {
		return nil, ErrKYCRequired
	}

	senderWallet, err := s.walletRepo.FindByUserID(ctx, senderUserID)
	if err != nil {
		return nil, err
	}

	receiverUser, err := s.userRepo.FindByEmail(ctx, req.ReceiverEmail)
	if err != nil {
		return nil, errors.New("receiver user not found")
	}

	if receiverUser.ID == senderUserID {
		return nil, ErrSelfTransfer
	}

	receiverWallet, err := s.walletRepo.FindByUserID(ctx, receiverUser.ID)
	if err != nil {
		return nil, errors.New("receiver wallet not found")
	}

	lockKey := "lock:idempotency:" + req.IdempotencyKey
	locked, err := s.rdb.SetNX(ctx, lockKey, "locked", 5*time.Second).Result()
	if err != nil {
		return nil, err
	}
	if !locked {
		return nil, errors.New("concurrent request detected for the same idempotency key")
	}
	defer s.rdb.Del(ctx, lockKey)

	return s.walletRepo.ExecuteTransfer(ctx, senderWallet.ID, receiverWallet.ID, req.Amount, req.IdempotencyKey, req.Description)
}

func (s *service) GetTransaction(ctx context.Context, userID string, limit int, offset int) ([]*Transaction, error) {
	wallet, err := s.walletRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.walletRepo.GetTransaction(ctx, wallet.ID, limit, offset)
}
