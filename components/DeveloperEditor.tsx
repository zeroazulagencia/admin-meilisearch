'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('json', json);
lowlight.register('bash', bash);
lowlight.register('sql', sql);
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  CodeBracketIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
  MinusIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from '@heroicons/react/24/outline';

interface DeveloperEditorProps {
  content: string;
  onChange: (content: string) => void;
  disabled?: boolean;
}

export default function DeveloperEditor({ content, onChange, disabled = false }: DeveloperEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Usaremos CodeBlockLowlight en su lugar
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#5DE1E5] underline',
        },
      }),
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
  });

  // Actualizar contenido cuando cambia la prop
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p></p>');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const MenuButton = ({ 
    onClick, 
    isActive = false, 
    icon: Icon, 
    title 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    icon: any; 
    title: string;
  }) => {
    const renderIcon = () => {
      // Si es una función que retorna JSX (como los H1, H2, H3)
      if (typeof Icon === 'function' && Icon.length === 0) {
        try {
          const result = Icon();
          if (result && typeof result === 'object' && 'type' in result) {
            return result;
          }
        } catch {
          // Si falla, intentar como componente
        }
      }
      // Si es un componente de React (Heroicons)
      if (typeof Icon === 'function') {
        return <Icon className="w-5 h-5 text-gray-700" />;
      }
      // Si ya es JSX
      return Icon;
    };

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
          isActive ? 'bg-[#5DE1E5] bg-opacity-20' : ''
        }`}
      >
        {renderIcon()}
      </button>
    );
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#5DE1E5] focus-within:border-[#5DE1E5]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={BoldIcon}
            title="Negrita (Ctrl+B)"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={ItalicIcon}
            title="Cursiva (Ctrl+I)"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            icon={CodeBracketIcon}
            title="Código inline (Ctrl+E)"
          />
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            icon={() => <span className="text-sm font-bold">H1</span>}
            title="Título 1"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={() => <span className="text-sm font-bold">H2</span>}
            title="Título 2"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            icon={() => <span className="text-sm font-bold">H3</span>}
            title="Título 3"
          />
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={ListBulletIcon}
            title="Lista con viñetas"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={NumberedListIcon}
            title="Lista numerada"
          />
        </div>

        {/* Code Block */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            icon={CodeBracketIcon}
            title="Bloque de código"
          />
        </div>

        {/* Other */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <MenuButton
            onClick={() => {
              const url = window.prompt('Ingresa la URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            isActive={editor.isActive('link')}
            icon={LinkIcon}
            title="Insertar enlace"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            icon={ChatBubbleLeftRightIcon}
            title="Cita"
          />
          <MenuButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            icon={MinusIcon}
            title="Separador horizontal"
          />
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={ArrowUturnLeftIcon}
            title="Deshacer (Ctrl+Z)"
          />
          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={ArrowUturnRightIcon}
            title="Rehacer (Ctrl+Y)"
          />
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-white min-h-[300px] max-h-[500px] overflow-y-auto">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none p-4 focus:outline-none"
        />
      </div>
    </div>
  );
}

