import * as FileSystem from 'expo-file-system';

function hashString(input: string): string {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		hash = (hash << 5) - hash + input.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash).toString(36);
}

const CACHE_DIR = `${FileSystem.cacheDirectory}menu_images/`;

export class ImageCacheService {
	private initialized: boolean = false;

	private async ensureDir(): Promise<void> {
		if (this.initialized) return;
		try {
			await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
		} catch {}
		this.initialized = true;
	}

	async getCachedUri(remoteUrl?: string | null): Promise<string | undefined> {
		if (!remoteUrl || remoteUrl.startsWith('file://')) return remoteUrl || undefined;
		await this.ensureDir();
		const extMatch = remoteUrl.match(/\.(png|jpg|jpeg|webp|gif)(?:\?|#|$)/i);
		const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '.img';
		const filename = `${hashString(remoteUrl)}${ext}`;
		const localPath = `${CACHE_DIR}${filename}`;
		try {
			const info = await FileSystem.getInfoAsync(localPath);
			if (info.exists) return localPath;
			const result = await FileSystem.downloadAsync(remoteUrl, localPath);
			return result?.uri || undefined;
		} catch (e) {
			return undefined;
		}
	}

	async primeCache(urls: Array<string | undefined | null>): Promise<Record<string, string>> {
		const map: Record<string, string> = {};
		const tasks = (urls || [])
			.filter((u): u is string => !!u && typeof u === 'string')
			.map(async (u) => {
				const local = await this.getCachedUri(u);
				if (local) map[u] = local;
			});
		await Promise.all(tasks);
		return map;
	}
}

export const imageCacheService = new ImageCacheService();



