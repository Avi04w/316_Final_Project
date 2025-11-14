/**
 * DataManager - Handles all data loading and indexing operations
 * Manages track data, Billboard charts, and PCA loadings
 */
export class DataManager {
    // Supergenre order and color scale (matching globalization viz)
    static SUPERGENRE_ORDER = [
        "Pop",
        "Hip-Hop/Rap",
        "Rock/Metal",
        "Electronic/Dance",
        "R&B/Soul/Funk",
        "Country/Folk/Americana",
        "Latin",
        "Reggae/Caribbean",
        "Jazz/Blues",
        "Other/Unknown",
    ];
    
    static SUPERGENRE_COLORS = {
        "Pop": "#4e79a7",
        "Hip-Hop/Rap": "#f28e2c",
        "Rock/Metal": "#e15759",
        "Electronic/Dance": "#76b7b2",
        "R&B/Soul/Funk": "#59a14f",
        "Country/Folk/Americana": "#edc949",
        "Latin": "#af7aa1",
        "Reggae/Caribbean": "#ff9da7",
        "Jazz/Blues": "#9c755f",
        "Other/Unknown": "#bab0ab",
    };

    constructor(dataUrl) {
        this.dataUrl = dataUrl;
        
        // Track data
        this.parsedData = [];
        this.allGenres = [];
        
        // Billboard data
        this.billboardData = [];
        this.availableYears = [];
        this.availableWeeks = [];
        this.billboardByWeek = new Map();
        this.billboardByYear = new Map();
        
        // PCA data
        this.loadingVectors = null;
    }

    /**
     * Load all data sources
     * @returns {Promise<void>}
     */
    async loadAllData() {
        await Promise.all([
            this.loadTrackData(),
            this.loadBillboardData(),
            this.loadPCALoadings()
        ]);
    }

    /**
     * Load and parse track NDJSON data
     * @returns {Promise<void>}
     */
    async loadTrackData() {
        const response = await fetch(this.dataUrl);
        const text = await response.text();
        
        this.parsedData = text.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => JSON.parse(line));

        console.log(`Loaded ${this.parsedData.length} data points`);
        
        if (this.parsedData.length > 0) {
            console.log('Sample data point:', this.parsedData[0]);
        }
        
