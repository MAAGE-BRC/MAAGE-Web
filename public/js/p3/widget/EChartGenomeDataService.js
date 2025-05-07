define([
    'dojo/_base/declare',
    'dojo/Evented',
    'dojo/request',
    'dojo/_base/lang'
], function (declare, Evented, request, lang) {
    return declare([Evented], {
        _cache: {},
        _pendingRequests: {},
        maxBatchSize: 300,

        getGenomeCollectionData: function (genomeIds) {
            const cacheKey = genomeIds.sort().join(',');

            if (this._cache[cacheKey]) {
                return Promise.resolve(this._cache[cacheKey]);
            }

            if (this._pendingRequests[cacheKey]) {
                return this._pendingRequests[cacheKey];
            }

            const chunks = [];
            for (let i = 0; i < genomeIds.length; i += this.maxBatchSize) {
                chunks.push(genomeIds.slice(i, i + this.maxBatchSize));
            }

            const batchPromises = chunks.map(chunk => {
                const query = `in(genome_id,(${chunk.join(',')}))&select(genome_id,collection_date,collection_year)`;
                return request.post('https://www.bv-brc.org/api/genome/', {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
                    },
                    data: query,
                    handleAs: 'json'
                });
            });

            const resultPromise = Promise.all(batchPromises)
                .then(responses => {

                    const combinedData = [].concat(...responses);

                    const result = this._processData(combinedData);

                    this._cache[cacheKey] = result;
                    delete this._pendingRequests[cacheKey];

                    return result;
                })
                .catch(err => {
                    delete this._pendingRequests[cacheKey];
                    throw err;
                });

            this._pendingRequests[cacheKey] = resultPromise;
            return resultPromise;
        },

        getFacetData: function (genomeIds, field) {
            const cacheKey = `facet_${field}_${genomeIds.sort().join(',')}`;

            if (this._cache[cacheKey]) {
                return Promise.resolve(this._cache[cacheKey]);
            }

            if (this._pendingRequests[cacheKey]) {
                return this._pendingRequests[cacheKey];
            }

            const chunks = [];
            for (let i = 0; i < genomeIds.length; i += this.maxBatchSize) {
                chunks.push(genomeIds.slice(i, i + this.maxBatchSize));
            }

            const batchPromises = chunks.map(chunk => {
                const query = `in(genome_id,(${chunk.join(',')}))&facet((field,${field}),(mincount,1),(limit,100))&limit(0)`;
                return request.post('https://www.bv-brc.org/api/genome/', {
                    headers: {
                        'Accept': 'application/solr+json',
                        'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
                    },
                    data: query,
                    handleAs: 'json'
                });
            });

            const resultPromise = Promise.all(batchPromises)
                .then(responses => {

                    const facetData = {};
                    responses.forEach(response => {
                        const facetFields = response.facet_counts?.facet_fields?.[field] || {};
                        Object.entries(facetFields).forEach(([key, count]) => {
                            facetData[key] = (facetData[key] || 0) + count;
                        });
                    });

                    this._cache[cacheKey] = facetData;
                    delete this._pendingRequests[cacheKey];

                    return facetData;
                })
                .catch(err => {
                    delete this._pendingRequests[cacheKey];
                    throw err;
                });

            this._pendingRequests[cacheKey] = resultPromise;
            return resultPromise;
        },

        _processData: function (data) {

            const yearCounts = {};
            data.forEach(genome => {
                if (genome.collection_year) {
                    yearCounts[genome.collection_year] = (yearCounts[genome.collection_year] || 0) + 1;
                }
            });

            const yearData = Object.entries(yearCounts)
                .map(([year, count]) => ({ year, count }))
                .sort((a, b) => a.year - b.year);

            const monthCounts = Array(12).fill(0);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            data.forEach(genome => {
                if (genome.collection_date) {
                    let month = null;

                    if (genome.collection_date.includes('-')) {
                        const parts = genome.collection_date.split('-');
                        if (parts.length >= 2) {
                            month = parseInt(parts[1], 10);
                        }
                    } else if (genome.collection_date.includes('/')) {
                        const parts = genome.collection_date.split('/');
                        if (parts.length >= 3) {
                            month = parseInt(parts[0], 10);
                        }
                    }

                    if (month && month >= 1 && month <= 12) {
                        monthCounts[month - 1]++;
                    }
                }
            });

            const monthData = monthNames.map((name, index) => ({
                month: name,
                count: monthCounts[index]
            }));

            const dateMap = new Map();

            data.forEach(genome => {
                if (genome.collection_date) {
                    let dateStr = genome.collection_date;

                    try {
                        if (dateStr.includes('/')) {
                            const parts = dateStr.split('/');
                            if (parts.length === 3) {
                                dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                            }
                        }

                        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

                        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
                    } catch (e) {
                        console.warn('Could not parse date:', dateStr);
                    }
                }
            });

            const dateData = Array.from(dateMap.entries())
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date));

            return {
                yearData,
                monthData,
                dateData,
                rawData: data
            };
        },

        clearCache: function () {
            this._cache = {};
        }
    });
});