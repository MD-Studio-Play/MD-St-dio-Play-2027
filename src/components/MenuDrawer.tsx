import React from 'react';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (cat: string) => void;
  activeTab?: string;
  onSelectTab?: (tab: 'playbacks' | 'midi_variados' | 'midi_gospel' | 'flyer_show') => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = () => {
  return null;
};
