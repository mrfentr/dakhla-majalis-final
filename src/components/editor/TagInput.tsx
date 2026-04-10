'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export default function TagInput({
  tags,
  onChange,
  placeholder = 'Entrez des tags séparés par des virgules...',
  maxTags,
  className = '',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTags(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags[tags.length - 1]);
    }
  };

  const addTags = (value: string) => {
    if (!value.trim()) return;

    // Split by comma and clean up each tag
    const newTags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .filter((tag) => !tags.includes(tag)); // Remove duplicates

    if (newTags.length === 0) {
      setInputValue('');
      return;
    }

    // Check max tags limit
    if (maxTags && tags.length + newTags.length > maxTags) {
      alert(`Vous ne pouvez ajouter que ${maxTags} tags maximum`);
      return;
    }

    onChange([...tags, ...newTags]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    addTags(pastedText);
  };

  return (
    <div className={className}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#BD7C48]/10 text-[#BD7C48] text-sm font-bold rounded-full"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-red-600 transition-colors"
                aria-label={`Supprimer ${tag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) {
              addTags(inputValue);
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors text-sm"
        />
        <button
          type="button"
          onClick={() => addTags(inputValue)}
          className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors text-sm font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-neutral-500 mt-2">
        Séparez les tags par des virgules ou appuyez sur Entrée. Vous pouvez coller plusieurs tags à la fois.
        {maxTags && ` (${tags.length}/${maxTags})`}
      </p>
    </div>
  );
}
