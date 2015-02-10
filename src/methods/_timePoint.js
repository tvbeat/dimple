    // Source: /src/methods/_timePoint.js
    /*global  $*/
    dimple._timePoint = {
        selectedLine : null,
        timePointRemove: null,
        chart : null,
        series: null,
        grid: null,
        xAxis: null,
        create: function(chart, series, onClick, xPos, sign, className, i, drawMarkers, onlyVerticalLine) {
            var g,
                group;

          g = chart.svg.select('g');
          this.chart       = chart;
          this.series      = series;
          this.drawMarkers = drawMarkers;

          if (this.grid === null) {
            this.grid  = g.node().getBBox();
            this.xAxis = this.chart.svg.select('g.dimple-axis').node().getBBox();
          }

          if (dimple._tooltipWithLine.verticalLine === null) {
            dimple._tooltipWithLine.verticalLine = g.insert("line", ":first-child")
              .attr({
                  'x1': -1,
                  'y1': this.grid.y + (typeof this.chart.y === 'number' ? this.chart.y : 30) - (this.chart.timePointSelectable ? 18 : 0),
                  'x2': -1,
                  'y2': this.grid.height - this.xAxis.height
              })
              .attr('stroke', 'lightgray')
              .attr('class', 'verticalLine');
          }
          if (onlyVerticalLine) {
            return;
          }
          group = this.chart.svg.select('g').append('g');
          group.attr('class', className)
              .on('click', onClick.bind(this))
              .style('transform', "translate(" + xPos + "px, 0px)")
              .attr('data-i', i);

          group.append('rect')
              .attr('width', '16')
              .attr('height', '16')
              .attr('fill', '#666666')
              .attr('style', 'cursor: pointer;');

          group.append('text')
              .attr({
                  'x': 8,
                  'y': 12
              })
              .attr('style', 'cursor: pointer;text-anchor: middle; font-family: sans-serif; font-size: 13px;')
              .attr('fill', 'white')
              .text(sign);

          return group;
        },
        deselect: function() {
          this.chart.svg.selectAll('path.dimple-line').classed('grayed', false);
          this.chart.svg.selectAll('circle.dimple-marker').classed('grayed', false);
          if (d3.select('.timePointSelect.remove').node()) {
            if (typeof this.series.setTimePoint === 'function') {
              this.series.setTimePoint(null);
            }
          }

          if (this.timePointRemove) {
            this.timePointRemove.remove();
            this.timePointRemove = null;
          }
          if (this.selectedLine) {
            this.selectedLine.remove();
            this.selectedLine = null;
          }
          if (!this.series.lineMarkers) {
            this.chart.svg.selectAll('circle.dimple-marker')
              .style('opacity', 0);
          }
        },
        select: function() {
            // clear currently selected point
            this.deselect();
            if (!d3.select('.timePointSelect.remove').node()) {
                var i = dimple._tooltipWithLine.verticalLine.attr('data-i'),
                    xCoordinate = this.chart.lineData[0].points[i].x,
                    marker = null,
                    allMarkers = null,
                    this_ = this;

                // show points for every line
                this.chart.lineData.forEach(function(item, i) {
                    var x0 = this_.series.x._scale.invert(xCoordinate),
                        j = dimple._helpers.bisectDate()(this_.chart.lineData[i].data, x0, 1),
                        d0 = item.data[parseInt(j, 10) - 1],
                        d1 = item.data[parseInt(j, 10)],
                        d,
                        key = item.keyString.replace(/\s/g, '-');

                    if (d0 === undefined || d1 === undefined) {
                        return;
                    }

                    if (x0 - d0.cx > d1.cx - x0) {
                        d = d1;
                    } else {
                        d = d0;
                        j = parseInt(j, 10) - 1;
                    }
                    // always keep first item for tooltip
                    if (!this_.series.lineMarkers) {
                      item.markerData = [item.data[0], d];
                      this_.drawMarkers(item)
                      this_.chart.svg.selectAll('circle.dimple-marker.' + key).style('opacity', 1);
                      this_.chart.svg.select('circle.dimple-marker.' + key).style('opacity', 0);
                    } else {
                      allMarkers = this_.chart.svg.selectAll('circle.dimple-marker.' + key);
                      allMarkers.classed('grayed', true);
                      allMarkers.filter(function(marker, i) {
                        return i === j;
                      }).classed('grayed', false);
                    }
                });

                this.chart.svg.selectAll('path.dimple-line').classed('grayed', true);
                //vertical line
                this.selectedLine = this.chart.svg.select('svg > g').insert("line", ":first-child")
                    .attr({
                        'x1': xCoordinate,
                        'y1': 16,
                        'x2': xCoordinate,
                        'y2': this.grid.height - this.xAxis.height
                    })
                    .attr('stroke', 'lightgray')
                    .attr('class', 'selected');

                // box for removing selected time point
                this.timePointRemove = this.create(this.chart, this.series, this.deselect, (xCoordinate - 8), 'x', 'timePointSelect remove', i, this.drawMarkers);
                this.series.setTimePoint(this.chart.lineData[0].data[i].origData['time.interval']);
            }
        }
      }