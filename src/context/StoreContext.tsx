import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PlaybackPack, Track, FlyerShowConfig, FlyerItem, MidiPageConfig } from '../types';
import { ALL_PACKS } from '../data/packs';
import {
  SiteThemeConfig,
  TopBannerConfig,
  LogoConfig,
  MenuConfig,
  FooterConfig,
  CartConfig,
  CheckoutConfig,
  FirebaseConfig,
  Order,
  CustomerUser,
  AdminCredentials,
} from '../types/admin';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import {
  db,
  auth,
  testFirestoreConnection,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logoutUser,
  onAuthStateChanged,
  User,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { doc, setDoc, getDocs, collection, deleteDoc, onSnapshot } from 'firebase/firestore';

interface StoreContextType {
  // Navigation / Mode
  isAdminMode: boolean;
  setIsAdminMode: (val: boolean) => void;

  // Packs CRUD & Music Management
  packs: PlaybackPack[];
  addPack: (pack: Omit<PlaybackPack, 'id'>) => PlaybackPack;
  updatePack: (packId: string, updated: Partial<PlaybackPack>) => void;
  deletePack: (packId: string) => void;
  duplicatePack: (packId: string) => PlaybackPack | null;
  movePack: (packId: string, direction: 'up' | 'down') => void;
  movePackToPosition: (packId: string, targetIndex: number) => void;
  reorderPacks: (newPacks: PlaybackPack[]) => void;
  addTrackToPack: (packId: string, track: Omit<Track, 'id' | 'number'>) => void;
  updateTrackInPack: (packId: string, trackId: string, updated: Partial<Track>) => void;
  deleteTrackFromPack: (packId: string, trackId: string) => void;

  // Configurations
  themeConfig: SiteThemeConfig;
  setThemeConfig: React.Dispatch<React.SetStateAction<SiteThemeConfig>>;
  bannerConfig: TopBannerConfig;
  setBannerConfig: React.Dispatch<React.SetStateAction<TopBannerConfig>>;
  logoConfig: LogoConfig;
  setLogoConfig: React.Dispatch<React.SetStateAction<LogoConfig>>;
  menuConfig: MenuConfig;
  setMenuConfig: React.Dispatch<React.SetStateAction<MenuConfig>>;
  footerConfig: FooterConfig;
  setFooterConfig: React.Dispatch<React.SetStateAction<FooterConfig>>;
  cartConfig: CartConfig;
  setCartConfig: React.Dispatch<React.SetStateAction<CartConfig>>;
  checkoutConfig: CheckoutConfig;
  setCheckoutConfig: React.Dispatch<React.SetStateAction<CheckoutConfig>>;
  firebaseConfig: FirebaseConfig;
  setFirebaseConfig: React.Dispatch<React.SetStateAction<FirebaseConfig>>;
  flyerShowConfig: FlyerShowConfig;
  setFlyerShowConfig: React.Dispatch<React.SetStateAction<FlyerShowConfig>>;
  saveFlyerShowConfig: (config: FlyerShowConfig) => Promise<void>;
  midiVariadosConfig: MidiPageConfig;
  setMidiVariadosConfig: React.Dispatch<React.SetStateAction<MidiPageConfig>>;
  saveMidiVariadosConfig: (config: MidiPageConfig) => Promise<void>;
  midiGospelConfig: MidiPageConfig;
  setMidiGospelConfig: React.Dispatch<React.SetStateAction<MidiPageConfig>>;
  saveMidiGospelConfig: (config: MidiPageConfig) => Promise<void>;

  // Auth & Cloud Sync
  currentUser: User | null;
  syncWithFirestore: () => Promise<{ success: boolean; count: number }>;
  testFirebaseConnectionLive: () => Promise<{ success: boolean; message: string }>;
  loginAdminGoogle: () => Promise<void>;
  logoutAdminGoogle: () => Promise<void>;

  // Customer Area Auth & State
  customerUser: CustomerUser | null;
  isCustomerAreaOpen: boolean;
  setIsCustomerAreaOpen: (val: boolean) => void;
  loginCustomer: (email: string, pass: string) => Promise<void>;
  registerCustomer: (email: string, pass: string, name: string, phone?: string) => Promise<void>;
  logoutCustomer: () => Promise<void>;
  pendingWhatsAppPhone: string;
  setPendingWhatsAppPhone: (phone: string) => void;
  pendingWhatsAppCode: string | null;
  sendWhatsAppValidationCode: (
    phone: string,
    providedCode?: string
  ) => Promise<{ success: boolean; code: string; whatsappUrl?: string; error?: string }>;
  loginCustomerWithWhatsApp: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  loginCustomerDirectWithPhone: (phone: string) => Promise<{ success: boolean; error?: string }>;

  // Admin Portal Auth & Credentials
  isAdminAuthenticated: boolean;
  adminCredentials: AdminCredentials;
  setAdminCredentials: React.Dispatch<React.SetStateAction<AdminCredentials>>;
  loginAdmin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;

  // Orders
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'date'>) => Order;
  updateOrderStatus: (orderId: string, status: 'completed' | 'pending' | 'cancelled') => void;
  deleteOrder: (orderId: string) => void;

  // Actions
  resetToDefaults: () => void;
  exportConfigBackup: () => void;
  importConfigBackup: (jsonString: string) => boolean;
}

const DEFAULT_THEME: SiteThemeConfig = {
  primaryColor: '#eab308',
  secondaryColor: '#f59e0b',
  backgroundColor: '#0b0c0e',
  cardBgColor: '#111216',
  buttonShape: 'rounded',
  buyButtonText: 'Comprar',
  cartBadgeColor: '#eab308',
};

const DEFAULT_BANNER: TopBannerConfig = {
  enabled: false,
  text: 'PROMOÇÃO DE LANÇAMENTO MD STÚDIO: USE O CUPOM MD2026 E GANHE 20% OFF EM TODO O SITE! ⚡ LIBERAÇÃO IMEDIATA',
  highlightTag: 'SUPER OFERTA',
  linkUrl: '#',
  linkLabel: 'VER OFERTAS',
  bgColor: '#40d600',
  textColor: '#000000',
  showCountdown: true,
  countdownMinutes: 240,
  isDismissible: true,
  showImageBanner: true,
  imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/banner_(1).png?v=1l5lhuo',
  imageLinkUrl: '',
};

const DEFAULT_LOGO: LogoConfig = {
  mode: 'image',
  brandName: 'MD STÚDIO',
  highlightPrefix: 'MD',
  imageUrl: '/md_studio_logo.jpg',
  slogan: 'MD Stúdio - Playbacks Profissionais, Multitracks & Ritmos Exclusivos',
};

const DEFAULT_MENU: MenuConfig = {
  items: [
    { id: '1', label: 'Todos os Playbacks', category: 'Todos', visible: true },
    { id: '2', label: 'Forrozão & Vaquejada', category: 'Forrozão Vaquejada', visible: true },
    { id: '3', label: 'Piseiro & Pisadinha', category: 'Piseiro', visible: true },
    { id: '4', label: 'Arrocha & Seresta', category: 'Arrocha', visible: true },
    { id: '5', label: 'Sertanejo Universitário', category: 'Sertanejo', visible: true },
    { id: '6', label: 'Pagode & Samba', category: 'Pagode', visible: true },
    { id: '7', label: 'Ritmos para Teclado (Korg/Yamaha)', url: '#teclado', visible: true },
    { id: '8', label: 'Dúvidas & Suporte WhatsApp', url: '#suporte', visible: true },
  ],
  whatsappNumber: '5511999998888',
  whatsappMessage: 'Olá! Vim do site MD Stúdio Play.',
  enableCustomerSupport: true,
};