        // Extract all unique genres
        this.extractGenres();
    }

    /**
     * Extract all unique supergenres from the dataset with counts
     * @private
     */
    extractGenres() {
        const supergenreCounts = {};
        this.parsedData.forEach(track => {
            if (track.genres) {
                const genres = Array.isArray(track.genres) ? track.genres : [track.genres];
                // Map all raw genres to supergenres and count unique supergenres per track
                const trackSupergenres = new Set();
                genres.forEach(genre => {
                    if (genre && genre.trim()) {
                        const supergenre = this.toSuperGenre(genre.trim());
                        trackSupergenres.add(supergenre);
                    }
                });
                // Increment count for each unique supergenre
                trackSupergenres.forEach(supergenre => {
                    supergenreCounts[supergenre] = (supergenreCounts[supergenre] || 0) + 1;
                });
            }
        });
        
        // Store supergenres with counts, sorted by predefined order
        this.allGenres = DataManager.SUPERGENRE_ORDER.map(supergenre => ({
            genre: supergenre,
            count: supergenreCounts[supergenre] || 0
        })).filter(g => g.count > 0);
        
        console.log(`Found ${this.allGenres.length} unique supergenres`);
        console.log('Supergenre distribution:', this.allGenres);
    }

    /**
     * Map a raw genre to a supergenre category
     * @param {string} genre - Raw genre string
     * @returns {string} Supergenre category
     */
    toSuperGenre(genre) {
        const s = (genre || "Unknown").toLowerCase();
        if (
            s.includes("hip hop") ||
            s.includes("rap") ||
            s.includes("drill") ||
            s.includes("trap") ||
            s.includes("grime")
        ) {
            return "Hip-Hop/Rap";
        }
        if (
            s.includes("rock") ||
            s.includes("metal") ||
            s.includes("punk") ||
            s.includes("grunge") ||
            s.includes("emo")
        ) {
            return "Rock/Metal";
        }
        if (
            s.includes("edm") ||
            s.includes("electro") ||
            s.includes("house") ||
            s.includes("trance") ||
            s.includes("techno") ||
            s.includes("dance") ||
            s.includes("dubstep") ||
            s.includes("euro")
        ) {
            return "Electronic/Dance";
        }
        if (
            s.includes("r&b") ||
            s.includes("soul") ||
            s.includes("motown") ||
            s.includes("funk") ||
            s.includes("quiet storm")
        ) {
            return "R&B/Soul/Funk";
        }
        if (
            s.includes("country") ||
            s.includes("americana") ||
            s.includes("bluegrass") ||
            s.includes("folk")
        ) {
            return "Country/Folk/Americana";
        }
        if (
            s.includes("latin") ||
            s.includes("reggaeton") ||
            s.includes("bachata") ||
            s.includes("merengue") ||
            s.includes("cumbia") ||
            s.includes("vallenato") ||
            s.includes("español")
        ) {
            return "Latin";
        }
        if (
            s.includes("reggae") ||
            s.includes("dancehall") ||
            s.includes("soca") ||
            s.includes("calypso") ||
            s.includes("ragga")
        ) {
            return "Reggae/Caribbean";
        }
        if (s.includes("jazz") || s.includes("swing") || s.includes("bossa")) {
            return "Jazz/Blues";
        }
        if (s.includes("pop")) {
            return "Pop";
        }
        return "Other/Unknown";
    }

    /**
     * Get the supergenre for a track
     * @param {Object} track - Track object with genres property
     * @returns {string} Supergenre category
     */
    getSuperGenre(track) {
        if (!track.genres) return "Other/Unknown";
        
        const genres = Array.isArray(track.genres) ? track.genres : [track.genres];
        
        // Return the first valid supergenre found
        for (const genre of genres) {
            if (genre && genre.trim()) {
                return this.toSuperGenre(genre.trim());
            }
        }
        
        return "Other/Unknown";
    }

    /**
     * Load Billboard Hot 100 chart data
     * @returns {Promise<void>}
     */
    async loadBillboardData() {
        try {
            const response = await fetch('data/processed/billboard.ndjson');
            const text = await response.text();
            
            this.billboardData = text.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => JSON.parse(line));

            // Sort by date for efficient filtering
            this.billboardData.sort((a, b) => a.date.localeCompare(b.date));

            console.log(`Loaded ${this.billboardData.length} Billboard chart entries`);
            
            // Filter to 1980 onwards
            this.billboardData = this.billboardData.filter(entry => 
                new Date(entry.date).getFullYear() >= 1980
            );
            
            console.log(`Filtered to ${this.billboardData.length} entries from 1980+`);
            
            // Extract unique years from dates
            const yearSet = new Set(this.billboardData.map(entry => {
                return new Date(entry.date).getFullYear();
            }));
            this.availableYears = Array.from(yearSet).sort((a, b) => b - a); // Most recent first
            
            console.log(`Found ${this.availableYears.length} unique years in Billboard data`);
            
            // Extract unique weeks sorted chronologically
            const weekSet = new Set(this.billboardData.map(entry => entry.date));
            this.availableWeeks = Array.from(weekSet).sort(); // Already sorted
            console.log(`Found ${this.availableWeeks.length} unique weeks in Billboard data`);
            
            // Create indexed data structures for faster lookups
            this.createBillboardIndexes();
        } catch (error) {
            console.error('Error loading Billboard data:', error);
        }
    }

    /**
     * Create indexed data structures for faster Billboard lookups
     * @private
     */
    createBillboardIndexes() {
        // Index by week for O(1) lookups
        this.billboardByWeek = new Map();
        this.billboardData.forEach(entry => {
            if (!this.billboardByWeek.has(entry.date)) {
                this.billboardByWeek.set(entry.date, new Map());
            }
            this.billboardByWeek.get(entry.date).set(entry.id, entry.rank);
        });
        
        // Index by year for faster yearly aggregation
        this.billboardByYear = new Map();
        this.billboardData.forEach(entry => {
            const year = new Date(entry.date).getFullYear();
            if (!this.billboardByYear.has(year)) {
                this.billboardByYear.set(year, new Map());
            }
            const yearData = this.billboardByYear.get(year);
            const currentBest = yearData.get(entry.id);
            if (currentBest === undefined || entry.rank < currentBest) {
                yearData.set(entry.id, entry.rank);
            }
        });
        
        console.log('Created Billboard indexes for fast lookups');
    }

    /**
     * Load PCA loading vectors from CSV
     * @returns {Promise<void>}
     */
    async loadPCALoadings() {
        try {
            const response = await fetch('data/processed/spotify_track_pca_loadings.csv');
            const text = await response.text();
            
            // Parse CSV
            const lines = text.trim().split('\n');
            const headers = lines[0].split(',').slice(1); // Skip first empty column
            
            this.loadingVectors = {};
            
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',');
                const featureName = parts[0];
                const pc0 = parseFloat(parts[1]);
                const pc1 = parseFloat(parts[2]);
                const pc2 = parseFloat(parts[3]);
                
                this.loadingVectors[featureName] = { pc0, pc1, pc2 };
            }
            
            console.log('Loaded PCA loading vectors:', this.loadingVectors);
        } catch (error) {
            console.error('Error loading PCA loadings:', error);
        }
    }

    /**
     * Get all track data
     * @returns {Array<Object>} Array of track objects
     */
    getTrackData() {
        return this.parsedData;
    }

    /**
     * Get all genres with counts
     * @returns {Array<{genre: string, count: number}>} Sorted genres
     */
    getAllGenres() {
        return this.allGenres;
    }

    /**
     * Get Billboard peak rankings for a specific year
     * @param {number|string} year - Year to get rankings for
     * @returns {Map<string, number>} Map of track IDs to best rankings
     */
    getBillboardPeakRankingsForYear(year) {
        return this.billboardByYear.get(parseInt(year)) || new Map();
    }

    /**
     * Get Billboard rankings for a rolling 1-year window starting from a specific week
     * @param {string} targetWeek - Start week (YYYY-MM-DD format)
     * @returns {Map<string, number>} Map of track IDs to best rankings in the following year
     */
    getBillboardRankingsUpToWeek(targetWeek) {
        const endDate = new Date(targetWeek);
        endDate.setFullYear(endDate.getFullYear() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const rankings = new Map();
        
        // Binary search to find start index
        let startIdx = this.binarySearchWeek(targetWeek);
        if (startIdx === -1) return rankings;
        
        // Iterate from start until we exceed the end date
        for (let i = startIdx; i < this.billboardData.length; i++) {
            const entry = this.billboardData[i];
            if (entry.date >= endDateStr) break;
            
            const currentBest = rankings.get(entry.id);
            if (currentBest === undefined || entry.rank < currentBest) {
                rankings.set(entry.id, entry.rank);
            }
        }
        
        return rankings;
    }

    /**
     * Binary search to find the starting index for a given week
     * @param {string} targetWeek - Target week (YYYY-MM-DD format)
     * @returns {number} Index or -1 if not found
     * @private
     */
    binarySearchWeek(targetWeek) {
        let left = 0;
        let right = this.billboardData.length - 1;
        let result = -1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midDate = this.billboardData[mid].date;
            
            if (midDate < targetWeek) {
                left = mid + 1;
            } else {
                result = mid;
                right = mid - 1;
            }
        }
        
        return result;
    }

    /**
     * Get available years in Billboard data
     * @returns {Array<number>} Sorted years (most recent first)
     */
    getAvailableYears() {
        return this.availableYears;
    }

    /**
     * Get available weeks in Billboard data
     * @returns {Array<string>} Sorted weeks (chronological)
     */
    getAvailableWeeks() {
        return this.availableWeeks;
    }

    /**
     * Get PCA loading vectors
     * @returns {Object} Loading vectors by feature name
     */
    getPCALoadings() {
        return this.loadingVectors;
    }

    /**
     * Get supergenre order
     * @returns {Array<string>} Ordered array of supergenre names
     */
    getSuperGenreOrder() {
        return DataManager.SUPERGENRE_ORDER;
    }

    /**
     * Get supergenre colors
     * @returns {Object} Map of supergenre names to color hex codes
     */
    getSuperGenreColors() {
        return DataManager.SUPERGENRE_COLORS;
    }
}
