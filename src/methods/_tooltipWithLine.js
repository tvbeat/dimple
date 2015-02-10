// Source: /src/methods/_tooltipWithLine.js
/*global  $*/
dimple._tooltipWithLine = {
  timePointSelect: null,
  verticalLine: null,
  line: null,
  marker: null,
  series: null,
  activeLine: null,
  chart: null,
  xCoordinate: null,
  setActiveLine: function(d) {
      if (this.marker !== null && !this.series.lineMarkers) {
        this.marker.style('opacity', 0);
      }
      var activeId = false,
          key;

      if (d.key) {
          this.activeLine = d;
          activeId = this.activeLine.key[0];
          if (typeof activeId === "string" && activeId.indexOf(' ') > 0) {
              key = activeId.replace(/\s/g, '-');
          } else {
              key = activeId;
          }
          if (!this.series.lineMarkers) {
            this.marker = this.chart.svg.select('circle.dimple-marker.dimple-' + key);
          }
      } else {
          this.activeLine = {};
      }

      this.chart.svg.selectAll('path.dimple-line')
        .classed('active', false)
        .filter(function() { return this.id === activeId.toString(); })
        .classed('active', true);
  },
  init: function(chart, series, drawMarkers) {
    this.chart = chart;
    this.series = series;
    this.drawMarkers = drawMarkers;

    this.initMouseEvents();
    this.initVerticalLine();
    this.initxCoordinate();
  },
  initMouseEvents: function() {
    this.chart.svg
      .on('mousemove', null)
      .on('mouseleave', null);

    this.chart.svg
      .on('mousemove', this.show.bind(this))
      .on('mouseleave', this.hide.bind(this));
  },
  initVerticalLine: function() {
    // clear selected time point
    if (this.chart.timePointSelectable && this.chart.series[0].clearTimePoints) {
      dimple._timePoint.deselect.bind(dimple._timePoint)
      this.chart.series[0].clearTimePoints = false;
    }

    if (this.chart.svg.selectAll('.verticalLine')[0].length === 0) {
      // time point selection box
      dimple._tooltipWithLine.verticalLine = null
      if (this.chart.timePointSelectable) {
        // create vertical line with time point select
        this.timePointSelect = dimple._timePoint.create.bind(dimple._timePoint)(this.chart, this.series, dimple._timePoint.select, -16, '+', 'timePointSelect', 0, this.drawMarkers.bind(dimple.plot.line));
      } else {
        // create only vertical line
        dimple._timePoint.create.bind(dimple._timePoint)(this.chart, this.series, dimple._timePoint.select, -16, '+', 'timePointSelect', 0, this.drawMarkers.bind(dimple.plot.line), true);
      }
    } else {
      this.verticalLine = this.chart.svg.select('.verticalLine');
      if (this.chart.timePointSelectable) {
          this.timePointSelect = this.chart.svg.select('.timePointSelect');
      }
    }
  },
  initxCoordinate: function() {
    if (this.chart.svg.select('g.timePointSelect.remove')[0][0] !== null) {
      i = this.chart.svg.select('g.timePointSelect.remove').attr('data-i');
      this.xCoordinate = this.chart.lineData[0].points[i].x;
    }
  },
  show: function () {
    if (this.chart.lineData && this.chart.lineData.length === 0) {
        return;
    }

    var x0,
        i,
        line,
        d0,
        d1,
        d,
        pos;

    if (this.activeLine && this.activeLine.keyString) {
        this.line = this.activeLine;
    } else {
        this.line = this.chart.lineData[0];
    }

    x0 = this.series.x._scale.invert(d3.mouse(this.chart.svg[0][0])[0]);
    i  = dimple._helpers.bisectDate()(this.line.data, x0, 1);

    if (i === 0) {
        d = this.line.data[i];
    } else if (i >= this.line.data.length) {
        i = this.line.data.length - 1;
        d = this.line.data[i];
    } else {
        d0 = this.line.data[i - 1];
        d1 = this.line.data[i];

        if (x0 - d0.cx > d1.cx - x0) {
            d = d1;
        } else {
            d = d0;
            i--;
        }
    }
    this.xCoordinate = this.series.x._scale(d.cx) + 1;

    if (this.activeLine && this.activeLine.keyString) {
        pos = d3.mouse(this.chart.svg[0][0]);
        pos[0] += 40;
        if (!($('div.tooltip:visible').length > 0)) {
            dimple._showPointTooltip(d, null, this.chart, this.series, pos);
        }
        this.updatePosition(pos);
        // show marker
        if (this.marker !== null) {
            this.marker
                .attr("cx", this.activeLine.points[i].x)
                .attr("cy", this.activeLine.points[i].y)
                .style('opacity', 1);
        }

        this.xCoordinate = this.activeLine.points[i].x + 1;
    }

    if (this.verticalLine) {
        this.verticalLine
          .style("transform", "translate(" + this.xCoordinate + "px,0px)")
          .attr('data-i', i);
    }

    if (this.timePointSelect) {
        this.timePointSelect.style("transform", "translate(" + (this.xCoordinate - 9) + "px,0px)");
    }
  },
  //hideTooltipWithLine
  hide: function(e) {
      if (!e && window.event) {
          e = event;
      }
      var goingto = e.relatedTarget || event.toElement,
          pos;

      //unless target leave is tooltip
      if ($('div.chart-tooltip:visible').has(goingto).length === 0) {
          dimple._removeTooltip(null, null, this.chart, this.series);
          this.activeLine = null;
          this.chart.svg.selectAll('path.dimple-line').classed('active', false);
          // setActiveLine(false);
          if (this.verticalLine) {
              this.verticalLine.style("transform", "translate(-1px,0px)");
          }
          if (this.timePointSelect) {
              this.timePointSelect.style("transform", "translate(-16px,0px)");
          }
          if (this.marker && !this.series.lineMarkers) {
              this.marker.style('opacity', 0);
          }
      } else {
          pos = d3.mouse(this.chart.svg[0][0]);
          pos[0] += d3.mouse($('div.chart-tooltip:visible')[0])[0];
          this.updatePosition(pos);
      }
  },
  //updateTooltipPosition
  updatePosition: function(pos) {
      var updatePosition;
      if (this.series.updateTooltipPosition) {
        updatePosition = this.series.updateTooltipPosition.bind(this.series);
      } else {
        updatePosition = function(x) { return x; };
      }
      return updatePosition(pos)
  }
}