import { useRef } from 'react';
import type { FC } from 'react';
import {
  Heading,
  Bold,
  Italic,
  List,
  CheckSquare,
  Quote,
  Code,
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

  return (
    <div className="clean-text-editor">
      {/* Seamless Writing Area matching reference image */}
      <textarea
        ref={textareaRef}
        className="document-body-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing..."
        spellCheck="true"
      />

      {/* Subtle Floating Bottom Formatting Toolbar */}
      <div className="text-floating-toolbar">
        <button
          className="btn-format-tool"
          onClick={() => insertFormatting('## ')}
          title="Heading"
        >
          <Heading size={15} />
        </button>
        <button
          className="btn-format-tool"
          onClick={() => insertFormatting('**', '**')}
          title="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          className="btn-format-tool"
          onClick={() => insertFormatting('*', '*')}
          title="Italic"
        >
          <Italic size={15} />
        </button>
        <div className="format-separator" />
        <button
          className="btn-format-tool"
          onClick={() => insertFormatting('- ')}
          title="Bullet List"
        >
          <List size={15} />
        </button>
        <button
          className="btn-format-tool"
          onClick={() => insertFormatting('- [ ] ')}
          title="Checklist"
        >
          <CheckSquare size={15} />
        </button>
        <button
          className="btn-format-tool"
          onClick={() => insertFormatting('> ')}
          title="Quote"
        >
          <Quote size={15} />
        </button>
        <button
          className="btn-format-tool"
          onClick={() => insertFormatting('`', '`')}
          title="Code"
        >
          <Code size={15} />
        </button>
        {wordCount > 0 && (
          <span className="text-stats-counter">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        )}
      </div>
    </div>
  );
};