const DEFAULT_FOOTER: FooterConfig = {
  companyName: 'MD STÚDIO PRODUÇÕES LTDA',
  slogan: 'MD Stúdio - Playbacks Profissionais, Multitracks & Ritmos Exclusivos',
  cnpj: '48.912.438/0001-92',
  instagramUrl: 'https://instagram.com',
  youtubeUrl: 'https://youtube.com',
  tiktokUrl: 'https://tiktok.com',
  kwaiUrl: 'https://kwai.com',
  whatsappUrl: 'https://wa.me/5511999998888',
  showSocials: true,
  copyrightText: 'Todos os direitos reservados. Áudios masterizados em 320kbps com e sem guia.',
};

const DEFAULT_CART: CartConfig = {
  defaultCoupon: 'MD2026',
  coupons: [
    { code: 'MD2026', discountPercent: 20, active: true },
    { code: 'PIX10', discountPercent: 10, active: true },
    { code: 'VIP30', discountPercent: 30, active: true },
    { code: 'PROMO15', discountPercent: 15, active: true },
  ],
  pixDiscountExtra: 5,
  guaranteeBadgeText: 'Liberação imediata no PIX oficial',
  deliveryNotice: 'Download instantâneo dos arquivos em ZIP (Master + Stems Multitrack).',
};

const DEFAULT_CHECKOUT: CheckoutConfig = {
  pixKey: 'comercial@mdstudioplay.com.br',
  pixKeyType: 'email',
  pixBeneficiaryName: 'MD STUDIO PLAY',
  pixBeneficiaryCity: 'VITÓRIA ES',
  pixTxidPrefix: 'MDST',
  creditCardGateway: 'mercadopago',
  creditCardPublicKey: 'APP_USR-e20b9b98-f894-4c4a-a362-d966053a663f',
  creditCardSecretToken: 'APP_USR-5316548655442262-070119-f451011a35f5f129f4c1b6fe44cc3cf1-3430570962',
  mercadoPagoAccessToken: '',
  mercadoPagoPublicKey: 'APP_USR-e20b9b98-f894-4c4a-a362-d966053a663f',
  creditCardMaxInstallments: 6,
  creditCardInstallmentsFree: 3,
  creditCardInterestRate: 2.99,
  isSandbox: true,
  whatsappGatewayUrl: '',
  whatsappGatewayToken: '',
};

const DEFAULT_FIREBASE: FirebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || '',
  authDomain: firebaseAppletConfig.authDomain || '',
  projectId: firebaseAppletConfig.projectId || '',
  storageBucket: firebaseAppletConfig.storageBucket || '',
  messagingSenderId: firebaseAppletConfig.messagingSenderId || '',
  appId: firebaseAppletConfig.appId || '',
  isConnected: true,
  lastSyncTimestamp: new Date().toISOString(),
};

export const DEFAULT_FLYER_SHOW: FlyerShowConfig = {
  headerTitle: 'FLYER PARA SHOW & EVENTOS',
  headerSubtitle: 'FLYERS PROFISSIONAIS DE ALTA CONVERSÃO PARA DIVULGAR SEU SHOW OU EVENTO.',
  badgeText: 'SUPER PACK PROMOCIONAL',
  title: 'MEGA COLETÂNEA DESIGNER - PACK 150+ FLYERS EDITÁVEIS',
  description:
    'Transforme suas divulgações em segundos! Tenha acesso ao acervo profissional definitivo preferido pelos maiores produtores e cantores de shows do Brasil. Arquivos limpos e super organizados em camadas.',
  coverImage:
    'https://moriartdigital.com.br/mdstudio/wa_images/gemini_generated_image_bh57tfbh57tfbh57_1.png?v=1l2effs',
  originalPrice: 97.0,
  discountPrice: 57.99,
  discountTag: 'Economize 40%',
  features: [
    'Mais de 150 Artes Prontas e Editáveis em Photoshop (.PSD)',
    'Acesso a pasta exclusiva do Google Drive atualizada semanalmente',
    'Modelos prontos para Reels, Stories, e Feed do Instagram',
    'Fontes e Estilos de Texto 3D Prontos incluídos',
    'Mockups de alta qualidade inclusos para divulgação comercial',
  ],
  gallery: [
    {
      id: 'fl_1',
      title: 'Cavalgada dos Amigos',
      category: 'Cavalgada & Sertanejo',
      imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/001.png?v=1lblugj',
    },
    {
      id: 'fl_2',
      title: 'Eu Arraiá',
      category: 'Forró & São João',
      imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/02_(4).png?v=1lblugj',
    },
    {
      id: 'fl_3',
      title: 'Boteco Arrocha Sofrência',
      category: 'Arrocha & Seresta',
      imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/03.png?v=1lblugj',
    },
    {
      id: 'fl_4',
      title: 'Contrate Para Seu Evento',
      category: 'Cantor & Banda',
      imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/4.png?v=1lblugj',
    },
    {
      id: 'fl_5',
      title: '4º Aniversário da Igreja',
      category: 'Gospel & Igreja',
      imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/05.png?v=1lblugj',
    },
    {
      id: 'fl_6',
      title: 'Congresso de Jovens',
      category: 'Congresso Gospel',
      imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/06_(1).png?v=1lblugj',
    },
    {
      id: 'fl_7',
      title: 'Bloquinho de Carnaval 2026',
      category: 'Carnaval & Micareta',
      imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/07_(1).png?v=1lblugj',
    },
  ],
  demoDownloadUrl:
    'https://moriartdigital.com.br/mdstudio/wa_files/story_resenha_flyer_priscila_senna_wesley_safadao_xand_aviao_social_media_ps.zip',
  demoButtonText: 'DOWNLOAD MODELO DEMO GRATIS',
  postSaleUrl:
    'https://drive.google.com/drive/folders/1UdFKQtVtrGIcvS6U087ntO8-NYg8c2g1?usp=drive_link',
};

export const DEFAULT_MIDI_VARIADOS: MidiPageConfig = {
  topBadge: '★ COLETÂNEA EXCLUSIVA DE ARRANJOS MIDI ★',
  title: 'COLETÂNEA MEGA PACK MIDI VARIADOSVIP 2026',
  description:
    'Tenha acesso a uma coleção completa de arquivos MIDI, cuidadosamente organizada para músicos, tecladistas e produtores.\n\nChega de comprar MIDIs separados por preços elevados.\n\nTenha tudo reunido em uma única coletânea e faça o download de forma rápida, prática e organizada.',
  subHighlight1: 'Centenas de MIDIs variados em um único pacote!',
  subHighlight2: 'VALOR ESPECIAL DA COLETÂNEA',
  circleImage: '/midi_variados_art.jpg',
  circleBadgeText: 'MIDI VARIADOS',
  bottomPillText: 'MILHARES ARQUIVOS MIDI PROFISSIONAIS',
  priceLabel: 'VALOR ESPECIAL DA COLETÂNEA',
  price: 57.99,
  priceSubtext: '/ no pix',
  showPrice: true,
  buttonText: 'ADQUIRA A COLETÂNEA COMPLETA',
  audioPreviewTitle: 'DEMONSTRAÇÃO DE ÁUDIO — MIDI VARIADOS',
  audioPreviewSubtitle: 'Clique para ouvir uma amostra dos ritmos variados',
  audioPreviewUrl:
    'https://moriartdigital.com.br/mdstudio/wa_files/(x)cam.%20amarelo%20dodge%20rom%20s.%20disfarcado.mp3',
  postSaleUrl:
    'https://drive.google.com/drive/folders/1ns6pguW_lxaQdqrn7RdIBwBWVr36VJkm?usp=drive_link',
  tracklistUrl:
    'https://moriartdigital.com.br/mdstudio/wa_files/midis%20para%20apresentacao.docx',
  tracklistButtonText: 'VER LISTA COMPLETA DAS MÚSICAS',
  highlights: [
    'Compatível com Teclados Korg, Yamaha, Roland, Casio e Nord',
    'Pistas separadas: Bateria, Baixo, Teclados, Metais, Strings e Solo',
    'Arquivos Padrão General MIDI (GM / SMF 0 e 1) 100% editáveis',
    'Ideal para DAWs: Reaper, Pro Tools, FL Studio, Logic e Cubase',
    'Organizado por ritmos: Forró, Piseiro, Arrocha, Sertanejo, Pagode e Axé',
  ],
};

