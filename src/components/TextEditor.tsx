import { useRef } from 'react';
import type { FC } from 'react';
import {
  Heading,
  Bold,
  Italic,
  List,
  CheckSquare,
  Code,
  Quote,
} from 'lucide-react';

interface TextEditorProps {
  content: string;
  onChange: (newContent: string) => void;
}

export const TextEditor: FC<TextEditorProps> = ({ content, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Helper to wrap or prepend markdown formatting in textarea
  const insertFormatting = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const replacement = prefix + (selectedText || 'text') + suffix;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    onChange(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText ? selectedText.length : 4)
      );
    }, 10);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="text-editor-container">
      {/* Quick Formatting Toolbar */}
      <div className="text-editor-toolbar">
        <button
          className="btn-format"
          onClick={() => insertFormatting('## ')}
          title="Heading (## )"
        >
          <Heading size={16} />
        </button>
        <button
          className="btn-format"
          onClick={() => insertFormatting('**', '**')}
          title="Bold (**text**)"
        >
          <Bold size={16} />
        </button>
        <button
          className="btn-format"
          onClick={() => insertFormatting('*', '*')}
          title="Italic (*text*)"
        >
          <Italic size={16} />
        </button>

        <div className="format-divider" />

        <button
          className="btn-format"
          onClick={() => insertFormatting('- ')}
          title="Bullet List (- )"
        >
          <List size={16} />
        </button>
        <button
          className="btn-format"
          onClick={() => insertFormatting('- [ ] ')}
          title="Task Checkbox (- [ ] )"
        >
          <CheckSquare size={16} />
        </button>
        <button
          className="btn-format"
          onClick={() => insertFormatting('> ')}
          title="Blockquote (> )"
        >
          <Quote size={16} />
        </button>
        <button
          className="btn-format"
          onClick={() => insertFormatting('`', '`')}
          title="Inline Code (`code`)"
        >
          <Code size={16} />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className="text-editor-body"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your notes here... You can write summaries, definitions, lecture bullet points, or formulas."
        spellCheck="true"
      />

      {/* Footer Info */}
      <div className="text-editor-footer">
        <span>Markdown formatting supported</span>
        <span>
          {wordCount} {wordCount === 1 ? 'word' : 'words'} • {charCount} characters
        </span>
      </div>
    </div>
  );
};
