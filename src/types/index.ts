export interface Track {
  id: string;
  number: number;
  title: string;
  artist: string;
  duration: string;
  bpm?: number;
  key?: string;
}

export interface PlaybackPack {
  id: string;
  title: string;
  subtitle?: string;
  artist?: string;
  genre: string;
  genres?: string[]; // Suporte a múltiplos gêneros selecionados
  orderIndex?: number; // Posição/ordem de exibição no catálogo
  originalPrice: number;
  discountPrice: number;
  image: string;
  releaseYear: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  tracks: Track[];
  sampleRhythm?: 'piseiro' | 'forro' | 'arrocha' | 'sertanejo' | 'pagode';
  audioUrl?: string; // Link do áudio para o Play
  postSaleUrl?: string; // Link Pós-venda do produto (Download, Drive, Mega, etc.)
  updatedAt?: string;
}

export interface CartItem {
  pack: PlaybackPack;
  quantity: number;
}

export interface FlyerItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
}

export interface FlyerShowConfig {
  headerTitle: string;
  headerSubtitle: string;
  badgeText: string;
  title: string;
  description: string;
  coverImage: string;
  originalPrice: number;
  discountPrice: number;
  discountTag: string;
  features: string[];
  gallery: FlyerItem[];
  demoDownloadUrl: string;
  demoButtonText: string;
  postSaleUrl: string;
}

export interface MidiPageConfig {
  topBadge: string;
  title: string;
  description: string;
  subHighlight1?: string;
  subHighlight2?: string;
  circleImage: string;
  circleBadgeText: string;
  bottomPillText: string;
  priceLabel: string;
  price: number;
  priceSubtext: string;
  showPrice?: boolean;
  buttonText: string;
  audioPreviewTitle: string;
  audioPreviewSubtitle: string;
  audioPreviewUrl: string;
  postSaleUrl: string;
  highlights: string[];
  tracklistUrl?: string;
  tracklistButtonText?: string;
}


