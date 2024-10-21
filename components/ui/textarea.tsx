   // components/ui/textarea.tsx
   import React from 'react';

   interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
     className?: string;
   }

   export const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => {
     return (
       <textarea
         className={`border rounded-md p-2 ${className}`}
         {...props}
       />
     );
   };