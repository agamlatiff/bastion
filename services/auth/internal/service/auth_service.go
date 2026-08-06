package service

import (
	"context"
	"errors"
	"time"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error)
	Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error)
	ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error)
	Logout(ctx context.Context, tokenStr string) error
}

type authService struct {
	userRepo       repository.UserRepository
	rdb            *redis.Client
	jwtSecret      string
	jwtExpiryHours int
}

func NewAuthService(userRepo repository.UserRepository,
	rdb *redis.Client,
	jwtSecret string,
	jwtExpiryHours int) AuthService {
	return &authService{
		userRepo:       userRepo,
		rdb:            rdb,
		jwtSecret:      jwtSecret,
		jwtExpiryHours: jwtExpiryHours,
	}
}

func (s *authService) Register (ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error) {

	// Checking email is already sign in database
	existingUser, _ := s.userRepo.FindByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, errors.New("Email already registered")
	}

	// Hash real password user used bcrypt library
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	if err != nil {
		return nil, err
	}

	// Create new object user
	newUser := &domain.User{
		Email: req.Email,
		PasswordHash: string(hashedBytes),
		FullName: req.FullName,
		Tier: "tier_1",
	}

	// Save the new user into database PostgreSQL
	if err := s.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}

	// Wallet automaticly create when user has been registered
	if err := s.userRepo.CreateWallet(ctx, newUser.ID); err != nil {
		return nil, err
	}

	// Create JWT Token for new user
	tokenStr, err := s.generateToken(newUser)

	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: tokenStr,
		User: newUser,
	}, nil
}

func (s *authService) generateToken(user *domain.User) (string, error) {

	// Create payload into JWT Token
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email" : user.Email,
		"tier" : user.Tier,
		"exp" : time.Now().Add(time.Duration(s.jwtExpiryHours) * time.Hour).Unix(),
	}

	// Create token object with HS256 Algorithm
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token with key secret from .env	
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *authService) Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error) {

	errMessage := "Invalid email or password"

	// Check email is already in database
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New(errMessage)
	}

	// Compare password input with password database (hash)
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash),[]byte(req.Password))
	if err != nil {
		return nil, errors.New(errMessage)
	}

	// If password matches, create new JWT Token
	tokenStr, err := s.generateToken(user)

	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: tokenStr,
		User: user,
	},nil
}