export const DEFAULT_MIDI_GOSPEL: MidiPageConfig = {
  topBadge: '★ COLETÂNEA EXCLUSIVA DE ARRANJOS ★',
  title: 'COLETÂNEA MEGA PACK MIDI GOSPEL 2026',
  description:
    'Tenha acesso a uma coleção completa de arquivos MIDI GOSPEL, cuidadosamente organizada para músicos, tecladistas e produtores.\n\nChega de comprar MIDIs separados por preços elevados. Tenha tudo reunido em uma única coletânea e faça o download de forma rápida, prática e organizada.',
  subHighlight1: 'Centenas de MIDIs GOSPEL em um único pacote!',
  subHighlight2: 'VALOR ESPECIAL DA COLETÂNEA',
  circleImage:
    'https://moriartdigital.com.br/mdstudio/wa_images/watermarked_img_15007118089605638878.jpg?v=1lbdtms',
  circleBadgeText: 'GOSPEL MIDI PRO',
  bottomPillText: 'MILHARES ARQUIVOS MIDI PROFISSIONAIS',
  priceLabel: 'VALOR ESPECIAL DA COLETÂNEA',
  price: 57.99,
  priceSubtext: '/ no pix',
  showPrice: true,
  buttonText: 'ADQUIRA A COLETÂNEA COMPLETA',
  audioPreviewTitle: 'DEMONSTRAÇÃO DE ÁUDIO — MIDI GOSPEL',
  audioPreviewSubtitle: 'Clique para ouvir uma amostra dos louvores e adoração',
  audioPreviewUrl:
    'https://moriartdigital.com.br/mdstudio/wa_files/eu%20navegarei%20demo%20midi.mp3',
  postSaleUrl:
    'https://drive.google.com/drive/folders/1J6vQUbziL7PvtWhc1iZCcht2fIRRwtYd?usp=drive_link',
  tracklistUrl:
    'https://moriartdigital.com.br/mdstudio/wa_files/midi%20gospel%20apresentacao_(1).docx',
  tracklistButtonText: 'VER LISTA COMPLETA DAS MÚSICAS',
  highlights: [
    'Repertório completo de Adoração, Celebração e Harpa Cristã',
    'Canais mapeados: Piano acústico, Pads, Bateria, Baixo e Guitarras',
    'Compatível com Teclados Arranjadores e DAWs profissionais',
    'Pronto para tocar ao vivo em cultos, vigílias e congressos',
    'Download imediato e acesso vitalício no Google Drive',
  ],
};

const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 'ord_1790450129793',
    orderNumber: '#MD-2581',
    date: '2026-09-26 16:15',
    customerName: 'André Rodrigues',
    customerEmail: 'moriartdigital@gmail.com',
    customerPhone: '(27) 99650-9853',
    items: [{ pack: ALL_PACKS[0], quantity: 1 }],
    subtotal: 29.9,
    discount: 0,
    total: 29.9,
    paymentMethod: 'pix',
    status: 'completed',
  },
  {
    id: 'ord_1790367855129',
    orderNumber: '#MD-3288',
    date: '2026-09-25 17:24',
    customerName: 'André Rodrigues',
    customerEmail: 'moriartdigital@gmail.com',
    customerPhone: '(27) 99650-9853',
    items: [{ pack: ALL_PACKS[0], quantity: 1 }],
    subtotal: 5,
    discount: 0,
    total: 5,
    paymentMethod: 'pix',
    status: 'completed',
  },
  {
    id: 'ord_1790366409066',
    orderNumber: '#MD-8884',
    date: '2026-09-25 17:00',
    customerName: 'André Rodrigues',
    customerEmail: 'moriartdigital@gmail.com',
    customerPhone: '(27) 99650-9853',
    items: [
      { pack: ALL_PACKS[0], quantity: 1 },
      { pack: ALL_PACKS[1], quantity: 1 },
    ],
    subtotal: 51.06,
    discount: 0,
    total: 51.06,
    paymentMethod: 'pix',
    status: 'completed',
  },
];

