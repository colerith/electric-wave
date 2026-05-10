/// <reference types="vite/client" />

interface EwDailyWaveConsoleApi {
	getConfig: () => unknown;
	getConfigText: () => string;
	setConfig: (nextConfig: unknown) => unknown;
	setConfigText: (text: string) => unknown;
	resetToDefault: () => unknown;
	clearLocalOverride: () => void;
	previewToday: () => unknown;
}

interface Window {
	ewDailyWave?: EwDailyWaveConsoleApi;
}
