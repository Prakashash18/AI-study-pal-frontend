import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Globe, Video, HelpCircle } from 'lucide-react'
import { AIStudyPalResponse } from './ai-study-pal-response'

interface AIResponse {
  final_answer: {
    'Final Answer': string;
    'Web Answer': string;
    'Web Links': string[];
    'YouTube Links': string[];
  };
}

interface EnhancedChatMessageProps {
  content: string | AIResponse;
  selectedText?: string;
  tags?: string[];
  role: 'user' | 'assistant';
  question?: string;
}

const EnhancedChatMessage: React.FC<EnhancedChatMessageProps> = ({
  content,
  selectedText,
  tags,
  role,
  question
}) => {
  const isAIResponse = typeof content === 'object' && content !== null && 'final_answer' in content;

  const renderContent = () => {
    if (isAIResponse) {
      return <AIStudyPalResponse details={content as AIResponse} />;
    } else {
      return <p className="break-words whitespace-normal">{content as string}</p>;
    }
  };

  return (
    <Card className={`mb-4 ${role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'} rounded-lg shadow-md overflow-hidden max-w-full`}>
      <CardContent className="p-4 overflow-auto">
        {role === 'assistant' && question && !isAIResponse && (
          <div className="mb-2 text-sm text-gray-600 break-words">
            <strong>Question:</strong> <span className="break-words">{question}</span>
          </div>
        )}
        {selectedText && (
          <div className="mb-2 p-2 bg-gray-200 rounded-lg break-words">
            <strong>Selected Text:</strong> <span className="break-words">{selectedText}</span>
          </div>
        )}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, index) => (
              <div key={index} className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center break-words">
                {tag === 'Web Search' ? <Globe className="h-3 w-3 mr-1 flex-shrink-0" /> : 
                 tag === 'Video Search' ? <Video className="h-3 w-3 mr-1 flex-shrink-0" /> :
                 tag === 'Quiz Me' ? <HelpCircle className="h-3 w-3 mr-1 flex-shrink-0" /> : null}
                <span className="break-words">{tag}</span>
              </div>
            ))}
          </div>
        )}
        <div className="text-base leading-relaxed break-words whitespace-normal">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedChatMessage;
