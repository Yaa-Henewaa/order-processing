export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}