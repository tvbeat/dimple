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
            var leaveData = {},
                point,
                points,
                xVal,
                grid,
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

                setActiveLine = function(id) {
                    d3.selectAll('path.dimple-line').classed('active', false)
                        .filter(function() { return this.id === id; })
                        .classed('active', true);
                },
                onEnter = function (position) {
                    return function (e, shape, chart, series) {
                        var seriesId = e.aggField[0];
                        setActiveLine(seriesId);
                        d3.select(shape).style("opacity", 1);
                        dimple._showPointTooltip(e, shape, chart, series, position);
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
                    var xPos = d3.mouse(this)[0],
                        cx = null,
                        activeId = $('path.active').attr('id'),
                        pointsNumber = chart.svg.selectAll('circle.dimple-' + activeId)[0].length,
                        width        = d3.select('g.dimple-gridline')[0][0].getBBox().width,
                        offset       = parseInt(width / ((pointsNumber - 1) * 2), 10),
                        points,
                        x;

                    points = chart.svg.selectAll('circle.dimple-' + activeId)[0].filter(function(item) {
                        cx = parseInt(item.attributes.cx.value, 10);
                        return cx >= (xPos - offset) && cx <= (xPos + offset);
                    });

                    if (points.length) {
                        if (point !== points[0] || point === null) {
                            point = points[0];
                            x = parseInt(point.attributes.cx.value, 10) + 1;
                            d3.select(".verticalLine").attr("transform", function () {
                                return "translate(" + x + ",0)";
                            });

                            d3.select(".timePointSelect").attr("transform", function () {
                                return "translate(" + (x - 9) + ",0)";
                            });

                            // hide all visible points
                            $('circle:not(.stayVisible)').css('opacity', 0);
                            onEnter(d3.mouse(this))(point.__data__, point, chart, series);

                            leaveData.data   = point.__data__;
                            leaveData.point  = point;
                            leaveData.chart  = chart;
                            leaveData.series = series;
                        } else {
                            updateTooltipPosition(d3.mouse(this));
                        }
                    }
                },
                hideTooltipWithLine = function(e) {
                    if (!e && window.event) {
                        e = event;
                    }
                    var goingto = e.relatedTarget || event.toElement,
                        pos;

                    //unless target leave is tooltip
                    if ($('div.chart-tooltip').has(goingto).length === 0) {
                        onLeave({data: []})(leaveData.data, leaveData.point, leaveData.chart, leaveData.series);
                        setActiveLine(false);
                        point = null;

                        d3.select(".verticalLine").attr("transform", function () {
                            return "translate(-1,0)";
                        });
                        d3.select(".timePointSelect").attr("transform", function () {
                            return "translate(-16,0)";
                        });
                        $('circle:not(.stayVisible)').css('opacity', 0);
                    } else {
                        pos = d3.mouse(this);
                        pos[0] += d3.mouse($('div.chart-tooltip')[0])[0];
                        onEnter(d3.mouse(this))(point.__data__, point, chart, series);
                    }
                },
                createTimePointButton = function(onClick, xPos, sign, className) {
                    var group = d3.select('svg > g').append('g')
                        .attr('class', className)
                        .on('click', onClick)
                        .attr('transform', "translate(" + xPos + ", 0)");

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
                },
                deselectTimePoint = function() {
                    d3.selectAll('path.dimple-line').classed('grayed', false);
                    $('g.timePointSelect.remove').remove();
                    $('line.selected').remove();
                    chart.svg.selectAll('circle')
                        .style('opacity', 0)
                        .classed('stayVisible', false);
                    d3.select(".timePointSelect").attr("transform", function () {
                        return "translate(" + (leaveData.point.cx.baseVal.value - 8) + ",0)";
                    });

                    series.setTimePoint(null);
                },
                selectTimePoint = function() {
                    if (!this.classList.contains("remove")) {
                        // clear currently selected point
                        deselectTimePoint();

                        // show circles for all series
                        var xCoordinate = leaveData.point.cx.baseVal.value,
                            points = chart.svg.selectAll('circle')[0].filter(function(item) {
                                return leaveData.point.cx.baseVal.value === item.cx.baseVal.value;
                            });
                        d3.selectAll(points)
                            .style('opacity', 1)
                            .classed('stayVisible', true);

                        //vertical line
                        d3.select('svg > g').append('line')
                            .attr({
                                'x1': xCoordinate,
                                'y1': 16,
                                'x2': xCoordinate,
                                'y2': grid.height - xAxis.height
                            })
                            .attr('stroke', 'lightgray')
                            .attr('class', 'selected');

                        // box for removing selected time point
                        createTimePointButton(deselectTimePoint, (xCoordinate - 8), 'x', 'timePointSelect remove');
                        series.setTimePoint(leaveData.data.lana['time.interval']);
                    }
                };

            if (series.updateTooltipPosition) {
                updateTooltipPosition = series.updateTooltipPosition.bind(series);
            } else {
                updateTooltipPosition = function() {};
            }

            // Handle the special interpolation handling for step
            interpolation =  (series.interpolation === "step" ? "step-after" : series.interpolation);

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

            if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
                chart._tooltipGroup.remove();
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
                .on('mouseenter', function(d) {
                    setActiveLine(d.key[0]);
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
                    // Pass line data to markers
                    d.markerData = d.data;
                    drawMarkers(d);
                });

            if ($('g.timePointSelect.remove').length) {
                d3.selectAll('path.dimple-line').classed('grayed', true);
                //show point for new added series/line
                xVal = d3.select('circle.stayVisible')[0][0].cx.baseVal.value;
                points = chart.svg.selectAll('circle')[0].filter(function(item) {
                    return xVal === item.cx.baseVal.value;
                });
                d3.selectAll(points).style('opacity', 1).classed('stayVisible', true);
            }

            if (!d3.selectAll('line.verticalLine').node()) {
                // vertical line
                d3.select('svg')
                    .on('mousemove', showTooltipWithLine)
                    .on('mouseleave', hideTooltipWithLine);

                grid = d3.select('svg > g').node().getBBox();
                xAxis = d3.select('g.dimple-axis').node().getBBox();

                d3.select('svg > g').append('line')
                    .attr({
                        'x1': -1,
                        'y1': grid.y + chart.y - (chart.timePointSelectable ? 18 : 0),
                        'x2': -1,
                        'y2': grid.height - xAxis.height
                    })
                    .attr('stroke', 'lightgray')
                    .attr('class', 'verticalLine');

                if (chart.timePointSelectable) {
                    // time point selection box
                    createTimePointButton(selectTimePoint, -16, '+', 'timePointSelect');
                }
            }

            // Update
            updated = chart._handleTransition(theseShapes, duration, chart)
                .attr("d", function (d) { return d.update; })
                .each(function (d) {
                    // Pass line data to markers
                    d.markerData = d.data;
                    drawMarkers(d);
                });

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