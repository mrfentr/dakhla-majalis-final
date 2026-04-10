'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  className?: string;
}

export default function TiptapEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = 'Commencez à écrire votre article...',
  className = '',
}: TiptapEditorProps) {
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#BD7C48] underline hover:text-[#A0673D]',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 2 MB');
        return;
      }

      try {
        setIsUploading(true);

        let imageUrl: string;

        if (onImageUpload) {
          // Use custom upload handler if provided
          imageUrl = await onImageUpload(file);
        } else {
          // Default: upload to ImageKit via API route
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const data = await response.json();
          imageUrl = data.url;
        }

        // Insert image into editor
        if (editor && imageUrl) {
          editor.chain().focus().setImage({ src: imageUrl }).run();
          toast.success('Image ajoutée avec succès');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        toast.error('Échec du téléchargement de l\'image');
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  }, [editor, onImageUpload]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL du lien', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border border-neutral-300 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-neutral-50 border-b border-neutral-300 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-1 pr-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('bold') ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Gras"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('italic') ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Italique"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('underline') ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Souligné"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 pr-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('heading', { level: 1 }) ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Titre 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Titre 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Titre 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 pr-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('bulletList') ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Liste à puces"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('orderedList') ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Liste numérotée"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('blockquote') ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Citation"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 pr-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Aligner à gauche"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Centrer"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Aligner à droite"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* Media & Links */}
        <div className="flex gap-1 pr-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={setLink}
            className={`p-2 rounded hover:bg-neutral-200 transition-colors ${
              editor.isActive('link') ? 'bg-neutral-200 text-[#BD7C48]' : 'text-neutral-700'
            }`}
            title="Ajouter un lien"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleImageUpload}
            disabled={isUploading}
            className="p-2 rounded hover:bg-neutral-200 transition-colors text-neutral-700 disabled:opacity-50"
            title="Ajouter une image"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded hover:bg-neutral-200 transition-colors text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Annuler"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded hover:bg-neutral-200 transition-colors text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Rétablir"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