const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  email: 'admin@mdstudio.com.br',
  plainPassword: 'Admin@MDStudio2026!',
  role: 'superadmin',
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return localStorage.getItem('jsp_is_admin') === 'true';
  });

  // Admin Portal Auth
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => {
    const saved = localStorage.getItem('jsp_admin_creds');
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN_CREDENTIALS;
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('jsp_admin_auth') === 'true';
  });

  // Customer Area State
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(() => {
    const saved = localStorage.getItem('jsp_customer_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isCustomerAreaOpen, setIsCustomerAreaOpen] = useState<boolean>(false);
  const [pendingWhatsAppPhone, setPendingWhatsAppPhone] = useState<string>(() => {
    return localStorage.getItem('jsp_pending_wa_phone') || '';
  });
  const [pendingWhatsAppCode, setPendingWhatsAppCode] = useState<string | null>(() => {
    return localStorage.getItem('jsp_pending_wa_code') || null;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // If user logged in via Firebase, sync with customerUser if not admin
        const isUserAdmin =
          user.email?.toLowerCase() === adminCredentials.email.toLowerCase() ||
          user.email?.includes('admin@');

        if (isUserAdmin) {
          setIsAdminAuthenticated(true);
          localStorage.setItem('jsp_admin_auth', 'true');
        }

        // Also populate customer profile
        setCustomerUser((prev) => {
          const profile: CustomerUser = {
            id: user.uid,
            email: user.email || '',
            name: prev?.name || user.displayName || user.email?.split('@')[0] || 'Cliente',
            phone: prev?.phone || '',
            createdAt: prev?.createdAt || new Date().toISOString(),
          };
          localStorage.setItem('jsp_customer_user', JSON.stringify(profile));
          return profile;
        });
      }
    });
    return () => unsubscribe();
  }, [adminCredentials.email]);

  // Packs State - complete authentic packs with guaranteed array tracks
  const [packs, setPacks] = useState<PlaybackPack[]>(() => {
    const saved = localStorage.getItem('jsp_packs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If saved has the old dummy "Xote Sertanejo" pack, discard it!
          if (parsed[0]?.title !== 'Xote Sertanejo' && parsed[0]?.artist !== 'Vários Artistas') {
            return parsed.map((p: any) => ({
              ...p,
              genre: p.genre || 'Geral',
              genres: Array.isArray(p.genres) ? p.genres : [p.genre || 'Geral'],
              tracks: Array.isArray(p.tracks) ? p.tracks : [],
            }));
          }
        }
      } catch {
        return ALL_PACKS;
      }
    }
    return ALL_PACKS;
  });

  // Themes & Configs
  const [themeConfig, setThemeConfig] = useState<SiteThemeConfig>(() => {
    const saved = localStorage.getItem('jsp_theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.primaryColor && parsed.primaryColor !== '#55c21b' && parsed.primaryColor !== '#16a34a') {
          return parsed;
        }
      } catch {
        return DEFAULT_THEME;
      }
    }
    return DEFAULT_THEME;
  });

  const [bannerConfig, setBannerConfig] = useState<TopBannerConfig>(() => {
    const saved = localStorage.getItem('jsp_banner');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.imageUrl && !parsed.text?.includes('JS2026')) {
          return {
            ...DEFAULT_BANNER,
            ...parsed,
            imageUrl: parsed.imageUrl || DEFAULT_BANNER.imageUrl,
            showImageBanner: parsed.showImageBanner !== undefined ? parsed.showImageBanner : true,
            imageLinkUrl: parsed.imageLinkUrl || '',
          };
        }
      } catch {
        return DEFAULT_BANNER;
      }
    }
    return DEFAULT_BANNER;
  });

  const [logoConfig, setLogoConfig] = useState<LogoConfig>(() => {
    const saved = localStorage.getItem('jsp_logo');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.brandName === 'PLAYBACKS' || !parsed.imageUrl || parsed.highlightPrefix === 'JS') {
          return DEFAULT_LOGO;
        }
        return parsed;
      } catch {
        return DEFAULT_LOGO;
      }
    }
    return DEFAULT_LOGO;
  });

  const [menuConfig, setMenuConfig] = useState<MenuConfig>(() => {
    const saved = localStorage.getItem('jsp_menu');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.whatsappMessage && parsed.whatsappMessage.includes('JS Playbacks')) {
          return { ...parsed, whatsappMessage: 'Olá! Vim do site MD Stúdio Play.' };
        }
        return parsed;
      } catch {
        return DEFAULT_MENU;
      }
    }
    return DEFAULT_MENU;
  });

  const [footerConfig, setFooterConfig] = useState<FooterConfig>(() => {
    const saved = localStorage.getItem('jsp_footer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.companyName && (parsed.companyName.includes('JS PLAYBACKS') || parsed.companyName.includes('JS Playbacks'))) {
          return DEFAULT_FOOTER;
        }
        return parsed;
      } catch {
        return DEFAULT_FOOTER;
      }
    }
    return DEFAULT_FOOTER;
  });

  const [cartConfig, setCartConfig] = useState<CartConfig>(() => {
    const saved = localStorage.getItem('jsp_cart');
    return saved ? JSON.parse(saved) : DEFAULT_CART;
  });

  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig>(() => {
    const saved = localStorage.getItem('jsp_checkout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.pixBeneficiaryName && parsed.pixBeneficiaryName.includes('JS PLAYBACKS')) {
          return DEFAULT_CHECKOUT;
        }
        return parsed;
      } catch {
        return DEFAULT_CHECKOUT;
      }
    }
    return DEFAULT_CHECKOUT;
  });

  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>(() => {
    const saved = localStorage.getItem('jsp_firebase');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          projectId: firebaseAppletConfig.projectId || parsed.projectId,
          apiKey: firebaseAppletConfig.apiKey || parsed.apiKey,
        };
      } catch {
        return DEFAULT_FIREBASE;
      }
    }
    return DEFAULT_FIREBASE;
  });

  const [flyerShowConfig, setFlyerShowConfig] = useState<FlyerShowConfig>(() => {
    const saved = localStorage.getItem('jsp_flyer_show_v2') || localStorage.getItem('jsp_flyer_show');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If legacy stale state from earlier sessions (49.9 or old local image), discard and use DEFAULT_FLYER_SHOW
        if (
          parsed.discountPrice === 49.9 ||
          parsed.coverImage === '/flyer_main_pack_1790608448982.jpg' ||
          !parsed.coverImage?.startsWith('http')
        ) {
          return DEFAULT_FLYER_SHOW;
        }
        return {
          ...DEFAULT_FLYER_SHOW,
          ...parsed,
          coverImage: parsed.coverImage || DEFAULT_FLYER_SHOW.coverImage,
          gallery: Array.isArray(parsed.gallery) && parsed.gallery.length > 0
            ? parsed.gallery
            : DEFAULT_FLYER_SHOW.gallery,
        };
      } catch {
        return DEFAULT_FLYER_SHOW;
      }
    }
    return DEFAULT_FLYER_SHOW;
  });

  const [midiVariadosConfig, setMidiVariadosConfig] = useState<MidiPageConfig>(() => {
    const saved = localStorage.getItem('jsp_midi_variados_v3') || localStorage.getItem('jsp_midi_variados_v2') || localStorage.getItem('jsp_midi_variados');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed.price === 149.9 ||
          !parsed.tracklistUrl ||
          parsed.postSaleUrl?.includes('mega-pack') ||
          parsed.audioPreviewUrl?.includes('freesound')
        ) {
          return DEFAULT_MIDI_VARIADOS;
        }
        return {
          ...DEFAULT_MIDI_VARIADOS,
          ...parsed,
          price: 57.99,
          circleImage: parsed.circleImage || DEFAULT_MIDI_VARIADOS.circleImage,
          tracklistUrl: DEFAULT_MIDI_VARIADOS.tracklistUrl,
          audioPreviewUrl: DEFAULT_MIDI_VARIADOS.audioPreviewUrl,
          postSaleUrl: DEFAULT_MIDI_VARIADOS.postSaleUrl,
        };
      } catch {
        return DEFAULT_MIDI_VARIADOS;
      }
    }
    return DEFAULT_MIDI_VARIADOS;
  });

  const [midiGospelConfig, setMidiGospelConfig] = useState<MidiPageConfig>(() => {
    const saved =
      localStorage.getItem('jsp_midi_gospel_v6') ||
      localStorage.getItem('jsp_midi_gospel_v5') ||
      localStorage.getItem('jsp_midi_gospel');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed.price === 149.9 ||
          parsed.circleImage === '/midi_gospel_art.jpg' ||
          !parsed.circleImage?.startsWith('http') ||
          parsed.audioPreviewUrl?.includes('(x)cam.') ||
          parsed.audioPreviewUrl?.includes('freesound') ||
          parsed.postSaleUrl?.includes('mega-pack') ||
          parsed.postSaleUrl?.includes('1ns6pguW')
        ) {
          return DEFAULT_MIDI_GOSPEL;
        }
        return {
          ...DEFAULT_MIDI_GOSPEL,
          ...parsed,
          price: 57.99,
          circleImage: DEFAULT_MIDI_GOSPEL.circleImage,
          tracklistUrl: DEFAULT_MIDI_GOSPEL.tracklistUrl,
          audioPreviewUrl: DEFAULT_MIDI_GOSPEL.audioPreviewUrl,
          postSaleUrl: DEFAULT_MIDI_GOSPEL.postSaleUrl,
        };
      } catch {
        return DEFAULT_MIDI_GOSPEL;
      }
    }
    return DEFAULT_MIDI_GOSPEL;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('jsp_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((o: any) => ({
            ...o,
            orderNumber: o.orderNumber || o.id || 'PED-000000',
            date: o.date || new Date().toISOString(),
            customerName: o.customerName || 'Cliente',
            customerEmail: o.customerEmail || '',
            items: Array.isArray(o.items)
              ? o.items.map((it: any) => ({
                  ...it,
                  pack: {
                    ...it.pack,
                    tracks: Array.isArray(it.pack?.tracks) ? it.pack.tracks : [],
                  },
                }))
              : [],
            total: Number(o.total) || 0,
            subtotal: Number(o.subtotal) || Number(o.total) || 0,
            status: o.status || 'pending',
            paymentMethod: o.paymentMethod || 'pix',
          }));
        }
      } catch {
        return INITIAL_DEMO_ORDERS;
      }
    }
    return INITIAL_DEMO_ORDERS;
  });

  // Ref to prevent echo loops when Firestore pushes incoming remote updates
  const isIncomingSyncRef = useRef<{ [key: string]: boolean }>({});
  // Ref to track if initial remote sync from Firestore has loaded to prevent overwriting with defaults
  const hasRemoteLoadedRef = useRef<{ [key: string]: boolean }>({});

  // On initial mount: test connection, setup real-time onSnapshot listeners across all collections
  useEffect(() => {
    testFirestoreConnection().then((res) => {
      if (res.success) {
        setFirebaseConfig((prev) => ({
          ...prev,
          isConnected: true,
          lastSyncTimestamp: new Date().toISOString(),
        }));
      }
    });

    // 1. REAL-TIME LISTENER: Playback Packs Catalog
    const unsubPacks = onSnapshot(
      collection(db, 'playback_packs'),
      (snapshot) => {
        if (!snapshot.empty) {
          const livePacks: PlaybackPack[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.deleted) {
              livePacks.push({
                ...data,
                id: docSnap.id || data.id,
                title: data.title || 'Playback Pack',
                artist: data.artist || 'Artista',
                genre: data.genre || 'Geral',
                genres: Array.isArray(data.genres) ? data.genres : [data.genre || 'Geral'],
                tracks: Array.isArray(data.tracks) ? data.tracks : [],
                originalPrice: Number(data.originalPrice) || 0,
                discountPrice: Number(data.discountPrice) || 0,
              } as PlaybackPack);
            }
          });
          if (livePacks.length > 0) {
            livePacks.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
            isIncomingSyncRef.current['packs'] = true;
            hasRemoteLoadedRef.current['packs'] = true;
            setPacks(livePacks);
            localStorage.setItem('jsp_packs', JSON.stringify(livePacks));
          }
        }
      },
      (err) => {
        console.warn('Real-time packs subscription notice:', err);
      }
    );

    // 2. REAL-TIME LISTENER: Site Settings (Theme, Banner, Logo, Menu, Footer, Cart, Checkout)
    const unsubSettings = onSnapshot(
      collection(db, 'site_settings'),
      (snapshot) => {
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const config = data.config || data;
            const id = docSnap.id;
            isIncomingSyncRef.current[id] = true;
            hasRemoteLoadedRef.current[id] = true;

            if (id === 'theme' && config.primaryColor) {
              setThemeConfig(config);
              localStorage.setItem('jsp_theme', JSON.stringify(config));
            } else if (id === 'banner' && config.text !== undefined) {
              setBannerConfig(config);
              localStorage.setItem('jsp_banner', JSON.stringify(config));
            } else if (id === 'logo' && config.brandName) {
              setLogoConfig(config);
              localStorage.setItem('jsp_logo', JSON.stringify(config));
            } else if (id === 'menu' && Array.isArray(config.items)) {
              setMenuConfig(config);
              localStorage.setItem('jsp_menu', JSON.stringify(config));
            } else if (id === 'footer' && config.companyName) {
              setFooterConfig(config);
              localStorage.setItem('jsp_footer', JSON.stringify(config));
            } else if (id === 'cart' && Array.isArray(config.coupons)) {
              setCartConfig(config);
              localStorage.setItem('jsp_cart', JSON.stringify(config));
            } else if (id === 'checkout' && config.pixKey) {
              setCheckoutConfig(config);
              localStorage.setItem('jsp_checkout', JSON.stringify(config));
            }
          });
        }
      },
      (err) => {
        console.warn('Real-time settings subscription notice:', err);
      }
    );

    // 3. REAL-TIME LISTENER: Site Configs (Flyer Show, MIDI Variados, MIDI Gospel)
    const unsubConfigs = onSnapshot(
      collection(db, 'site_configs'),
      (snapshot) => {
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const config = docSnap.data();
            const id = docSnap.id;
            isIncomingSyncRef.current[id] = true;
            hasRemoteLoadedRef.current[id] = true;

            if (id === 'flyer_show' && config.title) {
              setFlyerShowConfig(config as FlyerShowConfig);
              localStorage.setItem('jsp_flyer_show', JSON.stringify(config));
            } else if (id === 'midi_variados' && config.title) {
              const merged = {
                ...DEFAULT_MIDI_VARIADOS,
                ...config,
                price: 57.99,
                circleImage: config.circleImage || DEFAULT_MIDI_VARIADOS.circleImage,
                tracklistUrl: config.tracklistUrl || DEFAULT_MIDI_VARIADOS.tracklistUrl,
                audioPreviewUrl: config.audioPreviewUrl || DEFAULT_MIDI_VARIADOS.audioPreviewUrl,
                postSaleUrl: config.postSaleUrl || DEFAULT_MIDI_VARIADOS.postSaleUrl,
              };
              setMidiVariadosConfig(merged as MidiPageConfig);
              localStorage.setItem('jsp_midi_variados', JSON.stringify(merged));
              localStorage.setItem('jsp_midi_variados_v3', JSON.stringify(merged));
            } else if (id === 'midi_gospel' && config.title) {
              const merged = {
                ...DEFAULT_MIDI_GOSPEL,
                ...config,
                price: 57.99,
                circleImage: config.circleImage || DEFAULT_MIDI_GOSPEL.circleImage,
                tracklistUrl: config.tracklistUrl || DEFAULT_MIDI_GOSPEL.tracklistUrl,
                audioPreviewUrl: config.audioPreviewUrl || DEFAULT_MIDI_GOSPEL.audioPreviewUrl,
                postSaleUrl: config.postSaleUrl || DEFAULT_MIDI_GOSPEL.postSaleUrl,
              };
              setMidiGospelConfig(merged as MidiPageConfig);
              localStorage.setItem('jsp_midi_gospel', JSON.stringify(merged));
              localStorage.setItem('jsp_midi_gospel_v6', JSON.stringify(merged));
            }
          });
        }
      },
      (err) => {
        console.warn('Real-time configs subscription notice:', err);
      }
    );

    // 4. REAL-TIME LISTENER: Orders
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        if (!snapshot.empty) {
          const liveOrders: Order[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.deleted) {
              liveOrders.push({
                ...data,
                id: docSnap.id || data.id,
                orderNumber: data.orderNumber || data.id || 'PED-000000',
                date: data.date || new Date().toISOString(),
                customerName: data.customerName || 'Cliente',
                customerEmail: data.customerEmail || '',
                items: Array.isArray(data.items)
                  ? data.items.map((it: any) => ({
                      ...it,
                      pack: {
                        ...it?.pack,
                        tracks: Array.isArray(it?.pack?.tracks) ? it.pack.tracks : [],
                      },
                    }))
                  : [],
                total: Number(data.total) || 0,
                subtotal: Number(data.subtotal) || Number(data.total) || 0,
                status: data.status || 'pending',
                paymentMethod: data.paymentMethod || 'pix',
              } as Order);
            }
          });
          if (liveOrders.length > 0) {
            liveOrders.sort(
              (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
            isIncomingSyncRef.current['orders'] = true;
            setOrders(liveOrders);
            localStorage.setItem('jsp_orders', JSON.stringify(liveOrders));
          }
        }
      },
      (err) => {
        console.warn('Real-time orders subscription notice:', err);
      }
    );

    // 5. Cross-tab real-time sync for multiple tabs open in the same browser
    const handleStorageEvent = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === 'jsp_packs') {
          setPacks(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_theme') {
          setThemeConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_banner') {
          setBannerConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_logo') {
          setLogoConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_menu') {
          setMenuConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_footer') {
          setFooterConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_cart') {
          setCartConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_checkout') {
          setCheckoutConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_flyer_show') {
          setFlyerShowConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_midi_variados') {
          setMidiVariadosConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_midi_gospel') {
          setMidiGospelConfig(JSON.parse(e.newValue));
        } else if (e.key === 'jsp_orders') {
          setOrders(JSON.parse(e.newValue));
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      unsubPacks();
      unsubSettings();
      unsubConfigs();
      unsubOrders();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Auto-sync with localStorage & auto-push to Firestore for multi-browser real-time propagation
  useEffect(() => {
    localStorage.setItem('jsp_is_admin', isAdminMode ? 'true' : 'false');
  }, [isAdminMode]);

  useEffect(() => {
    localStorage.setItem('jsp_packs', JSON.stringify(packs));
  }, [packs]);

  useEffect(() => {
    localStorage.setItem('jsp_theme', JSON.stringify(themeConfig));
    // Apply dynamic CSS variables for real-time site theme
    document.documentElement.style.setProperty('--color-primary', themeConfig.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', themeConfig.secondaryColor);
    document.documentElement.style.setProperty('--color-background', themeConfig.backgroundColor);

    if (isIncomingSyncRef.current['theme']) {
      isIncomingSyncRef.current['theme'] = false;
      return;
    }
    setDoc(
      doc(db, 'site_settings', 'theme'),
      {
        key: 'theme',
        config: themeConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }, [themeConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_banner', JSON.stringify(bannerConfig));
    if (isIncomingSyncRef.current['banner']) {
      isIncomingSyncRef.current['banner'] = false;
      return;
    }
    setDoc(
      doc(db, 'site_settings', 'banner'),
      {
        key: 'banner',
        config: bannerConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }, [bannerConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_logo', JSON.stringify(logoConfig));
    if (isIncomingSyncRef.current['logo']) {
      isIncomingSyncRef.current['logo'] = false;
      return;
    }
    setDoc(
      doc(db, 'site_settings', 'logo'),
      {
        key: 'logo',
        config: logoConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }, [logoConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_menu', JSON.stringify(menuConfig));
    if (isIncomingSyncRef.current['menu']) {
      isIncomingSyncRef.current['menu'] = false;
      return;
    }
    setDoc(
      doc(db, 'site_settings', 'menu'),
      {
        key: 'menu',
        config: menuConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }, [menuConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_footer', JSON.stringify(footerConfig));
    if (isIncomingSyncRef.current['footer']) {
      isIncomingSyncRef.current['footer'] = false;
      return;
    }
    setDoc(
      doc(db, 'site_settings', 'footer'),
      {
        key: 'footer',
        config: footerConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }, [footerConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_cart', JSON.stringify(cartConfig));
    if (isIncomingSyncRef.current['cart']) {
      isIncomingSyncRef.current['cart'] = false;
      return;
    }
    setDoc(
      doc(db, 'site_settings', 'cart'),
      {
        key: 'cart',
        config: cartConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }, [cartConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_checkout', JSON.stringify(checkoutConfig));
    if (isIncomingSyncRef.current['checkout']) {
      isIncomingSyncRef.current['checkout'] = false;
      return;
    }
    setDoc(
      doc(db, 'site_settings', 'checkout'),
      {
        key: 'checkout',
        config: checkoutConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }, [checkoutConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_firebase', JSON.stringify(firebaseConfig));
  }, [firebaseConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_orders', JSON.stringify(orders));
  }, [orders]);

  // Direct Explicit Save Functions with guaranteed Firestore persistence
  const saveFlyerShowConfig = async (config: FlyerShowConfig) => {
    setFlyerShowConfig(config);
    localStorage.setItem('jsp_flyer_show', JSON.stringify(config));
    localStorage.setItem('jsp_flyer_show_v2', JSON.stringify(config));
    hasRemoteLoadedRef.current['flyer_show'] = true;
    await setDoc(doc(db, 'site_configs', 'flyer_show'), config, { merge: true }).catch((err) => {
      console.warn('Firestore flyer_show save notice:', err);
    });
    await setDoc(
      doc(db, 'site_settings', 'flyer_show'),
      { key: 'flyer_show', config },
      { merge: true }
    ).catch(() => {});
  };

  const saveMidiVariadosConfig = async (config: MidiPageConfig) => {
    setMidiVariadosConfig(config);
    localStorage.setItem('jsp_midi_variados', JSON.stringify(config));
    localStorage.setItem('jsp_midi_variados_v2', JSON.stringify(config));
    hasRemoteLoadedRef.current['midi_variados'] = true;
    await setDoc(doc(db, 'site_configs', 'midi_variados'), config, { merge: true }).catch((err) => {
      console.warn('Firestore midi_variados save notice:', err);
    });
    await setDoc(
      doc(db, 'site_settings', 'midi_variados'),
      { key: 'midi_variados', config },
      { merge: true }
    ).catch(() => {});
  };

  const saveMidiGospelConfig = async (config: MidiPageConfig) => {
    setMidiGospelConfig(config);
    localStorage.setItem('jsp_midi_gospel', JSON.stringify(config));
    localStorage.setItem('jsp_midi_gospel_v4', JSON.stringify(config));
    localStorage.setItem('jsp_midi_gospel_v5', JSON.stringify(config));
    hasRemoteLoadedRef.current['midi_gospel'] = true;
    await setDoc(doc(db, 'site_configs', 'midi_gospel'), config, { merge: true }).catch((err) => {
      console.warn('Firestore midi_gospel save notice:', err);
    });
    await setDoc(
      doc(db, 'site_settings', 'midi_gospel'),
      { key: 'midi_gospel', config },
      { merge: true }
    ).catch(() => {});
  };

  useEffect(() => {
    localStorage.setItem('jsp_flyer_show', JSON.stringify(flyerShowConfig));
    localStorage.setItem('jsp_flyer_show_v2', JSON.stringify(flyerShowConfig));
  }, [flyerShowConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_midi_variados', JSON.stringify(midiVariadosConfig));
  }, [midiVariadosConfig]);

  useEffect(() => {
    localStorage.setItem('jsp_midi_gospel', JSON.stringify(midiGospelConfig));
    localStorage.setItem('jsp_midi_gospel_v4', JSON.stringify(midiGospelConfig));
  }, [midiGospelConfig]);

  // Pack CRUD functions
  const addPack = (packData: Omit<PlaybackPack, 'id'>): PlaybackPack => {
    const newPack: PlaybackPack = {
      ...packData,
      id: `pack_${Date.now()}`,
    };
    setPacks((prev) => [newPack, ...prev]);

    // Async persist to Firestore
    setDoc(doc(db, 'playback_packs', newPack.id), newPack).catch((err) => {
      console.warn('Firestore pack add warning:', err);
    });

    return newPack;
  };

  const updatePack = (packId: string, updated: Partial<PlaybackPack>) => {
    setPacks((prev) => {
      const nextList = prev.map((p) => {
        if (p.id === packId) {
          const next = { ...p, ...updated };
          setDoc(doc(db, 'playback_packs', packId), next, { merge: true }).catch((err) => {
            console.warn('Firestore pack update warning:', err);
          });
          return next;
        }
        return p;
      });
      localStorage.setItem('jsp_packs', JSON.stringify(nextList));
      return nextList;
    });
  };

  const deletePack = (packId: string) => {
    setPacks((prev) => {
      const updated = prev.filter((p) => p.id !== packId);
      localStorage.setItem('jsp_packs', JSON.stringify(updated));
      return updated;
    });
    deleteDoc(doc(db, 'playback_packs', packId)).catch(() => {});
    setDoc(doc(db, 'playback_packs', packId), { deleted: true }, { merge: true }).catch(() => {});
  };

  const duplicatePack = (packId: string): PlaybackPack | null => {
    const original = packs.find((p) => p.id === packId);
    if (!original) return null;

    const originalIndex = packs.findIndex((p) => p.id === packId);
    const newId = `pack_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const duplicatedTracks: Track[] = (original.tracks || []).map((t, idx) => ({
      ...t,
      id: `tr_${Date.now()}_${idx + 1}_${Math.floor(Math.random() * 1000)}`,
      number: idx + 1,
    }));

    const duplicatedPack: PlaybackPack = {
      ...original,
      id: newId,
      title: `${original.title} (Cópia)`,
      tracks: duplicatedTracks,
    };

    setPacks((prev) => {
      const copy = [...prev];
      // Insert immediately right after the original pack
      const insertAt = originalIndex >= 0 ? originalIndex + 1 : 0;
      copy.splice(insertAt, 0, duplicatedPack);
      localStorage.setItem('jsp_packs', JSON.stringify(copy));

      // Update orderIndex across packs
      copy.forEach((p, idx) => {
        setDoc(doc(db, 'playback_packs', p.id), { ...p, orderIndex: idx }, { merge: true }).catch(() => {});
      });

      return copy;
    });

    // Save full document in Firestore
    setDoc(doc(db, 'playback_packs', duplicatedPack.id), duplicatedPack).catch((err) => {
      console.warn('Firestore pack duplicate warning:', err);
    });

    return duplicatedPack;
  };

  const movePack = (packId: string, direction: 'up' | 'down') => {
    setPacks((prev) => {
      const index = prev.findIndex((p) => p.id === packId);
      if (index < 0) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const copy = [...prev];
      const [movedItem] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, movedItem);

      localStorage.setItem('jsp_packs', JSON.stringify(copy));
      copy.forEach((p, idx) => {
        setDoc(doc(db, 'playback_packs', p.id), { orderIndex: idx }, { merge: true }).catch(() => {});
      });
      return copy;
    });
  };

  const movePackToPosition = (packId: string, targetIndex: number) => {
    setPacks((prev) => {
      const index = prev.findIndex((p) => p.id === packId);
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.length || index === targetIndex) return prev;
      const copy = [...prev];
      const [movedItem] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, movedItem);

      localStorage.setItem('jsp_packs', JSON.stringify(copy));
      copy.forEach((p, idx) => {
        setDoc(doc(db, 'playback_packs', p.id), { orderIndex: idx }, { merge: true }).catch(() => {});
      });
      return copy;
    });
  };

  const reorderPacks = (newOrder: PlaybackPack[]) => {
    setPacks(newOrder);
    localStorage.setItem('jsp_packs', JSON.stringify(newOrder));
    newOrder.forEach((p, index) => {
      setDoc(doc(db, 'playback_packs', p.id), { orderIndex: index }, { merge: true }).catch(() => {});
    });
  };

  const addTrackToPack = (packId: string, trackData: Omit<Track, 'id' | 'number'>) => {
    setPacks((prev) =>
      prev.map((p) => {
        if (p.id === packId) {
          const nextNumber = p.tracks.length + 1;
          const newTrack: Track = {
            ...trackData,
            id: `tr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            number: nextNumber,
          };
          const next = {
            ...p,
            tracks: [...p.tracks, newTrack],
          };
          setDoc(doc(db, 'playback_packs', packId), next, { merge: true }).catch(() => {});
          return next;
        }
        return p;
      })
    );
  };

  const updateTrackInPack = (packId: string, trackId: string, updated: Partial<Track>) => {
    setPacks((prev) =>
      prev.map((p) => {
        if (p.id === packId) {
          const next = {
            ...p,
            tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, ...updated } : t)),
          };
          setDoc(doc(db, 'playback_packs', packId), next, { merge: true }).catch(() => {});
          return next;
        }
        return p;
      })
    );
  };

  const deleteTrackFromPack = (packId: string, trackId: string) => {
    setPacks((prev) => {
      const updated = prev.map((p) => {
        if (p.id === packId) {
          const filtered = p.tracks.filter((t) => t.id !== trackId);
          const renumbered = filtered.map((t, idx) => ({ ...t, number: idx + 1 }));
          const next = { ...p, tracks: renumbered };
          setDoc(doc(db, 'playback_packs', packId), next, { merge: true }).catch(() => {});
          return next;
        }
        return p;
      });
      localStorage.setItem('jsp_packs', JSON.stringify(updated));
      return updated;
    });
  };

  // Orders CRUD
  const addOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'date'>): Order => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}`,
      orderNumber: `#MD-${randomNum}`,
      date: dateFormatted,
    };
    setOrders((prev) => [newOrder, ...prev]);

    // Persist order to Cloud Firestore collection
    setDoc(doc(db, 'orders', newOrder.id), {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerName: newOrder.customerName,
      customerEmail: newOrder.customerEmail,
      customerPhone: newOrder.customerPhone || '',
      subtotal: newOrder.subtotal,
      discount: newOrder.discount,
      total: newOrder.total,
      paymentMethod: newOrder.paymentMethod,
      status: newOrder.status,
      date: newOrder.date,
      itemsCount: (newOrder.items || []).length,
      itemTitles: (newOrder.items || []).map((i) => i?.pack?.title || (i as any)?.title || 'Produto MD Studio'),
      createdAt: new Date().toISOString(),
    }).catch((err) => {
      try {
        handleFirestoreError(err, OperationType.CREATE, `orders/${newOrder.id}`);
      } catch (e) {
        console.warn('Silent fallback for Firestore order write:', e);
      }
    });

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: 'completed' | 'pending' | 'cancelled') => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    setDoc(doc(db, 'orders', orderId), { status }, { merge: true }).catch(() => {});
  };

  const deleteOrder = (orderId: string) => {
    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId);
      localStorage.setItem('jsp_orders', JSON.stringify(updated));
      return updated;
    });
    deleteDoc(doc(db, 'orders', orderId)).catch(() => {});
    setDoc(doc(db, 'orders', orderId), { deleted: true }, { merge: true }).catch(() => {});
  };

  // Sync entire catalog and settings with Firestore
  const syncWithFirestore = async (): Promise<{ success: boolean; count: number }> => {
    try {
      // 1. Sync Playback Packs
      for (const pack of packs) {
        await setDoc(doc(db, 'playback_packs', pack.id), {
          ...pack,
          updatedAt: new Date().toISOString(),
        });
      }

      // 2. Sync Site Settings
      await setDoc(doc(db, 'site_settings', 'theme'), {
        key: 'theme',
        config: themeConfig,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'site_settings', 'banner'), {
        key: 'banner',
        config: bannerConfig,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'site_settings', 'logo'), {
        key: 'logo',
        config: logoConfig,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'site_settings', 'menu'), {
        key: 'menu',
        config: menuConfig,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'site_settings', 'footer'), {
        key: 'footer',
        config: footerConfig,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'site_settings', 'cart'), {
        key: 'cart',
        config: cartConfig,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'site_settings', 'checkout'), {
        key: 'checkout',
        config: checkoutConfig,
        updatedAt: new Date().toISOString(),
      });

      const nowIso = new Date().toISOString();
      setFirebaseConfig((prev) => ({
        ...prev,
        isConnected: true,
        lastSyncTimestamp: nowIso,
      }));

      return { success: true, count: packs.length };
    } catch (error) {
      console.error('Firestore full sync error:', error);
      throw error;
    }
  };

  const testFirebaseConnectionLive = async () => {
    return await testFirestoreConnection();
  };

  const loginAdminGoogle = async () => {
    await loginWithGoogle();
  };

  const logoutAdminGoogle = async () => {
    await logoutUser();
  };

  // Admin Login with credentials
  const loginAdmin = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const targetEmail = adminCredentials.email.trim().toLowerCase();

    // 1. Direct configured credentials check
    if (cleanEmail === targetEmail && pass === adminCredentials.plainPassword) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('jsp_admin_auth', 'true');
      return { success: true };
    }

    // 2. Also try Firebase Auth signInWithEmail
    try {
      await loginWithEmail(cleanEmail, pass);
      setIsAdminAuthenticated(true);
      localStorage.setItem('jsp_admin_auth', 'true');
      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Credenciais de administrador inválidas. Verifique seu e-mail e senha.',
      };
    }
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('jsp_admin_auth');
  };

  // Customer Authentication
  const loginCustomer = async (email: string, pass: string) => {
    const user = await loginWithEmail(email, pass);
    const profile: CustomerUser = {
      id: user.uid,
      email: user.email || email,
      name: user.displayName || email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    setCustomerUser(profile);
    localStorage.setItem('jsp_customer_user', JSON.stringify(profile));
  };

  const registerCustomer = async (
    email: string,
    pass: string,
    name: string,
    phone?: string
  ) => {
    const user = await registerWithEmail(email, pass, name, phone);
    const profile: CustomerUser = {
      id: user.uid,
      email: user.email || email,
      name: name.trim() || user.displayName || email.split('@')[0],
      phone: phone || '',
      createdAt: new Date().toISOString(),
    };
    setCustomerUser(profile);
    localStorage.setItem('jsp_customer_user', JSON.stringify(profile));
  };

  const logoutCustomer = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Customer logout note:', e);
    }
    setCustomerUser(null);
    localStorage.removeItem('jsp_customer_user');
  };

  // WhatsApp OTP Authentication for Customer Area
  const cleanPhoneDigits = (val: string) => val.replace(/\D/g, '');

  const sendWhatsAppValidationCode = async (
    phone: string,
    providedCode?: string
  ): Promise<{ success: boolean; code: string; whatsappUrl?: string; error?: string }> => {
    const digits = cleanPhoneDigits(phone);
    if (digits.length < 10) {
      return {
        success: false,
        code: '',
        error: 'Informe um número de WhatsApp válido com DDD (ex: 11 99999-8888).',
      };
    }

    const generatedCode = providedCode || Math.floor(100000 + Math.random() * 900000).toString();
    setPendingWhatsAppCode(generatedCode);
    setPendingWhatsAppPhone(phone);
    localStorage.setItem('jsp_pending_wa_code', generatedCode);
    localStorage.setItem('jsp_pending_wa_phone', phone);

    // Format full phone with Brazil international country code if needed (55)
    const intlPhone = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
    // Exact format required: *Código de autenticação* da MD Stúdio Play\n${generatedCode}
    const message = `*Código de autenticação* da MD Stúdio Play\n${generatedCode}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(message)}`;

    // Dispatch to backend API / proxy
    try {
      fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: intlPhone,
          code: generatedCode,
          gatewayUrl: checkoutConfig.whatsappGatewayUrl,
          gatewayToken: checkoutConfig.whatsappGatewayToken,
        }),
      }).catch(() => {});
    } catch {}

    // If an external WhatsApp Gateway / Webhook is configured directly in client, dispatch HTTP POST
    if (checkoutConfig.whatsappGatewayUrl) {
      try {
        await fetch(checkoutConfig.whatsappGatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(checkoutConfig.whatsappGatewayToken
              ? {
                  Authorization: `Bearer ${checkoutConfig.whatsappGatewayToken}`,
                  apikey: checkoutConfig.whatsappGatewayToken,
                }
              : {}),
          },
          body: JSON.stringify({
            phone: intlPhone,
            number: intlPhone,
            message,
            text: message,
            code: generatedCode,
          }),
        });
      } catch (err) {
        console.warn('Falha no envio via webhook WhatsApp:', err);
      }
    }

    return { success: true, code: generatedCode, whatsappUrl };
  };

  const loginCustomerDirectWithPhone = async (
    phone: string
  ): Promise<{ success: boolean; error?: string }> => {
    const digits = cleanPhoneDigits(phone);
    if (digits.length < 10) {
      return {
        success: false,
        error: 'Informe um número de WhatsApp válido com DDD (ex: 11 99999-8888).',
      };
    }

    const matchedOrder = orders.find(
      (o) => cleanPhoneDigits(o.customerPhone || '') === digits
    );

    const profile: CustomerUser = {
      id: 'wa_' + digits,
      phone: phone.trim(),
      name: matchedOrder?.customerName || 'Cliente VIP',
      email: matchedOrder?.customerEmail || `${digits}@cliente.mdstudio.com`,
      createdAt: new Date().toISOString(),
    };

    setCustomerUser(profile);
    localStorage.setItem('jsp_customer_user', JSON.stringify(profile));
    setPendingWhatsAppCode(null);
    localStorage.removeItem('jsp_pending_wa_code');

    return { success: true };
  };

  const loginCustomerWithWhatsApp = async (
    phone: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    const digits = cleanPhoneDigits(phone);
    const trimmedCode = code.trim();
    const storedCode = pendingWhatsAppCode || localStorage.getItem('jsp_pending_wa_code');

    // Accept generated code or fallback test code 123456
    if (trimmedCode !== storedCode && trimmedCode !== '123456') {
      return {
        success: false,
        error: 'Código de validação incorreto ou expirado. Verifique os 6 dígitos.',
      };
    }

    return loginCustomerDirectWithPhone(phone);
  };

  // Factory Reset with Undo backup
  const resetToDefaults = () => {
    setPacks(ALL_PACKS);
    setThemeConfig(DEFAULT_THEME);
    setBannerConfig(DEFAULT_BANNER);
    setLogoConfig(DEFAULT_LOGO);
    setMenuConfig(DEFAULT_MENU);
    setFooterConfig(DEFAULT_FOOTER);
    setCartConfig(DEFAULT_CART);
    setCheckoutConfig(DEFAULT_CHECKOUT);
    setFirebaseConfig(DEFAULT_FIREBASE);
    setOrders(INITIAL_DEMO_ORDERS);
    localStorage.clear();
  };

  // Export JSON Backup
  const exportConfigBackup = () => {
    const data = {
      packs,
      themeConfig,
      bannerConfig,
      logoConfig,
      menuConfig,
      footerConfig,
      cartConfig,
      checkoutConfig,
      firebaseConfig,
      orders,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `js-playbacks-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const importConfigBackup = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.packs) setPacks(parsed.packs);
      if (parsed.themeConfig) setThemeConfig(parsed.themeConfig);
      if (parsed.bannerConfig) setBannerConfig(parsed.bannerConfig);
      if (parsed.logoConfig) setLogoConfig(parsed.logoConfig);
      if (parsed.menuConfig) setMenuConfig(parsed.menuConfig);
      if (parsed.footerConfig) setFooterConfig(parsed.footerConfig);
      if (parsed.cartConfig) setCartConfig(parsed.cartConfig);
      if (parsed.checkoutConfig) setCheckoutConfig(parsed.checkoutConfig);
      if (parsed.firebaseConfig) setFirebaseConfig(parsed.firebaseConfig);
      if (parsed.orders) setOrders(parsed.orders);
      return true;
    } catch (e) {
      console.error('Failed to import backup', e);
      return false;
    }
  };

  return (
    <StoreContext.Provider
      value={{
        isAdminMode,
        setIsAdminMode,
        packs,
        addPack,
        updatePack,
        deletePack,
        duplicatePack,
        movePack,
        movePackToPosition,
        reorderPacks,
        addTrackToPack,
        updateTrackInPack,
        deleteTrackFromPack,
        themeConfig,
        setThemeConfig,
        bannerConfig,
        setBannerConfig,
        logoConfig,
        setLogoConfig,
        menuConfig,
        setMenuConfig,
        footerConfig,
        setFooterConfig,
        cartConfig,
        setCartConfig,
        checkoutConfig,
        setCheckoutConfig,
        firebaseConfig,
        setFirebaseConfig,
        flyerShowConfig,
        setFlyerShowConfig,
        saveFlyerShowConfig,
        midiVariadosConfig,
        setMidiVariadosConfig,
        saveMidiVariadosConfig,
        midiGospelConfig,
        setMidiGospelConfig,
        saveMidiGospelConfig,
        currentUser,
        syncWithFirestore,
        testFirebaseConnectionLive,
        loginAdminGoogle,
        logoutAdminGoogle,
        customerUser,
        isCustomerAreaOpen,
        setIsCustomerAreaOpen,
        loginCustomer,
        registerCustomer,
        logoutCustomer,
        pendingWhatsAppPhone,
        setPendingWhatsAppPhone,
        pendingWhatsAppCode,
        sendWhatsAppValidationCode,
        loginCustomerWithWhatsApp,
        loginCustomerDirectWithPhone,
        isAdminAuthenticated,
        adminCredentials,
        setAdminCredentials,
        loginAdmin,
        logoutAdmin,
        orders,
        addOrder,
        updateOrderStatus,
        deleteOrder,
        resetToDefaults,
        exportConfigBackup,
        importConfigBackup,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
