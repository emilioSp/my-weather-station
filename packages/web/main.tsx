// Mount the weather dashboard when the browser application starts.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { WeatherStation } from '#views/WeatherStation.tsx';

import '#styles.css';

function assertRootElement(element: HTMLElement | null): asserts element is HTMLElement {
  if (element === null) throw new Error('Root element not found');
}

const rootElement = document.getElementById('root');

assertRootElement(rootElement);

createRoot(rootElement).render(
  <StrictMode>
    <WeatherStation />
  </StrictMode>,
);
