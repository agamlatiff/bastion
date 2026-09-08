package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type LedgerClient interface {
	CreateCustomerWalletAccount(ctx context.Context, walletID, customerID uuid.UUID, currency string) error
}

type httpLedgerClient struct {
	baseURL    string
	secret     string
	httpClient *http.Client
}

func NewLedgerClient(baseURL, secret string) LedgerClient {
	return &httpLedgerClient{
		baseURL: baseURL,
		secret:  secret,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

type createAccountPayload struct {
	AccountCode string     `json:"account_code"`
	AccountType string     `json:"account_type"`
	OwnerType   string     `json:"owner_type"`
	OwnerID     *uuid.UUID `json:"owner_id"`
	Currency    string     `json:"currency"`
}

func (c *httpLedgerClient) CreateCustomerWalletAccount(ctx context.Context, walletID, customerID uuid.UUID, currency string) error {
	accountCode := fmt.Sprintf("CUSTOMER_WALLET_%s_%s", walletID.String(), currency)
	payload := createAccountPayload{
		AccountCode: accountCode,
		AccountType: "LIABILITY", // In banking, customer deposits are liabilities to the institution!
		OwnerType:   "CUSTOMER",
		OwnerID:     &customerID,
		Currency:    currency,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal ledger payload: %w", err)
	}

	url := fmt.Sprintf("%s/internal/v1/ledger/accounts", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to build http request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Secret", c.secret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("ledger service unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("ledger account creation returned status %d", resp.StatusCode)
	}

	return nil
}
