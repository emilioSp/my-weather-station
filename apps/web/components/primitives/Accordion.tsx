import * as React from 'react';
import { FaChevronDown } from 'react-icons/fa6';

type AccordionProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
  title: React.ReactNode;
};

export const Accordion = ({
  children,
  defaultOpen = false,
  title,
}: AccordionProps) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <section className="rounded-2xl border border-[#2b3a38] bg-[#15201f]">
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-4 p-5 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83d2e5] sm:p-[23px]"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {title}
        <FaChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        id={contentId}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
};
