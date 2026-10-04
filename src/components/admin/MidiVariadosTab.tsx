import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { DEFAULT_MIDI_VARIADOS } from '../../context/StoreContext';
import {
  Music2,
  Save,
  RotateCcw,
  Sparkles,
  DollarSign,
  FileText,
  Volume2,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle,
  ListMusic,
} from 'lucide-react';

export const MidiVariadosTab: React.FC = () => {
  const { midiVariadosConfig, saveMidiVariadosConfig } = useStore();
  const [formData, setFormData] = useState(midiVariadosConfig);
  const [isDirty, setIsDirty] = useState(false);
  const isInitialSyncRef = useRef(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newHighlight, setNewHighlight] = useState('');

  useEffect(() => {
    if (!isDirty || !isInitialSyncRef.current) {
      setFormData(midiVariadosConfig);
      isInitialSyncRef.current = true;
    }
  }, [midiVariadosConfig, isDirty]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveMidiVariadosConfig(formData);
    setIsDirty(false);
    showToast('Configurações da Página MIDI Variados salvas com sucesso no banco de dados!');
  };

  const handleReset = async () => {
    if (window.confirm('Deseja restaurar as configurações originais da página MIDI Variados?')) {
      setFormData(DEFAULT_MIDI_VARIADOS);
      await saveMidiVariadosConfig(DEFAULT_MIDI_VARIADOS);
      setIsDirty(false);
      showToast('Padrão oficial restaurado com sucesso!');
    }
  };

  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    setFormData({
      ...formData,
      highlights: [...(formData.highlights || []), newHighlight.trim()],
    });
    setIsDirty(true);
    setNewHighlight('');
  };

  const handleRemoveHighlight = (index: number) => {
    setFormData({
      ...formData,
      highlights: (formData.highlights || []).filter((_, i) => i !== index),
    });
    setIsDirty(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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
            <Music2 className="w-5 h-5 text-cyan-400" />
            <span>Gerenciador da Página "MIDI Variados"</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure a arte de capa, os textos dourados, os avisos em ciano, o áudio de preview e a entrega pós-venda.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
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
        {/* SEÇÃO 1: APRESENTAÇÃO E ARTE DE CAPA */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <Sparkles className="w-4 h-4" />
            <span>1. Arte da Capa & Faixa Inferior</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                URL da Imagem da Capa
              </label>
              <input
                type="text"
                value={formData.circleImage}
                onChange={(e) => setFormData({ ...formData, circleImage: e.target.value })}
                placeholder="https://... ou caminho da imagem"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Arte quadrada com moldura em neon ciano.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Texto da Faixa Abaixo da Imagem
              </label>
              <input
                type="text"
                value={formData.bottomPillText}
                onChange={(e) => setFormData({ ...formData, bottomPillText: e.target.value })}
                placeholder="MILHARES ARQUIVOS MIDI PROFISSIONAIS"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Exibido na caixa com contorno ciano abaixo da arte.
              </p>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: TEXTOS DOURADOS E OFERTA */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <FileText className="w-4 h-4" />
            <span>2. Títulos Dourados & Descrição Comercial</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Tag de Destaque Superior (Dourado)
              </label>
              <input
                type="text"
                value={formData.topBadge}
                onChange={(e) => setFormData({ ...formData, topBadge: e.target.value })}
                placeholder="★ COLETÂNEA EXCLUSIVA DE ARRANJOS MIDI ★"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Título Principal da Coletânea (Dourado)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="COLETÂNEA MEGA PACK MIDI VARIADOSVIP 2026"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Parágrafos da Descrição Comercial
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 leading-relaxed font-sans"
              placeholder="Digite os parágrafos explicativos..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Destaque Ciano Linha 1
              </label>
              <input
                type="text"
                value={formData.subHighlight1 || ''}
                onChange={(e) => setFormData({ ...formData, subHighlight1: e.target.value })}
                placeholder="Centenas de MIDIs variados em um único pacote!"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Destaque Ciano Linha 2
              </label>
              <input
                type="text"
                value={formData.subHighlight2 || ''}
                onChange={(e) => setFormData({ ...formData, subHighlight2: e.target.value })}
                placeholder="VALOR ESPECIAL DA COLETÂNEA"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: VALORES E BOTÃO DE COMPRA */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <DollarSign className="w-4 h-4" />
            <span>3. Precificação e Botão de Compra</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Preço no Checkout (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Texto do Botão Verde
              </label>
              <input
                type="text"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                placeholder="ADQUIRA A COLETÂNEA COMPLETA"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Exibir Preço Numérico na Página?
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showPrice ?? false}
                    onChange={(e) => setFormData({ ...formData, showPrice: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500"
                  />
                  <span>Mostrar "R$ {formData.price.toFixed(2)}" na tela</span>
                </label>
              </div>
            </div>
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
              Link entregue automaticamente na tela de sucesso e na Área do Cliente após o pagamento.
            </p>
          </div>
        </div>

        {/* SEÇÃO DA LISTA DE MÚSICAS */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <ListMusic className="w-4 h-4" />
            <span>Link para o Botão da Lista das Músicas (Repertório)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Link da Lista de Músicas (Google Drive, Planilha, PDF ou Web)
              </label>
              <input
                type="url"
                value={formData.tracklistUrl || ''}
                onChange={(e) => setFormData({ ...formData, tracklistUrl: e.target.value })}
                placeholder="https://docs.google.com/spreadsheets/d/... ou link do PDF"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Insira o link onde o cliente poderá visualizar todo o repertório de arquivos MIDI inclusos.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Texto do Botão da Lista de Músicas
              </label>
              <input
                type="text"
                value={formData.tracklistButtonText || ''}
                onChange={(e) => setFormData({ ...formData, tracklistButtonText: e.target.value })}
                placeholder="VER LISTA COMPLETA DAS MÚSICAS"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Texto exibido no botão da página pública (Ex: "VER LISTA COMPLETA DAS MÚSICAS").
              </p>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: DEMONSTRAÇÃO DE ÁUDIO */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/[0.08] pb-3">
            <Volume2 className="w-4 h-4" />
            <span>4. Demonstração de Áudio (Player Neon Ciano — Variados)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Título do Player
              </label>
              <input
                type="text"
                value={formData.audioPreviewTitle}
                onChange={(e) => setFormData({ ...formData, audioPreviewTitle: e.target.value })}
                placeholder="DEMONSTRAÇÃO DE ÁUDIO — MIDI VARIADOS"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Subtítulo do Player
              </label>
              <input
                type="text"
                value={formData.audioPreviewSubtitle}
                onChange={(e) =>
                  setFormData({ ...formData, audioPreviewSubtitle: e.target.value })
                }
                placeholder="Clique para ouvir uma amostra dos ritmos variados"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                URL do Áudio MP3 de Demonstração
              </label>
              <input
                type="url"
                value={formData.audioPreviewUrl}
                onChange={(e) => setFormData({ ...formData, audioPreviewUrl: e.target.value })}
                placeholder="https://...link-do-audio.mp3"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 5: DESTAQUES E RECURSOS */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>5. Destaques & Diferenciais Inclusos</span>
            </div>
            <span className="text-xs text-neutral-500">
              {formData.highlights?.length || 0} itens
            </span>
          </div>

          <div className="space-y-2">
            {(formData.highlights || []).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-neutral-200"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{item}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveHighlight(idx)}
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
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              placeholder="Digite um novo diferencial..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddHighlight();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddHighlight}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
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
    </div>
  );
};
