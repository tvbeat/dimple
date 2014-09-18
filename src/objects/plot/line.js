 // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/plot/line.js
    /*global  $*/
    dimple.plot.line = {

        // By default the values are not stacked
        stacked: false,

        // This is a grouped plot meaning many points are treated as one series value
        grouped: true,

        // The axis positions affecting the line series
        supportedAxes: ["x", "y", "c"],

        // Draw the axis
        draw: function (chart, series, duration) {
            // Get the position data
            var grid,
                xAxis,
                data = series._positionData,
                lineData = [],
                theseShapes = null,
                className = "dimple-series-" + chart.series.indexOf(series),
                firstAgg = (series.x._hasCategories() || series.y._hasCategories() ? 0 : 1),
                interpolation,
                graded = false,
                i,
                j,
                k,
                key,
                keyString,
                rowIndex,
                updated,
                removed,
                orderedSeriesArray,
                updateTooltipPosition,
                bisectDate,
                verticalLine = null,
                timePointSelect,
                timePointRemove = null,
                selectedLine = null,
                xCoordinate,
                activeLine = {},
                g,
                seriesKeys = [],
                marker = null,
                setActiveLine = function(d) {
                    if (marker !== null) {
                        marker.style('opacity', 0);
                    }
                    var activeId = false;

                    if (d.key) {
                        activeLine = d;
                        activeId = activeLine.key[0];
                        marker = chart.svg.select('circle.dimple-marker.dimple-' + activeId);
                    } else {
                        activeLine = {};
                    }

                    chart.svg.selectAll('path.dimple-line')
                        .classed('active', false)
                        .filter(function() { return this.id === activeId; })
                        .classed('active', true);
                },
                onEnter = function () {
                    return function (e, shape, chart, series) {
                        if (series.disableLineMarkers !== true) {
                            var line = chart.lineData.filter(function(line) {
                                return line.key[0] === e.aggField[0];
                            });
                            setActiveLine(line);
                        }
                    };
                },
                onLeave = function () {
                    return function (e, shape, chart, series) {
                        if (series) {
                            dimple._removeTooltip(e, shape, chart, series);
                        }
                    };
                },
                drawMarkers = function (d) {
                    dimple._drawMarkers(d, chart, series, duration, className, graded, onEnter(d), onLeave(d));
                },
                coord = function (position, datum) {
                    var val;
                    if (series.interpolation === "step" && series[position]._hasCategories()) {
                        series.barGap = 0;
                        series.clusterBarGap = 0;
                        val = dimple._helpers[position](datum, chart, series) + (position === "y" ? dimple._helpers.height(datum, chart, series) : 0);
                    } else {
                        val = dimple._helpers["c" + position](datum, chart, series);
                    }
                    // Remove long decimals from the coordinates as this fills the dom up with noise and makes matching below less likely to work.  It
                    // shouldn't really matter but positioning to < 0.1 pixel is pretty pointless anyway.
                    return parseFloat(val.toFixed(1));
                },
                getLine = function (inter, originProperty) {
                    return d3.svg.line()
                        .x(function (d) { return (series.x._hasCategories() || !originProperty ? d.x : series.x[originProperty]); })
                        .y(function (d) { return (series.y._hasCategories() || !originProperty ? d.y : series.y[originProperty]); })
                        .interpolate(inter);
                },
                //custom vertical lines
                showTooltipWithLine = function () {

                    var x0,
                        i,
                        line,
                        d0,
                        d1,
                        d,
                        pos;

                    if (activeLine.keyString) {
                        line = activeLine;
                    } else {
                        line = chart.lineData[0];
                    }
                    x0 = series.x._scale.invert(d3.mouse(this)[0]);
                    i  = bisectDate(line.data, x0, 1);

                    if (i === 0) {
                        d = line.data[i];
                    } else if (i >= line.data.length) {
                        i = line.data.length - 1;
                        d = line.data[i];
                    } else {
                        d0 = line.data[i - 1];
                        d1 = line.data[i];

                        if (x0 - d0.cx > d1.cx - x0) {
                            d = d1;
                        } else {
                            d = d0;
                            i--;
                        }
                    }
                    xCoordinate = series.x._scale(d.cx) + 1;

                    if (verticalLine) {
                        verticalLine
                            .attr("transform", "translate(" + xCoordinate + ",0)")
                            .attr('data-i', i);
                    }

                    if (timePointSelect) {
                        timePointSelect.attr("transform", "translate(" + (xCoordinate - 9) + ",0)");
                    }

                    if (activeLine.keyString) {
                        pos = d3.mouse(this);
                        pos[0] += 40;
                        if (!($('div.tooltip:visible').length > 0)) {
                            dimple._showPointTooltip(d, null, chart, series, pos);
                        }
                        updateTooltipPosition(pos);
                        // show marker
                        marker
                            .attr("cx", activeLine.points[i].x)
                            .attr("cy", activeLine.points[i].y)
                            .style('opacity', 1);
                    }
                },
                hideTooltipWithLine = function(e) {
                    if (!e && window.event) {
                        e = event;
                    }
                    var goingto = e.relatedTarget || event.toElement,
                        pos;

                    //unless target leave is tooltip
                    if ($('div.chart-tooltip:visible').has(goingto).length === 0) {
                        dimple._removeTooltip(null, null, chart, series);
                        setActiveLine(false);
                        if (verticalLine !== null) {
                            verticalLine.attr("transform", "translate(-1,0)");
                        }
                        if (timePointSelect !== null) {
                            timePointSelect.attr("transform", "translate(-16,0)");
                        }
                        if (marker !== null) {
                            marker.style('opacity', 0);
                        }
                    } else {
                        pos = d3.mouse(this);
                        pos[0] += d3.mouse($('div.chart-tooltip:visible')[0])[0];
                        updateTooltipPosition(pos);
                    }
                },
                createTimePointButton = function(onClick, xPos, sign, className, i) {
                    var group = chart.svg.select('g').append('g')
                        .attr('class', className)
                        .on('click', onClick)
                        .attr('transform', "translate(" + xPos + ", 0)")
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
                deselectTimePoint = function() {
                    chart.svg.selectAll('path.dimple-line').classed('grayed', false);
                    if (timePointRemove) {
                        timePointRemove.remove();
                        timePointRemove = null;
                    }
                    if (selectedLine) {
                        selectedLine.remove();
                    }
                    chart.svg.selectAll('circle.dimple-marker')
                        .style('opacity', 0);

                    if (typeof series.setTimePoint === 'function') {
                        series.setTimePoint(null);
                    }
                },
                selectTimePoint = function() {
                    // clear currently selected point
                    deselectTimePoint();
                    if (!this.classList.contains("remove")) {
                        var i = verticalLine.attr('data-i');
                        xCoordinate = chart.lineData[0].points[i].x;
                        marker = null;
                        // show points for every line
                        chart.lineData.map(function(item) {
                            var x0 = series.x._scale.invert(xCoordinate),
                                j = bisectDate(item.data, x0, 1),
                                d0 = item.data[parseInt(j, 10) - 1],
                                d1 = item.data[parseInt(j, 10)],
                                d;
                            if (x0 - d0.cx > d1.cx - x0) {
                                d = d1;
                            } else {
                                d = d0;
                                j = parseInt(j, 10) - 1;
                            }
                            // always keep first item for tooltip
                            item.markerData = [item.markerData[0]].concat(d);
                            drawMarkers(item);
                            chart.svg.selectAll('circle.dimple-marker.' + item.keyString).style('opacity', 1);
                            chart.svg.select('circle.dimple-marker.' + item.keyString).style('opacity', 0);
                        });

                        chart.svg.selectAll('path.dimple-line').classed('grayed', true);
                        //vertical line
                        selectedLine = chart.svg.select('svg > g').insert("line", ":first-child")
                            .attr({
                                'x1': xCoordinate,
                                'y1': 16,
                                'x2': xCoordinate,
                                'y2': grid.height - xAxis.height
                            })
                            .attr('stroke', 'lightgray')
                            .attr('class', 'selected');

                        // box for removing selected time point
                        timePointRemove = createTimePointButton(deselectTimePoint, (xCoordinate - 8), 'x', 'timePointSelect remove', i);
                        series.setTimePoint(lineData[0].data[i].origData['time.interval']);
                    }
                };

            updateTooltipPosition = function() {
                if (series.updateTooltipPosition) {
                    updateTooltipPosition = series.updateTooltipPosition.bind(series);
                } else {
                    updateTooltipPosition = function(x) { return x; };
                }
                return updateTooltipPosition();
            };

            bisectDate = d3.bisector(function(d) { return d.cx; }).left;

            // clear selected time point
            if (chart.timePointSelectable && chart.series[0].clearTimePoints) {
                deselectTimePoint();
                chart.series[0].clearTimePoints = false;
            }

            // Handle the special interpolation handling for step
            interpolation = (series.interpolation === "step" ? "step-after" : series.interpolation);

            // Get the array of ordered values
            orderedSeriesArray = dimple._getSeriesOrder(series.data || chart.data, series);

            if (series.c && ((series.x._hasCategories() && series.y._hasMeasure()) || (series.y._hasCategories() && series.x._hasMeasure()))) {
                graded = true;
            }

            // Create a set of line data grouped by the aggregation field
            for (i = 0; i < data.length; i += 1) {
                key = [];
                rowIndex = -1;
                // Skip the first category unless there is a category axis on x or y
                for (k = firstAgg; k < data[i].aggField.length; k += 1) {
                    key.push(data[i].aggField[k]);
                }
                // Find the corresponding row in the lineData
                keyString = dimple._createClass(key);
                for (k = 0; k < lineData.length; k += 1) {
                    if (lineData[k].keyString === keyString) {
                        rowIndex = k;
                        break;
                    }
                }
                // Add a row to the line data if none was found
                if (rowIndex === -1) {
                    rowIndex = lineData.length;
                    lineData.push({
                        key: key,
                        keyString: keyString,
                        color: "white",
                        data: [],
                        markerData: [],
                        points: [],
                        line: {},
                        entry: {},
                        exit: {}
                    });
                }
                // Add this row to the relevant data
                lineData[rowIndex].data.push(data[i]);
            }

            lineData.map(function(item) {
                seriesKeys.push(item.keyString);
            });


            // Sort the line data itself based on the order series array - this matters for stacked lines and default color
            // consistency with colors usually awarded in terms of prominence
            if (orderedSeriesArray) {
                lineData.sort(function (a, b) {
                    return dimple._arrayIndexCompare(orderedSeriesArray, a.key, b.key);
                });
            }

            // Create a set of line data grouped by the aggregation field
            for (i = 0; i < lineData.length; i += 1) {
                // Sort the points so that lines are connected in the correct order
                lineData[i].data.sort(dimple._getSeriesSortPredicate(chart, series, orderedSeriesArray));
                // If this should have colour gradients, add them
                if (graded) {
                    dimple._addGradient(lineData[i].key, "fill-line-gradient-" + lineData[i].keyString, (series.x._hasCategories() ? series.x : series.y), data, chart, duration, "fill");
                }

                // Get points here, this is so that as well as drawing the line with them, we can also
                // use them for the baseline
                for (j = 0; j < lineData[i].data.length; j += 1) {
                    lineData[i].points.push({
                        x: coord("x", lineData[i].data[j]),
                        y: coord("y", lineData[i].data[j])
                    });
                }
                // If this is a step interpolation we need to add in some extra points to the category axis
                // This is a little tricky but we need to add a new point duplicating the last category value.  In order
                // to place the point we need to calculate the gap between the last x and the penultimate x and apply that
                // gap again.
                if (series.interpolation === "step" && lineData[i].points.length > 1) {
                    if (series.x._hasCategories()) {
                        lineData[i].points.push({
                            x : 2 * lineData[i].points[lineData[i].points.length - 1].x - lineData[i].points[lineData[i].points.length - 2].x,
                            y : lineData[i].points[lineData[i].points.length - 1].y
                        });
                    } else if (series.y._hasCategories()) {
                        lineData[i].points = [{
                            x : lineData[i].points[0].x,
                            y : 2 * lineData[i].points[0].y - lineData[i].points[1].y
                        }].concat(lineData[i].points);
                    }
                }

                // Get the points that this line will appear
                lineData[i].entry = getLine(interpolation, "_previousOrigin")(lineData[i].points);
                lineData[i].update = getLine(interpolation)(lineData[i].points);
                lineData[i].exit = getLine(interpolation, "_origin")(lineData[i].points);

                // Add the color in this loop, it can't be done during initialisation of the row because
                // the lines should be ordered first (to ensure standard distribution of colors
                lineData[i].color = chart.getColor(lineData[i].key.length > 0 ? lineData[i].key[lineData[i].key.length - 1] : "All");
            }

            if (series.shapes === null || series.shapes === undefined) {
                theseShapes = chart._group.selectAll("." + className).data(lineData);
            } else {
                theseShapes = series.shapes.data(lineData, function (d) { return d.key; });
            }

            // Add
            theseShapes
                .enter()
                .append("path")
                .attr("id", function (d) { return d.key; })
                .attr("class", function (d) {
                    return className + " dimple-line " + d.keyString;
                })
                .attr("d", function (d) {
                    return d.entry;
                })
                .call(function () {
                    // Apply formats optionally
                    if (!chart.noFormats) {
                        this.attr("opacity", function (d) { return (graded ? 1 : d.color.opacity); })
                            .attr("fill", "none")
                            .attr("stroke", function (d) { return (graded ? "url(#fill-line-gradient-" + d.keyString + ")" : d.color.stroke); })
                            .attr("stroke-width", series.lineWeight);
                    }
                })
                .each(function (d) {
                    // draw only first circle - for tooltip
                    d.markerData = [].concat(d.data[0]);
                    drawMarkers(d);
                });


            chart.svg
                .on('mousemove', null)
                .on('mouseleave', null);
            chart.svg
                .on('mousemove', showTooltipWithLine)
                .on('mouseleave', hideTooltipWithLine);

            if (chart.svg.selectAll('.verticalLine')[0].length === 0) {
                g = chart.svg.select('g');
                grid = g.node().getBBox();
                xAxis = chart.svg.select('g.dimple-axis').node().getBBox();

                // vertical line
                // chart.svg.select('path.dimple-line')
                //     .on('mousemove', showTooltipWithLine)
                //     .on('mouseleave', hideTooltipWithLine);

                verticalLine = g.insert("line", ":first-child")
                    .attr({
                        'x1': -1,
                        'y1': grid.y + (typeof chart.y === 'number' ? chart.y : 30) - (chart.timePointSelectable ? 18 : 0),
                        'x2': -1,
                        'y2': grid.height - xAxis.height
                    })
                    .attr('stroke', 'lightgray')
                    .attr('class', 'verticalLine');

                // time point selection  box
                if (chart.timePointSelectable) {
                    timePointSelect = createTimePointButton(selectTimePoint, -16, '+', 'timePointSelect', 0);
                }
                chart.lineData = lineData;
            } else {
                verticalLine = chart.svg.select('.verticalLine');
                if (chart.timePointSelectable) {
                    timePointSelect = chart.svg.select('.timePointSelect');
                }
            }

            if (chart.svg.select('g.timePointSelect.remove')[0][0] !== null) {
                i = chart.svg.select('g.timePointSelect.remove').attr('data-i');
                xCoordinate = chart.lineData[0].points[i].x;
                marker = null;
                // show points for every line
                chart.lineData.map(function(item) {
                    j = bisectDate(item.data, series.x._scale.invert(xCoordinate), 1);
                    // always keep first item for tooltip
                    item.markerData = [item.markerData[0]].concat(item.data[j]);
                    drawMarkers(item);
                    chart.svg.selectAll('circle.dimple-marker.' + item.keyString).style('opacity', 1);
                    chart.svg.select('circle.dimple-marker.' + item.keyString).style('opacity', 0);
                });
            }
            // Update
            updated = chart._handleTransition(theseShapes, 0, chart)
                .attr("d", function (d) { return d.update; })
                .on('mouseenter', function(d) {
                    setActiveLine(d);
                });
                // .each(function (d) {

                // });

            // Remove
            removed = chart._handleTransition(theseShapes.exit(), duration, chart)
                .attr("d", function (d) { return d.exit; })
                .each(function (d) {
                    // Using all data for the markers fails because there are no exits in the markers
                    // only the whole line, therefore we need to clear the points here
                    d.markerData = [];
                    drawMarkers(d);
                });

            dimple._postDrawHandling(series, updated, removed, duration);

            // Save the shapes to the series array
            series.shapes = theseShapes;
        }
    };