const axios = require('axios');

class NeoxrAPI {
    constructor() {
        this.baseURL = process.env.NEOXR_API_URL || 'https://api.neoxr.my.id/api';
        this.apiKey = process.env.NEOXR_API_KEY || '';
    }

    async request(endpoint, params = {}) {
        try {
            const response = await axios.get(`${this.baseURL}${endpoint}`, {
                params: {
                    ...params,
                    apikey: this.apiKey
                },
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            console.error(`Neoxr API Error [${endpoint}]:`, error.message);
            return {
                status: false,
                message: error.message
            };
        }
    }

    // Facebook downloader
    async facebook(url) {
        return await this.request('/fb', { url });
    }

    // Instagram downloader
    async instagram(url) {
        return await this.request('/ig', { url });
    }

    // TikTok downloader
    async tiktok(url) {
        return await this.request('/tiktok', { url });
    }

    // YouTube downloader
    async youtube(url, type = 'audio', quality = '128kbps') {
        return await this.request('/youtube', { url, type, quality });
    }

    // YouTube search and play
    async play(query) {
        return await this.request('/play', { q: query });
    }

    // YouTube video search
    async video(query) {
        return await this.request('/video', { q: query });
    }

    // Twitter downloader
    async twitter(url) {
        return await this.request('/twitter', { url });
    }

    // Pinterest downloader
    async pinterest(url) {
        return await this.request('/pin', { url });
    }

    // Pinterest search
    async pinterestSearch(query) {
        return await this.request('/pinterest', { q: query });
    }

    // Spotify downloader
    async spotify(url) {
        return await this.request('/spotify', { url });
    }

    // Threads downloader
    async threads(url) {
        return await this.request('/threads', { url });
    }

    // Terabox downloader
    async terabox(url) {
        return await this.request('/terabox', { url });
    }
}

module.exports = new NeoxrAPI();