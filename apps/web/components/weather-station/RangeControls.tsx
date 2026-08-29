import {
  FaArrowsRotate,
  FaMagnifyingGlassMinus,
  FaMagnifyingGlassPlus,
} from 'react-icons/fa6';
import { IconButton } from '#components/primitives/IconButton.tsx';
import { type ChartRange, chartRanges } from '#weather-dashboard.util.ts';

type RangeControlsProps = {
  isLoading: boolean;
  rangeIndex: number;
  range: ChartRange;
  onRangeIndexChange: (rangeIndex: number) => void;
};

export const RangeControls = ({
  isLoading,
  rangeIndex,
  range,
  onRangeIndexChange,
}: RangeControlsProps) => (
  <div className="flex min-h-10 items-center justify-end gap-3">
    {isLoading && (
      <span className="grid size-4 place-items-center" role="status">
        <FaArrowsRotate
          aria-hidden="true"
          className="size-3.5 animate-spin text-[#83d2e5]"
        />
        <span className="sr-only">Updating charts</span>
      </span>
    )}
    <strong className="text-base">{range.label}</strong>
    <fieldset className="flex gap-1 rounded-[10px] border border-[#2b3a38] bg-[#15201f] p-1">
      <legend className="sr-only">Chart zoom</legend>
      <IconButton
        aria-label="Zoom out"
        title="Zoom out"
        disabled={rangeIndex === 0}
        onClick={() => onRangeIndexChange(rangeIndex - 1)}
      >
        <FaMagnifyingGlassMinus aria-hidden="true" className="size-5" />
      </IconButton>
      <IconButton
        aria-label="Zoom in"
        title="Zoom in"
        disabled={rangeIndex === chartRanges.length - 1}
        onClick={() => onRangeIndexChange(rangeIndex + 1)}
      >
        <FaMagnifyingGlassPlus aria-hidden="true" className="size-5" />
      </IconButton>
    </fieldset>
  </div>
);
