import { Extension } from '@tiptap/core'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Underlines from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from "@/lib/utils"
import { useEffect, useState } from 'react'
import { Bold, Italic, Underline, Eraser } from 'lucide-react'
import { Input } from "@/components/ui/input"

// Declare module augmentation for Tiptap commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

// FontSize extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})

interface TextEditorProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  className?: string;
  placeholder?: string;
  value?: string;
  onChange: (val: string) => void;
}

function TiptapEditor({ className, placeholder, value, onChange, ...props }: TextEditorProps) {
  const [mounted, setMounted] = useState(false)
  const [fontSizeInput, setFontSizeInput] = useState('16')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      Color,
      Underlines,
      FontSize,
      Placeholder.configure({
        placeholder: placeholder || 'Type something...',
      }),
    ],
    content: value,
    autofocus: false,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose focus:outline-none min-h-[50px]',
      },
    },
  })

  // Sync fontSizeInput whenever selection changes
  useEffect(() => {
    if (!editor) return

    const updateFontSizeInput = () => {
      const size = parseInt(
        editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'
      )
      setFontSizeInput(size.toString())
    }

    editor.on('selectionUpdate', updateFontSizeInput)
    editor.on('transaction', updateFontSizeInput)

    return () => {
      editor.off('selectionUpdate', updateFontSizeInput)
      editor.off('transaction', updateFontSizeInput)
    }
  }, [editor])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!editor || !mounted) {
    return (
      <div
        className={cn(
          "w-full min-h-[50px] border-b-2 border-transparent border-gray-50 p-2",
          className
        )}
        {...props}
      />
    )
  }

  return (
    <div className={cn("relative group", className)}>

      <EditorContent
        editor={editor}
        className={cn(
          "w-full min-h-[50px] rounded-sm border-2 border-transparent border-gray-100 focus-within:border-blue-600 p-2",
          className
        )}
        {...props}
      />

      <BubbleMenu
        editor={editor}
        shouldShow={({ editor }) => editor.isFocused}
        tippyOptions={{
          duration: 100,
          placement: 'bottom',
          zIndex: 9999,
        }}
        className="z-[9999]"
      >
        <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-xl shadow-xl">
          <Input
            type="number"
            min="10"
            max="200"
            className="w-[70px] text-center border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={fontSizeInput}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setFontSizeInput(e.target.value)
            }}
            onBlur={() => {
              if (fontSizeInput === "") {
                editor.chain().focus().unsetFontSize().run()
              } else {
                editor.chain().focus().setFontSize(`${fontSizeInput}px`).run()
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur()
              }
            }}
          />

          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-md transition-colors hover:bg-gray-100 ${
              editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-md transition-colors hover:bg-gray-100 ${
              editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded-md transition-colors hover:bg-gray-100 ${
              editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
            }`}
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().setParagraph().unsetAllMarks().run()}
            className="p-2 rounded-md transition-colors hover:bg-gray-100 text-gray-700"
            title="Clear Formatting"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <label title="Text Color" className="relative w-6 h-6 cursor-pointer">
            <input
              type="color"
              onInput={(e) => editor.chain().focus().setColor(e.currentTarget.value).run()}
              value={editor.getAttributes('textStyle').color || '#000000'}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div
              className="w-4 h-4 mt-1 border rounded-full"
              style={{
                backgroundColor: editor.getAttributes('textStyle').color || '#000000',
              }}
            ></div>
          </label>
        </div>
      </BubbleMenu>
    </div>
  )
}

export { TiptapEditor }
