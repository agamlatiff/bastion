package service

import (
	"context"
	"errors"
	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"time"
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

func (s *authService) Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error) {

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
		Email:        req.Email,
		PasswordHash: string(hashedBytes),
		FullName:     req.FullName,
		Tier:         "tier_1",
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
		User:  newUser.ToUserResponse(),
	}, nil
}

func (s *authService) generateToken(user *domain.User) (string, error) {

	// Create payload into JWT Token
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"tier":    user.Tier,
		"exp":     time.Now().Add(time.Duration(s.jwtExpiryHours) * time.Hour).Unix(),
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
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
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
		User:  user.ToUserResponse(),
	}, nil
}

func (s *authService) ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error) {
	// Checking is token already ever to logout (blacklist)
	blacklisted, _ := s.rdb.Get(ctx, "blacklist:"+tokenStr).Result()
	if blacklisted != "" {
		return nil, errors.New("Token has been logged out")
	}

	// Parse & verification the stamp HS256 JWT Token
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("Unexpected signing method")
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("Invalid or expired token")
	}

	// Extract the fill of payload into JWT Token
	claims, ok := token.Claims.(jwt.MapClaims)

	if !ok {
		return nil, errors.New("Invalid token claims")
	}

	userID, ok := claims["user_id"].(string)

	if !ok {
		return nil, errors.New("Invalid user_id in token")
	}

	// Get profile new user data from database
	return s.userRepo.FindByID(ctx, userID)
}

func (s *authService) Logout(ctx context.Context, tokenStr string) error {

	// Checking JWT Secret and parsing them with that
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("Unexpected signing method")
		}

		return []byte(s.jwtSecret), nil
	})

	// Validation token from JWT Token
	if err != nil || !token.Valid {
		return errors.New("Invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)

	if !ok {
		return errors.New("Invalid token claims")
	}

	// Convert exp MapClaims from JWT Token and Checking is it still valid
	expFloat, ok := claims["exp"].(float64)
	if !ok {
		return errors.New("Invalid exp claims")
	}

	// Checking is there expired date
	expTime := time.Unix(int64(expFloat), 0)
	remainingDuration := time.Until(expTime)

	if remainingDuration <= 0 {
		return nil
	}

	// Set blacklist token if still have a time
	return s.rdb.Set(ctx, "blacklist:"+tokenStr, "true", remainingDuration).Err()
}
