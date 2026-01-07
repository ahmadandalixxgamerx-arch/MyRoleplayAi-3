import React from 'react';
import { X } from 'lucide-react';

interface FloatingImageViewerProps {
  src: string;
  onClose: () => void;
}

export const FloatingImageViewer: React.FC<FloatingImageViewerProps> = ({ src, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors p-2 rounded-full bg-zinc-900/50 hover:bg-zinc-800"
      >
        <X size={24} />
      </button>
      
      <img 
        src={src} 
        alt="Preview" 
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
