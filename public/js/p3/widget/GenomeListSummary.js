define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-construct",
	"dojo/dom-class",
	"dojo/number",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dojo/text!./templates/GenomeListSummary.html",
	"p3/store/GenomeJsonRest"
], function (
	declare,
	lang,
	domConstruct,
	domClass,
	number,
	WidgetBase,
	Templated,
	Template,
	GenomeStore
) {
	return declare([WidgetBase, Templated], {
		baseClass: "GenomeListSummary",
		templateString: Template,
		state: null,
		genomeStore: null,
		
		// Summary data
		totalGenomes: 0,
		completeGenomes: 0,
		wgsGenomes: 0,
		plasmids: 0,
		uniqueGenera: 0,
		uniqueSpecies: 0,
		uniqueHosts: 0,
		dateRange: "",
		
		postCreate: function () {
			this.inherited(arguments);
			this.genomeStore = new GenomeStore({});
		},
		
		startup: function () {
			this.inherited(arguments);
			if (this.state && this.state.search) {
				this.loadSummaryData();
			}
		},
		
		set: function (name, val) {
			this.inherited(arguments);
			if (name === "state" && val && val.search) {
				this.state = val;
				if (this._started) {
					this.loadSummaryData();
				}
			}
		},
		
		loadSummaryData: function () {
			if (!this.state || !this.state.search) return;
			
			// Show loading state
			this.showLoading();
			
			const baseQuery = this.state.search;
			const queryOptions = { headers: { Accept: "application/solr+json" } };
			
			// Prepare queries for different statistics
			const queries = [
				// Total genomes count
				this.genomeStore.query(baseQuery + "&limit(1)", queryOptions),
				// Complete genomes
				this.genomeStore.query(baseQuery + "&eq(genome_status,Complete)&limit(1)", queryOptions),
				// WGS genomes  
				this.genomeStore.query(baseQuery + "&eq(genome_status,WGS)&limit(1)", queryOptions),
				// Plasmids
				this.genomeStore.query(baseQuery + "&eq(genome_status,Plasmid)&limit(1)", queryOptions),
				// Unique genera
				this.genomeStore.query(baseQuery + "&facet((field,genus),(mincount,1))&limit(0)", queryOptions),
				// Unique species
				this.genomeStore.query(baseQuery + "&facet((field,species),(mincount,1))&limit(0)", queryOptions),
				// Unique hosts
				this.genomeStore.query(baseQuery + "&facet((field,host_common_name),(mincount,1))&limit(0)", queryOptions),
				// Collection year range
				this.genomeStore.query(baseQuery + "&facet((field,collection_year),(mincount,1))&limit(0)", queryOptions)
			];
			
			Promise.all(queries).then(
				lang.hitch(this, function ([
					totalRes,
					completeRes,
					wgsRes,
					plasmidRes,
					generaRes,
					speciesRes,
					hostsRes,
					yearsRes
				]) {
					// Update counts
					this.totalGenomes = totalRes.response.numFound || 0;
					this.completeGenomes = completeRes.response.numFound || 0;
					this.wgsGenomes = wgsRes.response.numFound || 0;
					this.plasmids = plasmidRes.response.numFound || 0;
					
					// Count unique values from facets
					if (generaRes.facet_counts && generaRes.facet_counts.facet_fields.genus) {
						this.uniqueGenera = generaRes.facet_counts.facet_fields.genus.length / 2;
					}
					
					if (speciesRes.facet_counts && speciesRes.facet_counts.facet_fields.species) {
						this.uniqueSpecies = speciesRes.facet_counts.facet_fields.species.length / 2;
					}
					
					if (hostsRes.facet_counts && hostsRes.facet_counts.facet_fields.host_common_name) {
						this.uniqueHosts = hostsRes.facet_counts.facet_fields.host_common_name.length / 2;
					}
					
					// Calculate date range
					if (yearsRes.facet_counts && yearsRes.facet_counts.facet_fields.collection_year) {
						const years = [];
						const yearFacets = yearsRes.facet_counts.facet_fields.collection_year;
						for (let i = 0; i < yearFacets.length; i += 2) {
							const year = parseInt(yearFacets[i]);
							if (!isNaN(year) && year > 1900 && year < 2100) {
								years.push(year);
							}
						}
						if (years.length > 0) {
							const minYear = Math.min(...years);
							const maxYear = Math.max(...years);
							this.dateRange = minYear === maxYear ? minYear.toString() : `${minYear} - ${maxYear}`;
						} else {
							this.dateRange = "N/A";
						}
					} else {
						this.dateRange = "N/A";
					}
					
					// Update display
					this.updateDisplay();
					this.hideLoading();
				}),
				lang.hitch(this, function (err) {
					console.error("Failed to load summary data:", err);
					this.hideLoading();
				})
			);
		},
		
		updateDisplay: function () {
			// Update DOM elements with formatted numbers
			this.totalGenomesNode.innerHTML = this.formatNumber(this.totalGenomes);
			this.completeGenomesNode.innerHTML = this.formatNumber(this.completeGenomes);
			this.wgsGenomesNode.innerHTML = this.formatNumber(this.wgsGenomes);
			this.plasmidsNode.innerHTML = this.formatNumber(this.plasmids);
			this.uniqueGeneraNode.innerHTML = this.formatNumber(this.uniqueGenera);
			this.uniqueSpeciesNode.innerHTML = this.formatNumber(this.uniqueSpecies);
			this.uniqueHostsNode.innerHTML = this.formatNumber(this.uniqueHosts);
			this.dateRangeNode.innerHTML = this.dateRange;
		},
		
		formatNumber: function (num) {
			return number.format(num, { places: 0 });
		},
		
		showLoading: function () {
			domClass.remove(this.loadingNode, "hidden");
			domClass.add(this.contentNode, "hidden");
		},
		
		hideLoading: function () {
			domClass.add(this.loadingNode, "hidden");
			domClass.remove(this.contentNode, "hidden");
		}
	});
});