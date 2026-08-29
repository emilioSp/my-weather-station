type WeatherStationErrorProps = {
  message: string;
};

export const WeatherStationLoading = () => (
  <main className="grid min-h-screen place-items-center px-5 text-sm text-[#9bad9e]">
    Loading current readings...
  </main>
);

export const WeatherStationError = ({ message }: WeatherStationErrorProps) => (
  <main className="grid min-h-screen place-items-center px-5 text-center">
    <div>
      <h1 className="text-lg font-bold">Unable to load weather station</h1>
      <p className="mt-2 text-sm text-[#9bad9e]">{message}</p>
    </div>
  </main>
);
