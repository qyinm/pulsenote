package output

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message,omitempty"`
}

type Check struct {
	Name    string         `json:"name"`
	Status  string         `json:"status"`
	Details map[string]any `json:"details,omitempty"`
	Error   *ErrorDetail   `json:"error,omitempty"`
}

type StatusResponse struct {
	Status string       `json:"status"`
	Checks []Check      `json:"checks,omitempty"`
	Error  *ErrorDetail `json:"error,omitempty"`
}

type CollectResponse struct {
	Status      string       `json:"status"`
	ContextPath string       `json:"contextPath"`
	ReceiptPath string       `json:"receiptPath"`
	Error       *ErrorDetail `json:"error,omitempty"`
}

type DraftResponse struct {
	Status      string       `json:"status"`
	ContextPath string       `json:"contextPath"`
	Audience    string       `json:"audience"`
	Format      string       `json:"format"`
	DraftPath   string       `json:"draftPath"`
	ReceiptPath string       `json:"receiptPath"`
	Error       *ErrorDetail `json:"error,omitempty"`
}
