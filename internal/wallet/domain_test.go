package wallet
import (
	"testing"
)
func TestTransactionStateTransition_Valid(t *testing.T) {
	// Arrange: Create a transaction in PENDING state
	tx := &Transaction{
		ID:     "tx-123",
		Status: StatePending,
	}

	// Act: Attempt to move it to PROCESSING
	history, err := tx.TransitionTo(StateProcessing, "Started processing via external provider")

	// Assert: It should succeed without errors
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	
	if tx.Status != StateProcessing {
		t.Errorf("expected status to be PROCESSING, got %s", tx.Status)
	}
	
	if history == nil || history.StateTo != StateProcessing {
		t.Errorf("history record was not created correctly")
	}
}

func TestTransactionStateTransition_Invalid(t *testing.T) {
	// Arrange: Create a transaction that is already COMPLETED (Terminal State)
	tx := &Transaction{
		ID:     "tx-456",
		Status: StateCompleted, 
	}

	// Act: A rogue webhook arrives 3 days later trying to fail it
	history, err := tx.TransitionTo(StateFailed, "Provider timed out late")

	// Assert: The domain MUST block this and throw an error
	if err == nil {
		t.Fatalf("expected an error when transitioning from COMPLETED to FAILED, but got none")
	}
	
	if err != ErrInvalidStateTransition {
		t.Errorf("expected ErrInvalidStateTransition, got %v", err)
	}
	
	if history != nil {
		t.Errorf("expected history to be nil on failed transition")
	}
}