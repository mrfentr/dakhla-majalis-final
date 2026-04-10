'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  /**
   * Current image URL (if any)
   */
  value?: string;
  /**
   * Callback when image is successfully uploaded
   */
  onChange: (url: string) => void;
  /**
   * Whether the upload is disabled
   */
  disabled?: boolean;
  /**
   * Custom label for the upload button
   */
  label?: string;
  /**
   * Custom className for the container
   */
  className?: string;
  /**
   * Maximum file size in MB (default: 5MB)
   */
  maxSizeMB?: number;
}

export default function ImageUpload({
  value,
  onChange,
  disabled = false,
  label = 'Télécharger l\'image',
  className = '',
  maxSizeMB = 20,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    });

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      const errorMsg = `L'image ne doit pas dépasser ${maxSizeMB} MB`;
      console.error(errorMsg, `File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      toast.error(errorMsg);
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      const errorMsg = 'Format invalide. Utilisez JPG, PNG, WebP, GIF ou AVIF';
      console.error(errorMsg, `File type: ${file.type}`);
      toast.error(errorMsg);
      return;
    }

    try {
      console.log('Starting upload...');
      setIsUploading(true);
      toast.loading('Téléchargement en cours...', { id: 'upload' });

      const formData = new FormData();
      formData.append('file', file);
      console.log('FormData created, sending to /api/upload');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Upload failed with error:', error);
        throw new Error(error.error || error.details || 'Upload failed');
      }

      const data = await response.json();
      console.log('Upload successful:', data);

      onChange(data.url);
      setImageError(false);
      toast.success('Image téléchargée avec succès!', { id: 'upload' });
    } catch (error) {
      console.error('Image upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Échec du téléchargement de l\'image';
      toast.error(errorMessage, { id: 'upload' });
    } finally {
      console.log('Upload process finished');
      setIsUploading(false);
    }
  }, [maxSizeMB, onChange]);

  const handleButtonClick = () => {
    console.log('Upload button clicked');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      console.log('File input changed');
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('File selected from input:', file.name);
        await handleFileSelect(file);
      } else {
        console.log('No file was selected');
      }
    };
    console.log('Opening file picker...');
    input.click();
  };

  const handleRemove = () => {
    onChange('');
    setImageError(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  if (value && !imageError) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-neutral-200">
          <Image
            src={value}
            alt="Upload preview"
            fill
            className="object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="absolute top-2 right-2 w-8 h-8 bg-white hover:bg-red-50 text-neutral-700 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleButtonClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        disabled={disabled || isUploading}
        className={`w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-all text-neutral-500 disabled:cursor-not-allowed bg-white ${
          isUploading
            ? 'border-[#BD7C48] bg-[#BD7C48]/5'
            : 'border-neutral-300 hover:border-[#BD7C48] hover:text-[#BD7C48]'
        } ${disabled && !isUploading ? 'opacity-50' : ''}`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-[#BD7C48]" />
            <span className="text-base font-bold text-[#BD7C48]">Téléchargement en cours...</span>
            <span className="text-xs text-neutral-600">Veuillez patienter</span>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8" />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-neutral-400">
              PNG, JPG, WebP, GIF ou AVIF (max {maxSizeMB}MB)
            </span>
            <span className="text-xs text-neutral-400">
              Cliquez ou glissez-déposez
            </span>
          </>
        )}
      </button>
    </div>
  );
}
