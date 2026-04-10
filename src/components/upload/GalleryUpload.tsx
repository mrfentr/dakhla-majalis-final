'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

interface GalleryImage {
  url: string;
  alt?: {
    fr: string;
    ar: string;
  };
}

interface GalleryUploadProps {
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  disabled?: boolean;
  maxImages?: number;
  maxSizeMB?: number;
}

export default function GalleryUpload({
  value = [],
  onChange,
  disabled = false,
  maxImages = 10,
  maxSizeMB = 20,
}: GalleryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`L'image ne doit pas dépasser ${maxSizeMB} MB`);
      return null;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format invalide. Utilisez JPG, PNG, WebP, GIF ou AVIF');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  }, [maxSizeMB]);

  const handleFilesSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = maxImages - value.length;

    if (fileArray.length > remaining) {
      toast.error(`Vous pouvez ajouter ${remaining} image(s) supplémentaire(s) maximum`);
      return;
    }

    setIsUploading(true);
    toast.loading(`Téléchargement de ${fileArray.length} image(s)...`, { id: 'gallery-upload' });

    try {
      const results = await Promise.allSettled(
        fileArray.map(file => uploadFile(file))
      );

      const newImages: GalleryImage[] = [];
      let failCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          newImages.push({ url: result.value });
        } else {
          failCount++;
        }
      }

      if (newImages.length > 0) {
        onChange([...value, ...newImages]);
        toast.success(`${newImages.length} image(s) ajoutée(s)`, { id: 'gallery-upload' });
      }

      if (failCount > 0) {
        toast.error(`${failCount} image(s) n'ont pas pu être téléchargée(s)`);
      }
    } catch (error) {
      console.error('Gallery upload error:', error);
      toast.error('Erreur lors du téléchargement', { id: 'gallery-upload' });
    } finally {
      setIsUploading(false);
    }
  }, [value, maxImages, uploadFile, onChange]);

  const handleButtonClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        await handleFilesSelect(files);
      }
    };
    input.click();
  };

  const handleRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFilesSelect(files);
    }
  };

  // Reorder drag handlers
  const handleReorderDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleReorderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...value];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, removed);
    onChange(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-3">
      {/* Gallery grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              draggable
              onDragStart={() => handleReorderDragStart(index)}
              onDragOver={(e) => handleReorderDragOver(e, index)}
              onDrop={(e) => handleReorderDrop(e, index)}
              onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                dragOverIndex === index ? 'border-[#BD7C48] scale-105' :
                draggedIndex === index ? 'border-[#BD7C48] opacity-50' : 'border-neutral-200'
              }`}
            >
              <div className="aspect-square relative">
                <Image
                  src={img.url}
                  alt={img.alt?.fr || `Image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-start justify-between p-1.5">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-white drop-shadow" />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled || isUploading}
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 bg-white hover:bg-red-50 text-neutral-700 hover:text-red-600 rounded-md flex items-center justify-center shadow-md disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Index badge */}
              <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {value.length < maxImages && (
        <button
          type="button"
          onClick={handleButtonClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          disabled={disabled || isUploading}
          className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all text-neutral-500 disabled:cursor-not-allowed bg-white ${
            isUploading
              ? 'border-[#BD7C48] bg-[#BD7C48]/5'
              : 'border-neutral-300 hover:border-[#BD7C48] hover:text-[#BD7C48]'
          } ${disabled && !isUploading ? 'opacity-50' : ''}`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-[#BD7C48]" />
              <span className="text-sm font-bold text-[#BD7C48]">Téléchargement...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">Ajouter des images</span>
              <span className="text-xs text-neutral-400">
                {value.length}/{maxImages} images · PNG, JPG, WebP, AVIF (max {maxSizeMB}MB)
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
