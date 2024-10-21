'use client'

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MyCustomIcon from './study-pal-icon'; // Import your custom icon

type Step = {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending' | 'error';
  details?: any;
};

const StepIcon = ({ status }: { status: Step['status'] }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-300" />;
  }
};

interface AIResponse {
  final_answer: {
    'Final Answer': string;
    'Notes Answer': string;
    'Web Answer': string;
    'Web Links': string[];
    'YouTube Links': string[];
  };
}

interface AIStudyPalResponseProps {
  details: AIResponse;
}

export const AIStudyPalResponse: React.FC<AIStudyPalResponseProps> = ({ details }) => {
  const { final_answer } = details;

  if (!final_answer) {
    return <p>No response available.</p>;
  }

  const steps = [
    {
      id: 'final_answer',
      title: 'Final Answer',
      description: 'The final answer provided by the AI',
      status: 'completed' as const,
      details: final_answer['Final Answer']
    },
    {
      id: 'notes_answer',
      title: 'Notes Answer',
      description: 'The answer provided by the AI for the notes',
      status: 'completed' as const,
      details: final_answer['Notes Answer']
    },
    {
      id: 'web_answer',
      title: 'Web Answer',
      description: 'The answer provided by the AI for the web',
      status: 'completed' as const,
      details: final_answer['Web Answer']
    },
    {
      id: 'web_links',
      title: 'Web Links',
      description: 'The links provided by the AI for the web',
      status: 'completed' as const,
      details: final_answer['Web Links']
    },
    {
      id: 'youtube_links',
      title: 'YouTube Links',
      description: 'The links provided by the AI for YouTube',
      status: 'completed' as const,
      details: final_answer['YouTube Links']
    }
  ].filter(step => step.details && (Array.isArray(step.details) ? step.details.length > 0 : true));

  return (
    <Card className="w-full" style={{ width: '100%' }}>
      <CardHeader className="flex flex-row items-center space-x-2 pb-2">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
          <div className="w-6 h-6 flex items-center justify-center">
            <MyCustomIcon className="max-w-full max-h-full" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold">AI Study Pal Response</CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="space-y-4">
          {steps.map((step, index) => (
            // Render Final Answer without collapsible
            step.id === 'final_answer' ? (
              <div key={step.id} className="w-full break-words">
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.description}</p>
                <p className="break-words">{step.details}</p> {/* Always show details for Final Answer */}
              </div>
            ) : (
              <StepItem key={step.id} step={step} isLast={index === steps.length - 1} />
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

function StepItem({ step, isLast }: { step: Step; isLast: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const renderDetails = (details: any) => {
    if (Array.isArray(details)) {
      return (
        <ul className="list-disc pl-5 break-words">
          {details.map((item, index) => (
            <li key={index} className="break-words">
              <a href={item} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-words">
                {item}
              </a>
            </li>
          ))}
        </ul>
      );
    } else {
      return <p className="break-words">{details}</p>;
    }
  };

  return (
    <div className="flex w-full overflow-hidden">
      <div className="flex flex-col items-center mr-4">
        <StepIcon status={step.status} />
        {!isLast && <div className="w-px h-full bg-gray-300 mt-2" />}
      </div>
      <div className="flex-grow">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex flex-col items-start">
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
              {step.details && (
                isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />
              )}
            </Button>
          </CollapsibleTrigger>
          {step.details && (
            <CollapsibleContent className="mt-2 text-sm text-gray-600 break-words">
              {renderDetails(step.details)}
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    </div>
  );
}
