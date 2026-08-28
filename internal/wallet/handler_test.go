package wallet

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHandleError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		inputErr       error
		expectedStatus int
		expectedCode   string
	}{
		{
			name:           "Insufficient Balance maps to 422",
			inputErr:       ErrInsufficientBalance,
			expectedStatus: http.StatusUnprocessableEntity,
			expectedCode:   "INSUFFICIENT_BALANCE",
		},
		{
			name:           "KYC Required maps to 403",
			inputErr:       ErrKYCRequired,
			expectedStatus: http.StatusForbidden,
			expectedCode:   "KYC_REQUIRED",
		},
		{
			name:           "Internal Error is Censored (500)",
			// Simulasi error database yang mengerikan
			inputErr:       errors.New("pq: password authentication failed for user"),
			expectedStatus: http.StatusInternalServerError,
			expectedCode:   "INTERNAL_SERVER_ERROR",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Panggil fungsi yang baru kita bikin
			handleError(c, tt.inputErr)

			// 1. Cek HTTP Status Code
			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			var response map[string]interface{}
			_ = json.Unmarshal(w.Body.Bytes(), &response)
			errorObj := response["error"].(map[string]interface{})
			
			// 2. Cek Error Code JSON (misal "INSUFFICIENT_BALANCE")
			code := errorObj["code"].(string)
			if code != tt.expectedCode {
				t.Errorf("expected error code %s, got %s", tt.expectedCode, code)
			}

			// 3. Cek Sensor Keamanan untuk 500!
			message := errorObj["message"].(string)
			if tt.expectedStatus >= 500 {
				if message != "An unexpected error occurred on our end" {
					t.Errorf("SECURITY LEAK! Expected censored message, got: %s", message)
				}
			}
		})
	}
}
