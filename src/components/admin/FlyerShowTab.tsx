import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { FlyerItem } from '../../types';
import { DEFAULT_FLYER_SHOW } from '../../context/StoreContext';
import { resolveFlyerImage } from '../FlyerShowPage';
import {
  Image,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  Download,
  Eye,
  CheckCircle,
  FileText,
  DollarSign,
  Layers,
  Pencil,
  Copy,
  X,
  Check,
} from 'lucide-react';

export const FlyerShowTab: React.FC = () => {
  const { flyerShowConfig, saveFlyerShowConfig } = useStore();
  const [formData, setFormData] = useState(flyerShowConfig);
  const [isDirty, setIsDirty] = useState(false);
  const isInitialSyncRef = useRef(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with Firestore state when not actively editing dirty fields
  useEffect(() => {
    if (!isDirty || !isInitialSyncRef.current) {
      setFormData(flyerShowConfig);
      isInitialSyncRef.current = true;
    }
  }, [flyerShowConfig, isDirty]);

  // New item inputs
  const [newFeatureText, setNewFeatureText] = useState('');
  const [newFlyerTitle, setNewFlyerTitle] = useState('');
  const [newFlyerCategory, setNewFlyerCategory] = useState('');
  const [newFlyerImage, setNewFlyerImage] = useState('');

  // Editing state for gallery flyer item
  const [editingFlyer, setEditingFlyer] = useState<FlyerItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editImage, setEditImage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveFlyerShowConfig(formData);
    setIsDirty(false);
    showToast('Configurações da Página Flyer Show salvas com sucesso no banco de dados!');
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Deseja restaurar as configurações originais da página Flyer Show?')) {
      setFormData(DEFAULT_FLYER_SHOW);
      await saveFlyerShowConfig(DEFAULT_FLYER_SHOW);
      setIsDirty(false);
      showToast('Configurações padrão restauradas com sucesso!');
    }
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    const updated = {
      ...formData,
      features: [...(formData.features || []), newFeatureText.trim()],
    };
    setFormData(updated);
    setIsDirty(true);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    const updated = {
      ...formData,
      features: (formData.features || []).filter((_, i) => i !== index),
    };
    setFormData(updated);
    setIsDirty(true);
  };

  const handleAddGalleryFlyer = async () => {
    if (!newFlyerTitle.trim() || !newFlyerImage.trim()) {
      showToast('Preencha pelo menos o título e a URL da imagem do flyer.');
      return;
    }
    const newItem: FlyerItem = {
      id: `fl_${Date.now()}`,
      title: newFlyerTitle.trim(),
      category: newFlyerCategory.trim() || 'Show & Eventos',
      imageUrl: newFlyerImage.trim(),
    };
    const updated = {
      ...formData,
      gallery: [...(formData.gallery || []), newItem],
    };
    setFormData(updated);
    await saveFlyerShowConfig(updated);
    setIsDirty(false);
    setNewFlyerTitle('');
    setNewFlyerCategory('');
    setNewFlyerImage('');
    showToast(`Modelo "${newItem.title}" adicionado e salvo na galeria!`);
  };

  const handleDuplicateGalleryFlyer = async (flyer: FlyerItem) => {
    const newId = `fl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicatedItem: FlyerItem = {
      ...flyer,
      id: newId,
      title: `${flyer.title} (Cópia)`,
    };
    const currentIndex = (formData.gallery || []).findIndex((f) => f.id === flyer.id);
    const updatedGallery = [...(formData.gallery || [])];
    if (currentIndex >= 0) {
      updatedGallery.splice(currentIndex + 1, 0, duplicatedItem);
    } else {
      updatedGallery.push(duplicatedItem);
    }
    const updated = { ...formData, gallery: updatedGallery };
    setFormData(updated);
    await saveFlyerShowConfig(updated);
    setIsDirty(false);
    showToast(`Modelo "${flyer.title}" duplicado e salvo com sucesso!`);
  };

  const handleStartEdit = (flyer: FlyerItem) => {
    setEditingFlyer(flyer);
    setEditTitle(flyer.title);
    setEditCategory(flyer.category);
    setEditImage(flyer.imageUrl);
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingFlyer) return;
    if (!editTitle.trim()) {
      showToast('O título do modelo não pode ficar vazio.');
      return;
    }
    const updatedGallery = (formData.gallery || []).map((f) => {
      if (f.id === editingFlyer.id) {
        return {
          ...f,
          title: editTitle.trim(),
          category: editCategory.trim() || 'Show & Eventos',
          imageUrl: editImage.trim() || f.imageUrl,
        };
      }
      return f;
    });
    const updated = { ...formData, gallery: updatedGallery };
    setFormData(updated);
    await saveFlyerShowConfig(updated);
    setIsDirty(false);
    setEditingFlyer(null);
    showToast(`Modelo "${editTitle.trim()}" atualizado e salvo com sucesso!`);
  };

  const handleRemoveGalleryFlyer = async (id: string) => {
    const flyerItem = (formData.gallery || []).find((f) => f.id === id);
    if (window.confirm(`Deseja realmente excluir o modelo "${flyerItem?.title || 'selecionado'}"?`)) {
      const updated = {
        ...formData,
        gallery: (formData.gallery || []).filter((f) => f.id !== id),
      };
      setFormData(updated);
      await saveFlyerShowConfig(updated);
      setIsDirty(false);
      showToast(`Modelo "${flyerItem?.title || 'selecionado'}" excluído com sucesso!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#16181d] border border-cyan-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Image className="w-5 h-5 text-cyan-400" />
            <span>Gerenciador da Página "Flyer Show"</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure os títulos, capa do pack, preços, checklist de benefícios, galeria de flyers inclusos e link de download demo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SEÇÃO 1: CABEÇALHO DO SITE */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <FileText className="w-4 h-4" />
            <span>1. Cabeçalho da Página (Título & Subtítulo Superior)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Título Principal
              </label>
              <input
                type="text"
                value={formData.headerTitle}
                onChange={(e) => setFormData({ ...formData, headerTitle: e.target.value })}
                placeholder="FLYER PARA SHOW & EVENTOS"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Subtítulo Superior
              </label>
              <input
                type="text"
                value={formData.headerSubtitle}
                onChange={(e) => setFormData({ ...formData, headerSubtitle: e.target.value })}
                placeholder="FLYERS PROFISSIONAIS DE ALTA CONVERSÃO PARA DIVULGAR SEU SHOW OU EVENTO."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: CARD PROMOCIONAL DO PACK */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <Sparkles className="w-4 h-4" />
            <span>2. Conteúdo do Pack Promocional Principal</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Selo / Badge Superior
              </label>
              <input
                type="text"
                value={formData.badgeText}
                onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                placeholder="SUPER PACK PROMOCIONAL"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Título do Pack de Flyers
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="MEGA COLETÂNEA DESIGNER - PACK 150+ FLYERS EDITÁVEIS"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Descrição Comercial
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                URL da Imagem de Capa do Mockup
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="https://... ou caminho de imagem"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                />
                <img
                  src={resolveFlyerImage(formData.coverImage)}
                  alt="Preview da Capa"
                  className="w-10 h-10 object-cover rounded-lg border border-cyan-500/40 shrink-0"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Mockup 3D ou arte mostrando os modelos de flyers inclusos.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Link de Entrega Pós-Venda (Google Drive / Mega)
              </label>
              <input
                type="url"
                value={formData.postSaleUrl}
                onChange={(e) => setFormData({ ...formData, postSaleUrl: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Link entregue ao comprador após a confirmação do pagamento.
              </p>
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: PREÇOS & DESCONTOS */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <DollarSign className="w-4 h-4" />
            <span>3. Valores e Promoção</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Preço Original "De" (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) =>
                  setFormData({ ...formData, originalPrice: Number(e.target.value) })
                }
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Preço Promocional "Por" (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discountPrice}
                onChange={(e) =>
                  setFormData({ ...formData, discountPrice: Number(e.target.value) })
                }
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Tag de Desconto (Ex: Economize 60%)
              </label>
              <input
                type="text"
                value={formData.discountTag}
                onChange={(e) => setFormData({ ...formData, discountTag: e.target.value })}
                placeholder="Economize 60%"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: CHECKLIST DE BENEFÍCIOS */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>4. Checklist de Benefícios Inclusos (Marcados com ✓)</span>
            </div>
            <span className="text-xs text-neutral-500">
              {formData.features?.length || 0} itens
            </span>
          </div>

          <div className="space-y-2">
            {(formData.features || []).map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-neutral-200"
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-black">✓</span>
                  <span>{feat}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newFeatureText}
              onChange={(e) => setNewFeatureText(e.target.value)}
              placeholder="Digite um novo benefício para adicionar..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddFeature}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        {/* SEÇÃO 5: GALERIA DE MODELOS (7 FLYERS) */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Layers className="w-4 h-4" />
              <span>5. Modelos da Galeria Inferior (Exibição dos 7 Flyers)</span>
            </div>
            <span className="text-xs text-neutral-500">
              {formData.gallery?.length || 0} modelos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(formData.gallery || []).map((flyer) => (
              <div
                key={flyer.id}
                className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 hover:border-white/20 transition-all rounded-xl group"
              >
                <img
                  src={resolveFlyerImage(flyer.imageUrl)}
                  alt={flyer.title}
                  className="w-12 h-16 object-cover rounded-lg shrink-0 border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-white truncate" title={flyer.title}>
                    {flyer.title}
                  </span>
                  <span className="block text-[10px] text-cyan-400 truncate" title={flyer.category}>
                    {flyer.category}
                  </span>
                </div>
                {/* Actions: Editar, Duplicar, Excluir */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(flyer)}
                    title="Editar modelo"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateGalleryFlyer(flyer)}
                    title="Duplicar modelo"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryFlyer(flyer.id)}
                    title="Excluir modelo"
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Flyer to Gallery */}
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-3">
            <div className="text-xs font-bold text-white">Adicionar Novo Modelo à Galeria</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={newFlyerTitle}
                onChange={(e) => setNewFlyerTitle(e.target.value)}
                placeholder="Título (ex: Cavalgada dos Amigos)"
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                value={newFlyerCategory}
                onChange={(e) => setNewFlyerCategory(e.target.value)}
                placeholder="Categoria (ex: Vaquejada / Show)"
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                value={newFlyerImage}
                onChange={(e) => setNewFlyerImage(e.target.value)}
                placeholder="URL da Imagem do Flyer"
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="button"
              onClick={handleAddGalleryFlyer}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Modelo à Galeria</span>
            </button>
          </div>
        </div>

        {/* SEÇÃO 6: BOTÃO DEMO GRÁTIS */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <Download className="w-4 h-4" />
            <span>6. Botão de Download do Modelo Demo Grátis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Texto do Botão
              </label>
              <input
                type="text"
                value={formData.demoButtonText}
                onChange={(e) => setFormData({ ...formData, demoButtonText: e.target.value })}
                placeholder="DOWNLOAD MODELO DEMO GRATIS"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Link de Download (Google Drive, Mega, Pasta ZIP)
              </label>
              <input
                type="url"
                value={formData.demoDownloadUrl}
                onChange={(e) => setFormData({ ...formData, demoDownloadUrl: e.target.value })}
                placeholder="https://drive.google.com/..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>
      </form>

      {/* Modal de Edição de Modelo da Galeria de Flyers */}
      {editingFlyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111216] border border-cyan-500/30 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                <Pencil className="w-4 h-4" />
                <span>Editar Modelo de Flyer</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingFlyer(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Preview da Imagem */}
              <div className="flex items-center gap-3 p-3 bg-black/50 border border-white/10 rounded-xl">
                <img
                  src={resolveFlyerImage(editImage || editingFlyer.imageUrl)}
                  alt="Preview"
                  className="w-14 h-20 object-cover rounded-lg border border-white/15 bg-black/60 shrink-0"
                />
                <div className="text-xs text-neutral-400 space-y-1">
                  <span className="block font-semibold text-white">Pré-visualização do Flyer</span>
                  <span className="block text-[11px] text-neutral-500">
                    A miniatura é atualizada ao alterar a URL da imagem.
                  </span>
                </div>
              </div>

              {/* Campo Título */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Título do Modelo *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ex: Cavalgada dos Amigos"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Campo Categoria / Subtítulo */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Categoria / Subtítulo *
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Ex: Cavalgada & Sertanejo"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Campo URL da Imagem */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  URL da Imagem do Flyer *
                </label>
                <input
                  type="text"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  placeholder="https://... ou caminho relativo da imagem"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingFlyer(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
