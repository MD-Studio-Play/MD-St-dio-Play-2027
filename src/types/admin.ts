import { PlaybackPack, CartItem } from './index';

export interface SiteThemeConfig {
  primaryColor: string; // e.g. '#55c21b'
  secondaryColor: string; // e.g. '#62dc20'
  backgroundColor: string; // e.g. '#0b0c0e'
  cardBgColor: string; // e.g. '#111216'
  buttonShape: 'rounded' | 'pill' | 'square';
  buyButtonText: string; // e.g. 'Comprar'
  cartBadgeColor: string;
}

export interface TopBannerConfig {
  enabled: boolean;
  text: string;
  highlightTag: string;
  linkUrl: string;
  linkLabel: string;
  bgColor: string;
  textColor: string;
  showCountdown: boolean;
  countdownMinutes: number;
  isDismissible: boolean;
  // Hero graphic banner
  showImageBanner?: boolean;
  imageUrl?: string;
  imageLinkUrl?: string;
}

export interface LogoConfig {
  mode: 'text' | 'image';
  brandName: string;
  highlightPrefix: string;
  imageUrl: string;
  slogan: string;
}

export interface MenuItemConfig {
  id: string;
  label: string;
  url?: string;
  category?: string;
  icon?: string;
  visible: boolean;
}

export interface MenuConfig {
  items: MenuItemConfig[];
  whatsappNumber: string;
  whatsappMessage: string;
  enableCustomerSupport: boolean;
}

export interface FooterConfig {
  companyName: string;
  slogan: string;
  cnpj: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  kwaiUrl: string;
  whatsappUrl: string;
  showSocials: boolean;
  copyrightText: string;
}

export interface CouponItem {
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface CartConfig {
  defaultCoupon: string;
  coupons: CouponItem[];
  pixDiscountExtra: number; // e.g. 5% extra discount if paying with PIX
  guaranteeBadgeText: string;
  deliveryNotice: string;
}

export interface CheckoutConfig {
  pixKey: string;
  pixKeyType: 'email' | 'cpf' | 'cnpj' | 'phone' | 'random';
  pixBeneficiaryName: string;
  pixBeneficiaryCity: string;
  pixTxidPrefix: string;
  creditCardGateway: 'mercadopago' | 'stripe' | 'asaas' | 'pagbank';
  creditCardPublicKey: string;
  creditCardSecretToken: string;
  mercadoPagoAccessToken?: string;
  mercadoPagoPublicKey?: string;
  creditCardMaxInstallments: number;
  creditCardInstallmentsFree: number;
  creditCardInterestRate: number;
  isSandbox: boolean;
  whatsappGatewayUrl?: string;
  whatsappGatewayToken?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  isConnected: boolean;
  lastSyncTimestamp: string | null;
}

export interface OrderItem {
  pack: PlaybackPack;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCpf?: string;
  customer_id?: string;
  external_reference?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'pix' | 'card' | 'credit_card';
  payment_method?: 'pix' | 'card' | 'credit_card';
  status: 'completed' | 'pending' | 'cancelled';
  payment_status?: 'pending' | 'approved' | 'in_process' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  order_status?:
    | 'AGUARDANDO PAGAMENTO'
    | 'PAGAMENTO EM ANÁLISE'
    | 'PAGAMENTO APROVADO'
    | 'PAGAMENTO REJEITADO'
    | 'PAGAMENTO CANCELADO'
    | 'PAGAMENTO ESTORNADO';
  payment_id?: string;
  pixPayload?: string;
  pixQrCodeUrl?: string;
  mercadoPagoPaymentId?: string;
  ticketUrl?: string;
  cardLast4?: string;
  cardBrand?: string;
  installments?: number;
  post_sale_urls?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  mercado_pago_payment_id: string;
  external_reference?: string;
  method: string;
  amount: number;
  status: string;
  status_detail?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface AdminCredentials {
  email: string;
  passwordHash?: string;
  plainPassword?: string;
  role: 'superadmin' | 'admin';
  lastLogin?: string;
}
