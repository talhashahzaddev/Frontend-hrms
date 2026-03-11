// ========== Checkout & Payment Flow ==========
export interface CreateCheckoutSessionRequest {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  gateway: 'stripe' | 'razorpay' | 'manual';
}

export interface CheckoutSessionResponse {
  transactionId: string;
  checkoutUrl: string;
  sessionId: string;
  gateway: string;
}

export interface VerifyPaymentRequest {
  transactionId: string;
  sessionId: string;
}

export interface PaymentConfirmationDto {
  transactionId: string;
  status: string;
  amountPaid: number;
  currency: string;
  planName: string;
  billingCycle: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  invoiceNumber?: string;
  invoiceId?: string;
}

// ========== Transaction Models ==========
export interface TransactionDto {
  transactionId: string;
  companyId: string;
  companyName: string;
  planId: string;
  planName: string;
  subscriptionId?: string;
  gateway: string;
  gatewayTransactionId?: string;
  amount: number;
  currency: string;
  billingCycle: string;
  status: string;
  paymentMethod?: string;
  cardLast4?: string;
  cardBrand?: string;
  failureReason?: string;
  createdAt: string;
}

export interface TransactionDetailDto extends TransactionDto {
  invoice?: InvoiceDto;
  refunds: RefundDto[];
}

export interface TransactionFilterRequest {
  search?: string;
  status?: string;
  gateway?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

// ========== Invoice Models ==========
export interface InvoiceDto {
  invoiceId: string;
  transactionId: string;
  companyId: string;
  companyName: string;
  companyEmail?: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  planName: string;
  billingCycle: string;
  status: string;
  issuedAt: string;
  paidAt?: string;
  dueDate?: string;
}

export interface InvoiceFilterRequest {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

// ========== Refund Models ==========
export interface RefundDto {
  refundId: string;
  transactionId: string;
  gatewayRefundId?: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  initiatedBy: string;
  adminId?: string;
  createdAt: string;
  processedAt?: string;
}

export interface CreateRefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
}

// ========== Dashboard & Analytics ==========
export interface PaymentDashboardDto {
  totalRevenue: number;
  monthlyRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalRefunds: number;
  refundAmount: number;
  averageTransactionValue: number;
  recentTransactions: TransactionDto[];
}

export interface RevenueAnalyticsDto {
  monthlyRevenue: MonthlyRevenueDto[];
  revenueByPlan: PlanRevenueDto[];
  revenueByCycle: CycleRevenueDto[];
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
}

export interface MonthlyRevenueDto {
  month: string;
  revenue: number;
  transactionCount: number;
}

export interface PlanRevenueDto {
  planName: string;
  revenue: number;
  transactionCount: number;
}

export interface CycleRevenueDto {
  billingCycle: string;
  revenue: number;
  transactionCount: number;
}

// ========== Paged Result (reusable) ==========
export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
