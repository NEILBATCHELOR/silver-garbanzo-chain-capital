import React from "react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { FeatureBadge } from "./FeatureBadge";

interface AccordionSectionProps {
  value: string;
  title: string;
  badge?: {
    type: 'defi' | 'advanced' | 'enterprise' | 'compliance';
    text: string;
  };
  children: React.ReactNode;
  className?: string;
}

/**
 * AccordionSection - Consistent accordion section with proper badge alignment
 * Ensures badges are properly positioned and don't interfere with trigger mechanics
 */
export const AccordionSection: React.FC<AccordionSectionProps> = ({
  value,
  title,
  badge,
  children,
  className = ""
}) => {
  return (
    <AccordionItem value={value} className={className}>
      <AccordionTrigger className="text-md font-semibold">
        <div className="flex items-center justify-between w-full pr-4">
          <span>{title}</span>
          {badge && (
            <FeatureBadge type={badge.type}>
              {badge.text}
            </FeatureBadge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 p-2">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
