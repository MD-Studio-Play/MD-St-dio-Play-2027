import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { PlaybackPack, Track } from '../../types';
import { PackThumbnail } from '../PackThumbnail';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ListMusic,
  Disc,
  Play,
  Pause,
  Image,
  Sparkles,
  X,
  Check,
  Music2,
  Clock,
  KeyRound,
  Activity,
  Layers,
  Volume2,
  ExternalLink,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  MoveVertical,
  Copy,
  FileText,
  Wand2,
  ListOrdered,
} from 'lucide-react';
import { audioPlayer } from '../../utils/audioSynth';

export const AVAILABLE_GENRES = [
  'Arrocha',
  'Axé Bahia',
  'Forró',
  'Vaquejada',
  'Piseiro',
  'Modão',
  'Reggae',
  'Sertanejo',
  'MPB',
  'Pop Rock',
  'Pagode',
  'Brega',
] as const;

const DEFAULT_PACK_IMAGE =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

export const MusicTab: React.FC = () => {
  const {
    packs,
    addPack,
    updatePack,
    deletePack,
    duplicatePack,
    movePack,
    movePackToPosition,
    addTrackToPack,
    updateTrackInPack,
    deleteTrackFromPack,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');

  // Pack Edit/Create Modal
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [isTestingModalAudio, setIsTestingModalAudio] = useState(false);
  const [packFormData, setPackFormData] = useState<Partial<PlaybackPack>>({
    title: '',
    artist: '',
    genre: 'Piseiro',
    originalPrice: 49.9,
    discountPrice: 29.9,
    releaseYear: 2026,
    sampleRhythm: 'piseiro',
    audioUrl: '',
    postSaleUrl: '',
    image: DEFAULT_PACK_IMAGE,
    tracks: [],
  });

  // Tracklist "Ver Lista" Modal
  const [selectedPackForTracks, setSelectedPackForTracks] = useState<PlaybackPack | null>(null);
  const [newTrackData, setNewTrackData] = useState({
    title: '',
    artist: '',
    duration: '03:15',
    key: 'Am',
    bpm: 138,
  });
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackData, setEditTrackData] = useState({
    title: '',
    artist: '',
    duration: '',
    key: '',
    bpm: 130,
  });

  // Tracklist modal tabs & generator states
  const [tracklistActiveTab, setTracklistActiveTab] = useState<'image_style' | 'generator' | 'import_text'>('image_style');
  const [bulkEditTracks, setBulkEditTracks] = useState<Track[]>([]);
  const [bulkArtistInput, setBulkArtistInput] = useState('Demo Track');
  const [bulkPrefixInput, setBulkPrefixInput] = useState('Faixa');
  const [genPrefix, setGenPrefix] = useState('Faixa');
  const [genArtist, setGenArtist] = useState('Demo Track');
  const [genCount, setGenCount] = useState(16);
  const [rawTextImport, setRawTextImport] = useState('');

  // Audio preview state
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Mouse selection & Drag-and-Drop state for reordering
  const [selectedPackIdForMove, setSelectedPackIdForMove] = useState<string | null>(null);
  const [draggedPackId, setDraggedPackId] = useState<string | null>(null);
  const [dragOverPackId, setDragOverPackId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleDragStart = (e: React.DragEvent, packId: string) => {
    e.dataTransfer.setData('text/plain', packId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPackId(packId);
    setSelectedPackIdForMove(packId);
  };

  const handleDragOver = (e: React.DragEvent, targetPackId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPackId !== targetPackId) {
      setDragOverPackId(targetPackId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetPackId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedPackId;
    if (sourceId && sourceId !== targetPackId) {
      const targetIndex = packs.findIndex((p) => p.id === targetPackId);
      if (targetIndex >= 0) {
        movePackToPosition(sourceId, targetIndex);
        const movedPack = packs.find((p) => p.id === sourceId);
        showToast(`"${movedPack?.title || 'Produto'}" movido para a posição #${targetIndex + 1}!`);
      }
    }
    setDraggedPackId(null);
    setDragOverPackId(null);
  };

  const handleDragEnd = () => {
    setDraggedPackId(null);
    setDragOverPackId(null);
  };

  const genres = [
    'Todos',
    'Arrocha',
    'Axé Bahia',
    'Forró',
    'Vaquejada',
    'Piseiro',
    'Modão',
    'Reggae',
    'Sertanejo',
    'MPB',
    'Pop Rock',
    'Pagode',
    'Brega',
  ];

  // Filtered packs
  const filteredPacks = packs.filter((p) => {
    const q = searchQuery.toLowerCase();
    const allPGenres = p.genres && p.genres.length > 0 ? p.genres : [p.genre];
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.artist?.toLowerCase().includes(q) ||
      p.genre.toLowerCase().includes(q) ||
      allPGenres.some((g) => g.toLowerCase().includes(q));
    const matchesGenre =
      selectedGenre === 'Todos' ||
      p.genre.toLowerCase().includes(selectedGenre.toLowerCase()) ||
      allPGenres.some((g) => g.toLowerCase().includes(selectedGenre.toLowerCase()));
    return matchesSearch && matchesGenre;
  });

  const toggleGenre = (genreToToggle: string) => {
    const currentList =
      packFormData.genres && packFormData.genres.length > 0
        ? [...packFormData.genres]
        : [packFormData.genre || 'Piseiro'];

    let updatedList: string[];
    if (currentList.includes(genreToToggle)) {
      if (currentList.length === 1) {
        // Keep at least one genre
        return;
      }
      updatedList = currentList.filter((g) => g !== genreToToggle);
    } else {
      updatedList = [...currentList, genreToToggle];
    }

    const primary = updatedList.includes(packFormData.genre || '')
      ? packFormData.genre
      : updatedList[0];

    setPackFormData({
      ...packFormData,
      genre: primary,
      genres: updatedList,
    });
  };

  const handleOpenCreateModal = () => {
    setEditingPackId(null);
    setIsTestingModalAudio(false);
    setPackFormData({
      title: '',
      artist: '',
      genre: 'Piseiro',
      genres: ['Piseiro'],
      originalPrice: 49.9,
      discountPrice: 29.9,
      releaseYear: 2026,
      sampleRhythm: 'piseiro',
      audioUrl: '',
      postSaleUrl: '',
      image: DEFAULT_PACK_IMAGE,
      tracks: [
        {
          id: `tr_init_1`,
          number: 1,
          title: 'Faixa Principal 01',
          artist: 'Artista Principal',
          duration: '03:15',
          bpm: 138,
          key: 'Am',
        },
      ],
    });
    setIsPackModalOpen(true);
  };

  const handleOpenEditModal = (pack: PlaybackPack) => {
    setEditingPackId(pack.id);
    setIsTestingModalAudio(false);
    setPackFormData({
      ...pack,
      genre: pack.genre || 'Piseiro',
      genres: pack.genres && pack.genres.length > 0 ? pack.genres : [pack.genre || 'Piseiro'],
      audioUrl: pack.audioUrl || '',
      postSaleUrl: pack.postSaleUrl || '',
    });
    setIsPackModalOpen(true);
  };

  const handleSavePack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packFormData.title || !packFormData.artist) {
      showToast('Por favor preencha o Título e o Artista do pacote.');
      return;
    }

    if (isTestingModalAudio) {
      audioPlayer.stop();
      setIsTestingModalAudio(false);
    }

    const cleanAudioUrl = packFormData.audioUrl?.trim() || '';
    const cleanPostSaleUrl = packFormData.postSaleUrl?.trim() || '';
    const selectedGenres =
      packFormData.genres && packFormData.genres.length > 0
        ? packFormData.genres
        : [packFormData.genre || 'Piseiro'];
    const primaryGenre = packFormData.genre || selectedGenres[0] || 'Piseiro';

    if (editingPackId) {
      updatePack(editingPackId, {
        ...packFormData,
        genre: primaryGenre,
        genres: selectedGenres,
        audioUrl: cleanAudioUrl,
        postSaleUrl: cleanPostSaleUrl,
      });
      showToast('Pacote atualizado com sucesso!');
    } else {
      addPack({
        title: packFormData.title || 'Novo Pacote',
        artist: packFormData.artist || 'Artista',
        genre: primaryGenre,
        genres: selectedGenres,
        originalPrice: Number(packFormData.originalPrice) || 49.9,
        discountPrice: Number(packFormData.discountPrice) || 29.9,
        releaseYear: Number(packFormData.releaseYear) || 2026,
        sampleRhythm: packFormData.sampleRhythm || 'piseiro',
        audioUrl: cleanAudioUrl,
        postSaleUrl: cleanPostSaleUrl,
        image: packFormData.image || DEFAULT_PACK_IMAGE,
        tracks: packFormData.tracks || [],
      });
      showToast('Novo pacote cadastrado com sucesso!');
    }

    setIsPackModalOpen(false);
  };

  const handleDeletePack = (id: string, title?: string) => {
    deletePack(id);
    if (selectedPackForTracks?.id === id) {
      setSelectedPackForTracks(null);
    }
    showToast(`Pacote "${title || 'selecionado'}" excluído com sucesso!`);
  };

  const handleDuplicatePack = (pack: PlaybackPack) => {
    const duplicated = duplicatePack(pack.id);
    if (duplicated) {
      setSelectedPackIdForMove(duplicated.id);
      showToast(`Produto "${pack.title}" duplicado com sucesso!`);
    } else {
      showToast('Erro ao duplicar produto.');
    }
  };

  // Track management inside selected pack
  const currentPackTracks = selectedPackForTracks
    ? packs.find((p) => p.id === selectedPackForTracks.id)?.tracks || []
    : [];

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackForTracks || !newTrackData.title) return;

    const addedTitle = newTrackData.title.trim();
    const addedArtist = newTrackData.artist?.trim() || selectedPackForTracks.artist || 'Demo Track';

    addTrackToPack(selectedPackForTracks.id, {
      title: addedTitle,
      artist: addedArtist,
      duration: newTrackData.duration || '03:20',
      bpm: Number(newTrackData.bpm) || 135,
      key: newTrackData.key || 'G',
    });

    setBulkEditTracks((prev) => [
      ...prev,
      {
        id: `tr_${Date.now()}`,
        number: prev.length + 1,
        title: addedTitle,
        artist: addedArtist,
        duration: newTrackData.duration || '03:20',
        bpm: Number(newTrackData.bpm) || 135,
        key: newTrackData.key || 'G',
      },
    ]);

    setNewTrackData({
      title: '',
      artist: selectedPackForTracks.artist || '',
      duration: '03:15',
      key: 'Am',
      bpm: 138,
    });
  };

  const handleSaveEditTrack = (packId: string, trackId: string) => {
    updateTrackInPack(packId, trackId, {
      title: editTrackData.title,
      artist: editTrackData.artist,
      duration: editTrackData.duration,
      bpm: Number(editTrackData.bpm),
      key: editTrackData.key,
    });
    setEditingTrackId(null);
  };

  const handleBulkTrackChange = (index: number, field: 'title' | 'artist', value: string) => {
    setBulkEditTracks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleApplyArtistToAll = () => {
    const artist = bulkArtistInput.trim() || 'Demo Track';
    setBulkEditTracks((prev) =>
      prev.map((t) => ({ ...t, artist }))
    );
    showToast(`"${artist}" aplicado a todas as faixas! Clique em "Salvar Todas as Músicas".`);
  };

  const handleApplyPrefixToAll = () => {
    const prefix = bulkPrefixInput.trim() || 'Faixa';
    setBulkEditTracks((prev) =>
      prev.map((t, i) => ({ ...t, number: i + 1, title: `${prefix} ${i + 1}` }))
    );
    showToast(`Faixas renumeradas como "${prefix} 1" a "${prefix} ${bulkEditTracks.length}"!`);
  };

  const handleGenerateStandard16 = (artist?: string) => {
    const finalArtist = artist?.trim() || bulkArtistInput.trim() || selectedPackForTracks?.artist || 'Demo Track';
    const prefix = bulkPrefixInput.trim() || 'Faixa';
    const generated: Track[] = Array.from({ length: 16 }, (_, i) => ({
      id: `tr_gen_${Date.now()}_${i + 1}`,
      number: i + 1,
      title: `${prefix} ${i + 1}`,
      artist: finalArtist,
      duration: '03:15',
      bpm: 138,
      key: 'Am',
    }));
    setBulkEditTracks(generated);
    if (selectedPackForTracks) {
      updatePack(selectedPackForTracks.id, { tracks: generated });
      setSelectedPackForTracks({ ...selectedPackForTracks, tracks: generated });
    }
    showToast('16 faixas padrão geradas e salvas com sucesso!');
  };

  const handleAddBulkRow = () => {
    setBulkEditTracks((prev) => [
      ...prev,
      {
        id: `tr_${Date.now()}_${prev.length + 1}`,
        number: prev.length + 1,
        title: `${bulkPrefixInput.trim() || 'Faixa'} ${prev.length + 1}`,
        artist: bulkArtistInput.trim() || selectedPackForTracks?.artist || 'Demo Track',
        duration: '03:15',
        bpm: 138,
        key: 'Am',
      },
    ]);
  };

  const handleRemoveBulkRow = (index: number) => {
    setBulkEditTracks((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((t, i) => ({ ...t, number: i + 1 }));
    });
  };

  const handleSaveAllBulkTracks = () => {
    if (!selectedPackForTracks) return;
    const defaultArtist = bulkArtistInput.trim() || selectedPackForTracks.artist || 'Demo Track';
    const cleaned: Track[] = bulkEditTracks.map((t, i) => ({
      ...t,
      number: i + 1,
      title: t.title?.trim() || `Faixa ${i + 1}`,
      artist: t.artist?.trim() || defaultArtist,
      duration: t.duration || '03:15',
      bpm: t.bpm || 138,
      key: t.key || 'Am',
    }));

    updatePack(selectedPackForTracks.id, { tracks: cleaned });
    setSelectedPackForTracks({ ...selectedPackForTracks, tracks: cleaned });
    showToast(`✅ Salvo! Todas as ${cleaned.length} músicas foram salvas de uma vez só!`);
  };

  const handleGenerateList = (count: number = genCount, prefix: string = genPrefix, artist: string = genArtist) => {
    if (!selectedPackForTracks) return;
    const finalArtist = artist?.trim() || selectedPackForTracks.artist || 'Demo Track';
    const finalPrefix = prefix?.trim() || 'Faixa';

    const generatedTracks: Track[] = Array.from({ length: count }, (_, i) => ({
      id: `tr_gen_${Date.now()}_${i + 1}`,
      number: i + 1,
      title: `${finalPrefix} ${i + 1}`,
      artist: finalArtist,
      duration: '03:15',
      bpm: 138,
      key: 'Am',
    }));

    setBulkEditTracks(generatedTracks);
    updatePack(selectedPackForTracks.id, { tracks: generatedTracks });
    setSelectedPackForTracks({ ...selectedPackForTracks, tracks: generatedTracks });
    showToast(`Geradas ${count} faixas no formato da imagem com sucesso!`);
    setTracklistActiveTab('image_style');
  };

  const handleApplyTextImport = () => {
    if (!selectedPackForTracks || !rawTextImport.trim()) {
      showToast('Por favor, cole ou digite as faixas na caixa de texto.');
      return;
    }

    const lines = rawTextImport
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      showToast('Nenhuma linha preenchida.');
      return;
    }

    const parsedTracks: Track[] = lines.map((line, index) => {
      // Remove leading number like "1. ", "1 - ", "01. ", "(1) "
      const withoutNumber = line.replace(/^\s*\(?\d+\)?[\.\:\-\–\—\s]\s*/, '').trim();

      // Split by em-dash (—), en-dash (–), hyphen (-), pipe (|), or slash (/)
      const separatorMatch = withoutNumber.split(/\s+[—–\-|/]\s+/);
      let title = withoutNumber;
      let artist = bulkArtistInput.trim() || selectedPackForTracks.artist || 'Demo Track';

      if (separatorMatch.length >= 2) {
        title = separatorMatch[0].trim();
        artist = separatorMatch.slice(1).join(' — ').trim();
      }

      return {
        id: `tr_import_${Date.now()}_${index + 1}`,
        number: index + 1,
        title: title || `Faixa ${index + 1}`,
        artist: artist || 'Demo Track',
        duration: '03:15',
        bpm: 138,
        key: 'Am',
      };
    });

    setBulkEditTracks(parsedTracks);
    updatePack(selectedPackForTracks.id, { tracks: parsedTracks });
    setSelectedPackForTracks({ ...selectedPackForTracks, tracks: parsedTracks });
    showToast(`✅ ${parsedTracks.length} faixas importadas e salvas com sucesso!`);
    setTracklistActiveTab('image_style');
  };

  const handleCopyFormattedList = () => {
    const listToCopy = bulkEditTracks.length > 0 ? bulkEditTracks : currentPackTracks;
    if (!listToCopy.length) {
      showToast('A lista de faixas está vazia.');
      return;
    }
    const formatted = listToCopy
      .map((t) => `${t.number}. ${t.title} — ${t.artist || 'Demo Track'}`)
      .join('\n');
    navigator.clipboard.writeText(formatted);
    showToast('Lista copiada no formato da imagem!');
  };

  const handleOpenTracksModal = (pack: PlaybackPack) => {
    setSelectedPackForTracks(pack);
    const defaultArtist = pack.artist || 'Demo Track';
    setBulkArtistInput(defaultArtist);
    setBulkPrefixInput('Faixa');
    setGenArtist(defaultArtist);
    setGenPrefix('Faixa');

    const existing = pack.tracks && pack.tracks.length > 0 ? pack.tracks : [];
    const count = existing.length > 0 ? existing.length : 16;
    setGenCount(count);

    const initialList: Track[] = existing.length > 0
      ? existing.map((t, i) => ({
          ...t,
          number: t.number || i + 1,
          title: t.title || `Faixa ${i + 1}`,
          artist: t.artist || defaultArtist,
          duration: t.duration || '03:15',
          key: t.key || 'Am',
          bpm: t.bpm || 138,
        }))
      : Array.from({ length: 16 }, (_, i) => ({
          id: `tr_${Date.now()}_${i + 1}`,
          number: i + 1,
          title: `Faixa ${i + 1}`,
          artist: defaultArtist,
          duration: '03:15',
          bpm: 138,
          key: 'Am',
        }));

    setBulkEditTracks(initialList);
    const formatted = initialList
      .map((t) => `${t.number}. ${t.title} — ${t.artist}`)
      .join('\n');
    setRawTextImport(formatted);
    setTracklistActiveTab('image_style');
  };

  const handlePlayPreview = (pack: PlaybackPack) => {
    if (previewPlayingId === pack.id) {
      audioPlayer.stop();
      setPreviewPlayingId(null);
    } else {
      audioPlayer.play(pack.id, pack.sampleRhythm || 'piseiro', pack.audioUrl);
      setPreviewPlayingId(pack.id);
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Feedback Notice */}
      {toastNotice && (
        <div className="fixed top-6 right-6 z-50 bg-[#16181d] border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold">{toastNotice}</span>
        </div>
      )}

      {/* Header action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-[#55c21b]" />
            <span>Gerenciador de Músicas & Playbacks</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Cadastre novos pacotes, edite fotos de artistas, gerencie a lista de faixas inclusas ("Ver Lista") e preços.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#55c21b] hover:bg-[#62dc20] text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-lime-500/20"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Cadastrar Novo Pacote</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111216] border border-white/[0.08] rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por pacote, música ou artista..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-white/30"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                selectedGenre === g
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Packs Table */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-300">
              Total de {filteredPacks.length} pacotes encontrados
            </span>
            <span className="text-[10px] text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
              <MoveVertical className="w-3 h-3 text-[#55c21b]" />
              <span>Arraste com o mouse ou use ↑ e ↓ para reordenar</span>
            </span>
          </div>

          {selectedPackIdForMove && (
            <div className="flex items-center gap-2 bg-black/60 border border-emerald-500/50 rounded-xl px-3 py-1.5 shadow-inner">
              {(() => {
                const sPack = packs.find((p) => p.id === selectedPackIdForMove);
                const sIdx = sPack ? packs.findIndex((p) => p.id === sPack.id) : -1;
                if (!sPack || sIdx < 0) return null;
                const isFirst = sIdx === 0;
                const isLast = sIdx === packs.length - 1;

                return (
                  <>
                    <span className="text-[11px] font-bold text-emerald-400 truncate max-w-[140px] sm:max-w-[200px]">
                      #{sIdx + 1} {sPack.title}
                    </span>

                    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => {
                          movePack(sPack.id, 'up');
                          showToast(`Subiu "${sPack.title}" para a posição #${sIdx}!`);
                        }}
                        title="Subir com o mouse (↑)"
                        className="w-7 h-7 rounded-lg bg-[#1c1d22] hover:bg-[#2c2f3b] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-sm"
                      >
                        <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => {
                          movePack(sPack.id, 'down');
                          showToast(`Desceu "${sPack.title}" para a posição #${sIdx + 2}!`);
                        }}
                        title="Descer com o mouse (↓)"
                        className="w-7 h-7 rounded-lg bg-[#1c1d22] hover:bg-[#2c2f3b] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-sm"
                      >
                        <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => {
                          movePackToPosition(sPack.id, 0);
                          showToast(`"${sPack.title}" movido para o topo da loja (#1)!`);
                        }}
                        title="Mover para o Topo (#1)"
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Topo
                      </button>

                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => {
                          movePackToPosition(sPack.id, packs.length - 1);
                          showToast(`"${sPack.title}" movido para o final da loja (#${packs.length})!`);
                        }}
                        title="Mover para o Final"
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Fim
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPackIdForMove(null)}
                        title="Limpar seleção"
                        className="p-1 rounded text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-neutral-300">
            <thead className="bg-black/40 text-neutral-400 text-[11px] uppercase border-b border-white/5">
              <tr>
                <th className="py-3 px-3 text-center w-36">Locomover / Posição</th>
                <th className="py-3 px-4">Capa / Artista</th>
                <th className="py-3 px-4">Título do Pacote</th>
                <th className="py-3 px-4">Gêneros / Ano</th>
                <th className="py-3 px-4">Faixas (Ver Lista)</th>
                <th className="py-3 px-4">Preço De / Por</th>
                <th className="py-3 px-4 text-center">Prévia</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPacks.map((pack) => {
                const realIndex = packs.findIndex((p) => p.id === pack.id);
                const isFirst = realIndex === 0;
                const isLast = realIndex === packs.length - 1;
                const isSelected = selectedPackIdForMove === pack.id;
                const isDragged = draggedPackId === pack.id;
                const isDragOver = dragOverPackId === pack.id && !isDragged;

                return (
                  <tr
                    key={pack.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, pack.id)}
                    onDragOver={(e) => handleDragOver(e, pack.id)}
                    onDrop={(e) => handleDrop(e, pack.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedPackIdForMove(pack.id)}
                    className={`transition-all cursor-pointer ${
                      isDragged ? 'opacity-30 bg-neutral-900' : ''
                    } ${
                      isDragOver
                        ? 'border-t-2 border-[#55c21b] bg-emerald-950/40 shadow-lg'
                        : isSelected
                        ? 'bg-emerald-950/20 border-l-4 border-l-[#55c21b] ring-1 ring-emerald-500/20'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Position & Move Up/Down Controls with Mouse */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Drag Handle with Mouse */}
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, pack.id)}
                          onDragEnd={handleDragEnd}
                          title="Clique e arraste com o mouse para cima ou para baixo para reordenar"
                          className="p-1 rounded text-neutral-500 hover:text-emerald-400 hover:bg-white/5 cursor-grab active:cursor-grabbing transition-colors"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Button Up - exact style of user's image */}
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => {
                            movePack(pack.id, 'up');
                            showToast(`Subiu "${pack.title}" para a posição #${realIndex}!`);
                          }}
                          title={isFirst ? 'Primeiro produto' : 'Mover para CIMA (↑)'}
                          className="w-8 h-8 rounded-xl bg-[#1c1d22] hover:bg-[#2c2f3b] active:bg-[#383c4a] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-sm"
                        >
                          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        {/* Button Down - exact style of user's image */}
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => {
                            movePack(pack.id, 'down');
                            showToast(`Desceu "${pack.title}" para a posição #${realIndex + 2}!`);
                          }}
                          title={isLast ? 'Último produto' : 'Mover para BAIXO (↓)'}
                          className="w-8 h-8 rounded-xl bg-[#1c1d22] hover:bg-[#2c2f3b] active:bg-[#383c4a] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-sm"
                        >
                          <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        {/* Position Badge */}
                        <span
                          className={`font-mono text-[11px] font-extrabold px-1.5 py-1 rounded-md border min-w-[32px] text-center transition-all ${
                            isSelected
                              ? 'bg-[#55c21b] text-black border-[#55c21b] font-black shadow-sm'
                              : 'text-amber-300 bg-amber-950/40 border-amber-500/30'
                          }`}
                          title={`Posição #${realIndex + 1} de ${packs.length} produtos na loja`}
                        >
                          #{realIndex + 1}
                        </span>
                      </div>
                    </td>

                    {/* Thumbnail / Artist */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <PackThumbnail pack={pack} size="sm" />
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">
                            {pack.artist || 'Artista'}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            ID: {pack.id.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-[220px]">
                      <div className="font-semibold text-white truncate">{pack.title}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {pack.audioUrl ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            <Volume2 className="w-2.5 h-2.5" />
                            <span>Áudio próprio</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">Áudio synth</span>
                        )}
                        {pack.postSaleUrl && (
                          <a
                            href={pack.postSaleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 hover:underline"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Pós-venda</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Genre */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] font-semibold text-neutral-200">
                          {pack.genre} · {pack.releaseYear}
                        </span>
                        {pack.genres && pack.genres.length > 1 && (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {pack.genres
                              .filter((g) => g !== pack.genre)
                              .map((g) => (
                                <span
                                  key={g}
                                  className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 whitespace-nowrap"
                                >
                                  +{g}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Track count & Ver Lista Button */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleOpenTracksModal(pack)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/60 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <ListMusic className="w-3.5 h-3.5" />
                        <span>{Array.isArray(pack?.tracks) ? pack.tracks.length : 0} músicas (Ver lista)</span>
                      </button>
                    </td>

                    {/* Prices */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-red-400 line-through text-[11px]">
                          {formatBRL(pack.originalPrice)}
                        </span>
                        <span className="text-[#55c21b] font-bold">
                          {formatBRL(pack.discountPrice)}
                        </span>
                      </div>
                    </td>

                    {/* Preview Button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handlePlayPreview(pack)}
                        className={`p-2 rounded-full border transition-all cursor-pointer ${
                          previewPlayingId === pack.id
                            ? 'border-[#55c21b] bg-[#55c21b]/20 text-[#55c21b] animate-pulse'
                            : 'border-white/20 text-neutral-400 hover:text-white hover:border-white'
                        }`}
                      >
                        {previewPlayingId === pack.id ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => {
                            movePackToPosition(pack.id, 0);
                            showToast(`"${pack.title}" movido para o topo da loja (#1)!`);
                          }}
                          title="Mover para o Topo (#1)"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400 transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePack(pack);
                          }}
                          title="Duplicar cadastro deste produto"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(pack)}
                          title="Editar pacote"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePack(pack.id, pack.title)}
                          title="Excluir pacote"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tracklist ("Ver Lista") Editor */}
      {selectedPackForTracks && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111216] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PackThumbnail pack={selectedPackForTracks} size="sm" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Lista de Músicas: {selectedPackForTracks.title}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {selectedPackForTracks.artist} · {currentPackTracks.length} faixas inclusas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPackForTracks(null)}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1.5 px-4 sm:px-5 pt-3 pb-2 border-b border-white/10 bg-black/40">
              <button
                type="button"
                onClick={() => setTracklistActiveTab('image_style')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  tracklistActiveTab === 'image_style'
                    ? 'bg-[#55c21b] text-black shadow-md'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Preencher Todas de Uma Vez</span>
              </button>

              <button
                type="button"
                onClick={() => setTracklistActiveTab('generator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  tracklistActiveTab === 'generator'
                    ? 'bg-[#55c21b] text-black shadow-md'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>⚡ Gerar Lista (1 a 16)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const listToFormat = bulkEditTracks.length > 0 ? bulkEditTracks : currentPackTracks;
                  const formatted = listToFormat
                    .map((t) => `${t.number}. ${t.title} — ${t.artist || 'Demo Track'}`)
                    .join('\n');
                  if (formatted) setRawTextImport(formatted);
                  setTracklistActiveTab('import_text');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  tracklistActiveTab === 'import_text'
                    ? 'bg-[#55c21b] text-black shadow-md'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Colar / Importar Texto</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* TAB 1: PREENCHIMENTO DE TODAS AS MÚSICAS DE UMA VEZ */}
              {tracklistActiveTab === 'image_style' && (
                <div className="space-y-3">
                  {/* Mass Fill Bar */}
                  <div className="bg-black/50 border border-white/10 p-3 rounded-xl space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                          {bulkEditTracks.length} faixas
                        </span>
                        <span className="text-[11px] text-neutral-300 font-semibold">
                          Preenchimento de Todas as Músicas (Salvar de Uma Só Vez)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyFormattedList}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                        >
                          <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Copiar Lista</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveAllBulkTracks}
                          className="px-3 py-1 rounded-lg bg-[#55c21b] hover:bg-[#62dc20] text-black font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar Todas</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Fill Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={bulkArtistInput}
                          onChange={(e) => setBulkArtistInput(e.target.value)}
                          placeholder="Artista para todas (ex: Demo Track)"
                          className="flex-1 bg-[#14161b] border border-white/15 focus:border-[#55c21b] rounded-lg px-2.5 py-1 text-xs text-sky-400 font-medium outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplyArtistToAll}
                          className="px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
                        >
                          ⚡ Aplicar Artista em Todas
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={bulkPrefixInput}
                          onChange={(e) => setBulkPrefixInput(e.target.value)}
                          placeholder="Prefixo (ex: Faixa)"
                          className="w-24 bg-[#14161b] border border-white/15 focus:border-[#55c21b] rounded-lg px-2.5 py-1 text-xs text-white font-medium outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplyPrefixToAll}
                          className="flex-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-semibold text-[11px] shrink-0 transition-colors cursor-pointer"
                        >
                          ⚡ Renumerar (Faixa 1 a N)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateStandard16()}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
                        >
                          ⚡ Gerar 16
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List Container: all rows editable directly in image style */}
                  <div className="bg-[#050608] border border-white/10 rounded-xl p-3 sm:p-4 font-mono select-text shadow-inner">
                    {bulkEditTracks.length === 0 ? (
                      <div className="py-8 text-center text-xs text-neutral-500 font-sans space-y-3">
                        <p>Nenhuma faixa na lista.</p>
                        <button
                          type="button"
                          onClick={() => handleGenerateStandard16()}
                          className="px-3.5 py-2 rounded-lg bg-[#55c21b] text-black font-extrabold text-xs font-sans inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Wand2 className="w-4 h-4" />
                          <span>Preencher 16 Faixas Padrão (Demo Track)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="border-l-2 border-red-800/90 pl-2.5 sm:pl-3.5 py-1 space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                        {bulkEditTracks.map((track, index) => (
                          <div
                            key={track.id || index}
                            className="flex items-center gap-1.5 sm:gap-2 text-xs py-0.5 hover:bg-white/[0.03] px-1 -mx-1 rounded transition-colors group"
                          >
                            <span className="font-mono text-neutral-400 text-xs w-6 sm:w-7 shrink-0 text-right font-bold select-none">
                              {index + 1}.
                            </span>
                            <input
                              type="text"
                              value={track.title}
                              onChange={(e) => handleBulkTrackChange(index, 'title', e.target.value)}
                              placeholder={`Faixa ${index + 1}`}
                              className="flex-1 min-w-0 bg-[#121317] border border-white/15 focus:border-[#55c21b] text-neutral-100 rounded-lg px-2.5 py-1 text-xs font-mono outline-none transition-colors"
                            />
                            <span className="text-neutral-500 shrink-0 font-mono select-none">—</span>
                            <input
                              type="text"
                              value={track.artist}
                              onChange={(e) => handleBulkTrackChange(index, 'artist', e.target.value)}
                              placeholder="Demo Track"
                              className="flex-1 min-w-0 bg-[#121317] border border-white/15 focus:border-[#55c21b] text-sky-400 font-medium rounded-lg px-2.5 py-1 text-xs font-mono outline-none transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveBulkRow(index)}
                              title="Remover esta faixa"
                              className="p-1 text-neutral-500 hover:text-red-400 rounded hover:bg-white/5 cursor-pointer shrink-0 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom Save & Add buttons */}
                    <div className="pt-3 mt-3 border-t border-white/10 space-y-2">
                      <button
                        type="button"
                        onClick={handleSaveAllBulkTracks}
                        className="w-full py-2.5 bg-[#55c21b] hover:bg-[#62dc20] text-black font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>SALVAR TODAS AS MÚSICAS DE UMA VEZ ({bulkEditTracks.length} MÚSICAS)</span>
                      </button>

                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={handleAddBulkRow}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Adicionar Linha</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerateStandard16()}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                        >
                          Restaurar 1 a 16 Padrão
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GERADOR AUTOMÁTICO */}
              {tracklistActiveTab === 'generator' && (
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Wand2 className="w-4 h-4 text-[#55c21b]" />
                    <h4 className="text-sm font-bold text-white">
                      Gerar Faixas Automaticamente no Formato da Imagem
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                        Prefixo da Faixa
                      </label>
                      <input
                        type="text"
                        value={genPrefix}
                        onChange={(e) => setGenPrefix(e.target.value)}
                        placeholder="Ex: Faixa"
                        className="w-full bg-[#16181d] border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                        Artista / Subtítulo
                      </label>
                      <input
                        type="text"
                        value={genArtist}
                        onChange={(e) => setGenArtist(e.target.value)}
                        placeholder="Ex: Demo Track"
                        className="w-full bg-[#16181d] border border-white/15 rounded-lg px-3 py-2 text-xs text-sky-400 outline-none focus:border-emerald-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                        Quantidade de Faixas
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={genCount}
                        onChange={(e) => setGenCount(Number(e.target.value) || 16)}
                        className="w-full bg-[#16181d] border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>
                  </div>

                  {/* Quantity quick buttons */}
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1.5 uppercase font-bold">
                      Atalhos Rápidos de Quantidade:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[8, 10, 12, 14, 16, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setGenCount(num)}
                          className={`px-3 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                            genCount === num
                              ? 'bg-[#55c21b] text-black border-[#55c21b]'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          {num} Faixas {num === 16 ? '(Padrão da Imagem)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="bg-[#050608] border border-white/10 rounded-lg p-3 font-mono text-xs text-neutral-300 space-y-1">
                    <span className="text-[10px] text-neutral-500 font-sans block mb-1">
                      Pré-visualização do formato que será gerado:
                    </span>
                    <div className="border-l-2 border-red-800/90 pl-3 space-y-0.5">
                      <div>
                        1. {genPrefix} 1 — <span className="text-sky-400">{genArtist}</span>
                      </div>
                      <div>
                        2. {genPrefix} 2 — <span className="text-sky-400">{genArtist}</span>
                      </div>
                      <div className="text-neutral-500">...</div>
                      <div>
                        {genCount}. {genPrefix} {genCount} —{' '}
                        <span className="text-sky-400">{genArtist}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateList(genCount, genPrefix, genArtist)}
                    className="w-full py-2.5 bg-[#55c21b] hover:bg-[#62dc20] text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>⚡ Gerar e Salvar {genCount} Faixas no Formato da Imagem</span>
                  </button>
                </div>
              )}

              {/* TAB 3: IMPORTAR / COLAR TEXTO */}
              {tracklistActiveTab === 'import_text' && (
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">
                        Colar Lista de Músicas em Texto
                      </h4>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      1 linha por música
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    Cole ou digite a lista exatamente como na imagem (ex:{' '}
                    <code className="text-neutral-200">1. Faixa 1 — Demo Track</code>). O
                    sistema separa automaticamente o número, o título e o artista:
                  </p>

                  <textarea
                    rows={10}
                    value={rawTextImport}
                    onChange={(e) => setRawTextImport(e.target.value)}
                    placeholder={`1. Faixa 1 — Demo Track\n2. Faixa 2 — Demo Track\n3. Faixa 3 — Demo Track\n...\n16. Faixa 16 — Demo Track`}
                    className="w-full bg-[#050608] border border-white/15 rounded-xl p-3 font-mono text-xs text-neutral-200 outline-none focus:border-emerald-500 leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setRawTextImport(
                          Array.from(
                            { length: 16 },
                            (_, i) => `${i + 1}. Faixa ${i + 1} — Demo Track`
                          ).join('\n')
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold cursor-pointer border border-white/10"
                    >
                      Preencher Exemplo (1 a 16)
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyTextImport}
                      className="px-4 py-2 rounded-lg bg-[#55c21b] hover:bg-[#62dc20] text-black font-extrabold text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Salvar e Aplicar Lista</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Form to Add Individual New Track */}
              <form
                onSubmit={handleAddTrack}
                className="pt-3 border-t border-white/10 bg-white/[0.02] p-3 rounded-xl space-y-2.5"
              >
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Faixa Individual</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newTrackData.title}
                    onChange={(e) =>
                      setNewTrackData({ ...newTrackData, title: e.target.value })
                    }
                    placeholder="Nome da música (ex: Faixa 17)"
                    required
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/30"
                  />
                  <input
                    type="text"
                    value={newTrackData.artist}
                    onChange={(e) =>
                      setNewTrackData({ ...newTrackData, artist: e.target.value })
                    }
                    placeholder="Artista / Demo Track"
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/30"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-white/10 hover:bg-[#55c21b] text-white hover:text-black font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  + Inserir Música na Lista
                </button>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 bg-black/40 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPackForTracks(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pack Create / Edit Form */}
      {isPackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111216] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Disc className="w-4 h-4 text-[#55c21b]" />
                <span>
                  {editingPackId ? 'Editar Pacote de Playback' : 'Cadastrar Novo Pacote'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPackModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePack} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Title & Artist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Título do Pacote *
                  </label>
                  <input
                    type="text"
                    value={packFormData.title || ''}
                    onChange={(e) =>
                      setPackFormData({ ...packFormData, title: e.target.value })
                    }
                    placeholder="Ex: Piseiro 2026 Hits"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Artista / Banda *
                  </label>
                  <input
                    type="text"
                    value={packFormData.artist || ''}
                    onChange={(e) =>
                      setPackFormData({ ...packFormData, artist: e.target.value })
                    }
                    placeholder="Ex: Wesley Safadão"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>

              {/* Genre, Year, Rhythm Style */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Gênero Principal
                  </label>
                  <select
                    value={packFormData.genre || 'Piseiro'}
                    onChange={(e) => {
                      const newG = e.target.value;
                      const currentGenres = packFormData.genres || [packFormData.genre || 'Piseiro'];
                      const updated = currentGenres.includes(newG)
                        ? currentGenres
                        : [newG, ...currentGenres];
                      setPackFormData({ ...packFormData, genre: newG, genres: updated });
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    {AVAILABLE_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Ano de Lançamento
                  </label>
                  <input
                    type="number"
                    value={packFormData.releaseYear || 2026}
                    onChange={(e) =>
                      setPackFormData({
                        ...packFormData,
                        releaseYear: Number(e.target.value),
                      })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>

              {/* Multi-seleção de Mais Gêneros da imagem */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-[#55c21b]" />
                    <span>Selecionar Mais Gêneros (Multiseleção)</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                    {(packFormData.genres || [packFormData.genre || 'Piseiro']).length} selecionado(s)
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Selecione outros gêneros da lista abaixo para que este playback apareça em múltiplas categorias na loja:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {AVAILABLE_GENRES.map((g) => {
                    const selectedList = packFormData.genres || [packFormData.genre || 'Piseiro'];
                    const isSelected = selectedList.includes(g);
                    const isPrimary = (packFormData.genre || 'Piseiro') === g;

                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer border text-left ${
                          isSelected
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border text-[10px] ${
                              isSelected
                                ? 'bg-emerald-500 border-emerald-400 text-black font-black'
                                : 'border-white/20 bg-black/40'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{g}</span>
                        </div>
                        {isPrimary && (
                          <span className="shrink-0 text-[8px] uppercase px-1 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-black">
                            Principal
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prices: Original and Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Preço Original "De" (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={packFormData.originalPrice || 49.9}
                    onChange={(e) =>
                      setPackFormData({
                        ...packFormData,
                        originalPrice: Number(e.target.value),
                      })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Preço Promocional "Por" (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={packFormData.discountPrice || 29.9}
                    onChange={(e) =>
                      setPackFormData({
                        ...packFormData,
                        discountPrice: Number(e.target.value),
                      })
                    }
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30 font-bold text-[#55c21b]"
                  />
                </div>
              </div>

              {/* Foto do Artista / Capa do Pacote */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-emerald-400" />
                    <span>Foto do Artista / Capa do Pacote</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    Insira a URL da imagem da capa
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-black/50 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative shadow-md">
                    {packFormData.image ? (
                      <img
                        src={packFormData.image}
                        alt="Prévia da capa"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_PACK_IMAGE;
                        }}
                      />
                    ) : (
                      <Image className="w-6 h-6 text-neutral-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={packFormData.image || ''}
                      onChange={(e) =>
                        setPackFormData({ ...packFormData, image: e.target.value })
                      }
                      placeholder="https://exemplo.com/foto-do-artista.jpg"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-white/30"
                    />
                    <p className="text-[10px] text-neutral-500">
                      Cole o link direto da imagem (JPG, PNG, WEBP) para a capa do produto.
                    </p>
                  </div>
                </div>
              </div>

              {/* Link do Áudio para o Play */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>Link do Áudio para o Play</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    Áudio direto (MP3 / WAV / Link de Streaming)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={packFormData.audioUrl || ''}
                    onChange={(e) =>
                      setPackFormData({ ...packFormData, audioUrl: e.target.value })
                    }
                    placeholder="https://exemplo.com/playbacks/audio_previa.mp3"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                  />
                  {packFormData.audioUrl && packFormData.audioUrl.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isTestingModalAudio) {
                          audioPlayer.stop();
                          setIsTestingModalAudio(false);
                        } else {
                          audioPlayer.play('modal-test-audio', 'piseiro', packFormData.audioUrl);
                          setIsTestingModalAudio(true);
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      {isTestingModalAudio ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-400 fill-current ml-0.5" />
                          <span>Testar Áudio</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Insira o link do áudio. Ao clicar no botão de Play na loja ou no player, este áudio real será reproduzido para o cliente.
                </p>
              </div>

              {/* Link Pós-venda do Produto */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span>Link Pós-venda do Produto</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    Google Drive, Mega, Pasta ZIP ou WhatsApp
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={packFormData.postSaleUrl || ''}
                    onChange={(e) =>
                      setPackFormData({ ...packFormData, postSaleUrl: e.target.value })
                    }
                    placeholder="https://drive.google.com/drive/folders/... ou https://mega.nz/..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                  />
                  {packFormData.postSaleUrl && packFormData.postSaleUrl.trim().length > 0 && (
                    <a
                      href={packFormData.postSaleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Testar Link</span>
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Link entregue ao cliente na tela de pós-venda após a confirmação do pagamento para baixar os arquivos do pacote completo.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  {editingPackId && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = packs.find((p) => p.id === editingPackId);
                        if (current) {
                          handleDuplicatePack(current);
                          setIsPackModalOpen(false);
                        }
                      }}
                      className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicar este Pacote</span>
                    </button>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isTestingModalAudio) {
                        audioPlayer.stop();
                        setIsTestingModalAudio(false);
                      }
                      setIsPackModalOpen(false);
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#55c21b] hover:bg-[#62dc20] text-black font-extrabold rounded-lg text-xs cursor-pointer shadow-md shadow-lime-500/20"
                  >
                    {editingPackId ? 'Salvar Alterações' : 'Criar Pacote'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
