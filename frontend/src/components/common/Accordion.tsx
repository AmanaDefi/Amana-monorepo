import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-tuatara-900 last:border-b-0">
      <button
        className="flex w-full justify-between items-center py-4 px-2 text-white hover:text-gray-300 focus:outline-none transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-lg">{title}</span>
        <ChevronDownIcon 
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 pb-4 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-2 text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
} 