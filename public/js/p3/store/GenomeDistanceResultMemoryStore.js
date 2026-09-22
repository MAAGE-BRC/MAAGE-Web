define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/Stateful', 'dojo/when', 'dojo/topic',
  './P3MemoryStore'
], function (
  declare, lang, Deferred,
  request, Stateful, when, Topic,
  Memory
) {

  return declare([Memory, Stateful], {

    // Index of max_hits in the Minhash.compute_genome_distance_for_{genome2,fasta2}
    // params array: [target, max_pvalue, max_distance, max_hits, ...]
    MAX_HITS_PARAM: 3,
    OVER_REQUEST_FACTOR: 3,
    MAX_HITS_CEILING: 1500,

    _requestedHits: function (q) {
      var hits = q && q.params && q.params[this.MAX_HITS_PARAM];
      return (typeof hits === 'number' && hits > 0) ? hits : null;
    },

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      // console.log("onSetState", state, this);
      this.reload();
    },

    constructor: function (options) {
      this._loaded = false;
      this.topicId = options.topicId;

      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    reload: function () {
      delete this._loadingDeferred;
      this._loaded = false;
      this.loadData();
      this.set('refresh');
    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      if (!this.state) {
        // console.log("No state, use empty data set for initial store");

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(this, function () {
          this.setData([]);
          this._loaded = true;
          // def.resolve(true);
        }), 0);
        return def.promise;
      }

      var q = lang.mixin(this.state.query, {
        version: '1.1',
        id: String(Math.random()).slice(2)
      });

      // The distance service has no deprecated-genome filter, so some of what
      // it returns is dropped by the metadata query below. Over-request so the
      // filtered result can still reach the user's requested count, then trim.
      // Remove once the service filters server-side.
      var requestedHits = this._requestedHits(q);
      if (requestedHits) {
        q.params = q.params.slice();
        q.params[this.MAX_HITS_PARAM] = Math.min(
          requestedHits * this.OVER_REQUEST_FACTOR,
          this.MAX_HITS_CEILING
        );
      }

      this._loadingDeferred = when(request.post(window.App.genomedistanceServiceURL, {
        headers: {
          Authorization: (window.App.authorizationToken || ''),
          Accept: 'application/json'
        },
        handleAs: 'json',
        data: JSON.stringify(q)
      }), lang.hitch(this, function (res) {

        if ((res.result[0]).length == 0) {
          this.setData([]);
          this._loaded = true;
          Topic.publish('GenomeDistance_UI', 'showNoResultMessage');
          Topic.publish(this.topicId, 'hideLoadingMask');
          return;
        }

        var genomeIds = [];
        var serviceResult = res.result[0].map(function (d) {
          genomeIds.push(d[0]);
          return {
            genome_id: d[0],
            distance: d[1],
            pvalue: d[2],
            counts: d[3]
          };
        });

        var query = {
          rows: 25000,
          q: 'genome_id:(' + genomeIds.join(' OR ') + ')',
          fq: 'NOT genome_status:Deprecated'
        };

        // console.log("resultIds:", genomeIds, "query:", query);

        return when(request.post(window.App.dataAPI + this.type + '/', {
          handleAs: 'json',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/solrquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          data: query
        }), lang.hitch(this, function (res) {

          var keyMap = {};
          res.forEach(function (f) {
            keyMap[f.genome_id] = f;
          }, this);

          // console.log(JSON.stringify(res));
          // The metadata query filters out deprecated genomes, so it can return
          // fewer rows than the distance service did. Drop the unmatched ones
          // rather than mixing in undefined and rendering empty cells.
          var data = serviceResult.filter(function (row) {
            return keyMap[row.genome_id];
          }).map(function (row) {
            return lang.mixin({}, row, keyMap[row.genome_id]);
          });

          // Trim the over-requested surplus back to what the user asked for.
          // serviceResult preserves the service's distance ordering, so this
          // keeps the closest matches.
          if (requestedHits && data.length > requestedHits) {
            data = data.slice(0, requestedHits);
          }
          // console.log(data);

          this.setData(data);
          this._loaded = true;

          if (data.length === 0) {
            Topic.publish('GenomeDistance_UI', 'showNoResultMessage');
          }

          Topic.publish(this.topicId, 'hideLoadingMask');
        }));

      }), lang.hitch(this, function (err) {
        this.setData([]);
        this._loaded = true;
        Topic.publish('GenomeDistance_UI', 'showErrorMessage', err);
        Topic.publish(this.topicId, 'hideLoadingMask');
      }));

      return this._loadingDeferred;
    }
  });
});
