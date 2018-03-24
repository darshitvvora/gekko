const log = require('../core/log');
const _ = require('lodash');
const util = require('../core/util.js');
const config = util.getConfig();
const moment = require('moment');
const fs = require('fs');

var Actor = function() {
  this.performanceReport;
  this.roundtrips = [];
  this.stratUpdates = [];

  if(!config.backtestResultExporter.data.stratUpdates)
    this.processStratUpdate = _.noop;

  if(!config.backtestResultExporter.data.roundtrips)
    this.processRoundtrip = _.noop;

  _.bindAll(this);
}

Actor.prototype.processRoundtrip = function(roundtrip) {
  this.roundtrips.push({
    ...roundtrip,
    entryAt: roundtrip.entryAt.unix(),
    exitAt: roundtrip.exitAt.unix()
  });
};

Actor.prototype.processStratUpdate = function(stratUpdate) {
  this.stratUpdates.push({
    ...stratUpdate,
    date: stratUpdate.date.unix()
  });
}

Actor.prototype.processPerformanceReport = function(performanceReport) {
  this.performanceReport = performanceReport;
}

Actor.prototype.finalize = function(done) {
  const backtest = {
    performanceReport: this.performanceReport
  };

  if(config.backtestResultExporter.data.stratUpdates)
    backtest.stratUpdates = this.stratUpdates;

  if(config.backtestResultExporter.data.roundtrips)
    backtest.roundtrips = this.roundtrips;

  process.send({backtest});

  if(!config.backtestResultExporter.writeToDisk)
    return done();

  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  const filename = `backtest-${config.tradingAdvisor.method}-${now}.log`;
  fs.writeFile(
    util.dirs().gekko + filename,
    JSON.stringify(backtest),
    err => {
      if(err)
        log.error('unable to write backtest result', err);

      done();
    }
  );
};

module.exports = Actor;
