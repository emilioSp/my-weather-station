type ProgressBarProps = {
  value: number;
};

export const ProgressBar = ({ value }: ProgressBarProps) => (
  <span className="ml-2 inline-block h-1.5 w-16 overflow-hidden rounded-full bg-[#2c3735] align-middle">
    <span
      className="block h-full rounded-full bg-[#b9e53b]"
      style={{ width: `${value}%` }}
    />
  </span>
);
