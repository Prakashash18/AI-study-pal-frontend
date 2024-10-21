import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Button } from './ui/button';
import { ChevronUp, ChevronDown, Globe, Video, HelpCircle } from 'lucide-react';
import { AIStudyPalResponse } from './ai-study-pal-response';

interface AIResponse {
  final_answer: {
    'Final Answer': string;
    'Notes Answer': string;
    'Web Answer': string;
    'Web Links': string[];
    'YouTube Links': string[];
  };
}

interface CustomChatMessageProps {
  content: string | AIResponse;
  selectedText?: string;
  question?: string;
  tags?: string[];
  role?: 'user' | 'assistant' | 'system';
}

export const CustomChatMessage: React.FC<CustomChatMessageProps> = ({
  content,
  selectedText,
  question,
  tags,
  role,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sanitizeText = (text: string) => {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent || '';
  };

  return (
    <div
      className={`w-full space-y-2 ${
        role === 'user' ? 'bg-blue-50' : role === 'assistant' ? 'bg-green-50' : ''
      } p-4 rounded-md`}
    >
      {role && <div className="text-xs text-gray-500 mb-1">{role}</div>}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center break-words"
            >
              {tag === 'Web Search' ? (
                <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
              ) : tag === 'Video Search' ? (
                <Video className="h-3 w-3 mr-1 flex-shrink-0" />
              ) : (
                <HelpCircle className="h-3 w-3 mr-1 flex-shrink-0" />
              )}
              <span className="break-words">{tag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Text */}
      {selectedText && (
        <div className="bg-muted rounded-lg p-2 w-full break-words">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-primary">Selected Text</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isExpanded && (
            <blockquote className="mt-2 text-sm border-l-4 border-primary pl-4 italic text-foreground break-words">
              {sanitizeText(selectedText)}
            </blockquote>
          )}
        </div>
      )}

      {/* Question */}
      {question && (
        <div className="bg-primary/10 rounded-lg p-2 text-sm w-full break-words">
          <strong>Question:</strong> <span className="break-words">{question}</span>
        </div>
      )}

      {/* Message Content */}
      <div className="prose dark:prose-invert max-w-full break-words min-w-0">
        {typeof content === 'string' ? (
          // User message
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ className, children, inline, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <pre
                    className={`language-${match[1]} rounded-md p-4 bg-muted w-full overflow-auto break-words`}
                  >
                    <code className={`${className} break-words`} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className={`${className} bg-gray-200 rounded p-1 break-words`} {...props}>
                    {children}
                  </code>
                );
              },
              // Optional: Handle images, links, tables to make sure they are responsive
              img: ({ alt, src, title }) => (
                <img src={src} alt={alt} title={title} className="max-w-full h-auto" />
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto">
                  <table className="min-w-full">{children}</table>
                </div>
              ),
            }}
            className="w-full break-words"
          >
            {content}
          </ReactMarkdown>
        ) : (
          // Assistant message
          <AIStudyPalResponse details={content as AIResponse} />
        )}
      </div>
    </div>
  );
};
