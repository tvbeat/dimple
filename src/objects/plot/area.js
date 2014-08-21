    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/plot/area.js
    /*global  $*/
    dimple.plot.area = {

        // By default the values are stacked
        stacked: true,

        // This is a grouped plot meaning many points are treated as one series value
        grouped: true,

        // The axis positions affecting the area series
        supportedAxes: ["x", "y", "c"],

        // Draw the axis
        draw: function (chart, series, duration) {
            // Get the position data
            var data = series._positionData,
                areaData = [],
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
                catPoints = {},
                allPoints = [],
                points,
                finalPointArray = [],
                basePoints,
                basePoint,
                cat,
                catVal,
                group,
                p,
                b,
                l,
                lastAngle,
                catCoord,
                valCoord,
                updateTooltipPosition,
                point,
                leaveData = {},
                xVal,
                grid,
                xAxis,
                setActiveLine = function(id) {
                    chart.svg.selectAll('path.dimple-line').classed('active', false)
                        .filter(function() { return this.id === id; })
                        .classed('active', true);
                },
                onEnter = function (position, updatePosition) {
                    if (updatePosition === null) {
                        updatePosition = false;
                    }
                    return function (e, shape, chart, series) {
                        var seriesId = e.aggField[0];
                        setActiveLine(seriesId);
                        d3.select(shape).style("opacity", 1);
                        dimple._showPointTooltip(e, shape, chart, series, position, updatePosition);
                    };
                },
                onLeave = function () {
                    return function (e, shape, chart, series) {
                        if (series) {
                            d3.select(shape).style("opacity", 0);
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
                        val = dimple._helpers[position](datum, chart, series) + (position === "y" ? dimple._helpers.height(datum, chart, series) : 0);
                        if (series[position].categoryFields.length < 2) {
                            val += (position === "y" ? 1 : -1) * dimple._helpers[position + "Gap"](chart, series);
                        }
                    } else {
                        val = dimple._helpers["c" + position](datum, chart, series);
                    }
                    // Remove long decimals from the coordinates as this fills the dom up with noise and makes matching below less likely to work.  It
                    // shouldn't really matter but positioning to < 0.1 pixel is pretty pointless anyway.
                    return parseFloat(val.toFixed(1));
                },
                getArea = function (inter, originProperty) {
                    return d3.svg.line()
                        .x(function (d) { return (series.x._hasCategories() || !originProperty ? d.x : series.x[originProperty]); })
                        .y(function (d) { return (series.y._hasCategories() || !originProperty ? d.y : series.y[originProperty]); })
                        .interpolate(inter);
                },
                sortByVal = function (a, b) {
                    return parseFloat(a) - parseFloat(b);
                },
                sortByX = function (a, b) {
                    return parseFloat(a.x) - parseFloat(b.x);
                },
                addNextPoint = function (source, target, startAngle) {
                    // Given a point we need to find the next point clockwise from the start angle
                    var i,
                        point = target[target.length - 1],
                        thisAngle,
                        bestAngleSoFar = 9999,
                        returnPoint = point;
                    for (i = 0; i < source.length; i += 1) {
                        if (source[i].x !== point.x || source[i].y !== point.y) {
                            // get the angle in degrees since start angle
                            thisAngle = 180 - (Math.atan2(source[i].x - point.x, source[i].y - point.y) * (180 / Math.PI));
                            if (thisAngle > startAngle && thisAngle < bestAngleSoFar) {
                                returnPoint = source[i];
                                bestAngleSoFar = thisAngle;
                            }
                        }
                    }
                    target.push(returnPoint);
                    return bestAngleSoFar;
                },
                //custom vertical lines
                // code is repeating
                showTooltipWithLine = function () {
                    if (chart.svg.select('path.active').node() === null) {
                        return;
                    }

                    var xPos = d3.mouse(this)[0],
                        cx = null,
                        activeId     = chart.svg.select('path.active').attr('id'),
                        pointsNumber = chart.svg.selectAll('circle.dimple-' + activeId)[0].length,
                        width        = d3.select('g.dimple-gridline').node().getBBox().width,
                        offset       = parseInt(width / ((pointsNumber - 1) * 2), 10),
                        points,
                        position     = d3.mouse(this),
                        x;

                    points = chart.svg.selectAll('circle.dimple-' + activeId)[0].filter(function(item) {
                        cx = parseInt(item.attributes.cx.value, 10);
                        return cx >= (xPos - offset) && cx <= (xPos + offset);
                    });

                    position[0] += 40;

                    if (points.length) {
                        if (point !== points[0] || point === null) {
                            point = points[0];
                            x = parseInt(point.attributes.cx.value, 10) + 1;
                            chart.svg.select(".verticalLine").attr("transform", function () {
                                return "translate(" + x + ",0)";
                            });

                            chart.svg.select(".timePointSelect").attr("transform", function () {
                                return "translate(" + (x - 9) + ",0)";
                            });

                            // hide all visible points
                            d3.selectAll('circle:not(.stayVisible)').style('opacity', 0);

                            onEnter(position)(point.__data__, point, chart, series);

                            leaveData.data   = point.__data__;
                            leaveData.point  = point;
                            leaveData.chart  = chart;
                            leaveData.series = series;
                        } else {
                            onEnter(position, true)(point.__data__, point, chart, series);
                            // updateTooltipPosition(d3.mouse(this));
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

                        chart.svg.select(".verticalLine").attr("transform", function () {
                            return "translate(-1,0)";
                        });
                        chart.svg.select(".timePointSelect").attr("transform", function () {
                            return "translate(-16,0)";
                        });
                        chart.svg.select('circle:not(.stayVisible)').attr('opacity', 0);
                    } else {
                        pos = d3.mouse(this);
                        pos[0] += d3.mouse($('div.chart-tooltip:visible')[0])[0];
                        onEnter(d3.mouse(this))(point.__data__, point, chart, series);
                    }
                },
                createTimePointButton = function(onClick, xPos, sign, className) {
                    var group = chart.svg.select('g').append('g')
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
                    chart.svg.selectAll('path.dimple-line').classed('grayed', false);
                    chart.svg.select('g.timePointSelect.remove').remove();
                    chart.svg.select('line.selected').remove();
                    chart.svg.selectAll('circle')
                        .style('opacity', 0)
                        .classed('stayVisible', false);

                    if (typeof series.setTimePoint === 'function') {
                        series.setTimePoint(null);
                    }
                },
                selectTimePoint = function() {
                    // clear currently selected point
                    deselectTimePoint();

                    if (!this.classList.contains("remove")) {
                        // show circles for all series
                        var xCoordinate = leaveData.point.cx.baseVal.value,
                            points = chart.svg.selectAll('circle')[0].filter(function(item) {
                                return leaveData.point.cx.baseVal.value === item.cx.baseVal.value;
                            });
                        chart.svg.selectAll(points)
                            .style('opacity', 1)
                            .classed('stayVisible', true);

                        chart.svg.selectAll('path.dimple-line').classed('grayed', true);
                        //vertical line
                        chart.svg.select('svg > g').append('line')
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

            updateTooltipPosition = function() {
                if (series.updateTooltipPosition) {
                    updateTooltipPosition = series.updateTooltipPosition.bind(series);
                } else {
                    updateTooltipPosition = function(x) { return x; };
                }
                return updateTooltipPosition();
            };

            // clear selected time point
            if (chart.timePointSelectable && chart.series[0].clearTimePoints) {
                deselectTimePoint();
                chart.series[0].clearTimePoints = false;
            }
            // Handle the special interpolation handling for step
            interpolation =  (series.interpolation === "step" ? "step-after" : series.interpolation);

            // Get the array of ordered values
            orderedSeriesArray = dimple._getSeriesOrder(series.data || chart.data, series);

            if (series.c && ((series.x._hasCategories() && series.y._hasMeasure()) || (series.y._hasCategories() && series.x._hasMeasure()))) {
                graded = true;
            }

            // If there is a coordinate with categories get it here so we don't have to keep checking
            if (series.x._hasCategories()) {
                catCoord = "x";
                valCoord = "y";
            } else if (series.y._hasCategories()) {
                catCoord = "y";
                valCoord = "x";
            }

            // Create a set of area data grouped by the aggregation field
            for (i = 0; i < data.length; i += 1) {
                key = [];
                rowIndex = -1;
                // Skip the first category unless there is a category axis on x or y
                for (k = firstAgg; k < data[i].aggField.length; k += 1) {
                    key.push(data[i].aggField[k]);
                }
                // Find the corresponding row in the areaData
                keyString = dimple._createClass(key);
                for (k = 0; k < areaData.length; k += 1) {
                    if (areaData[k].keyString === keyString) {
                        rowIndex = k;
                        break;
                    }
                }
                // Add a row to the area data if none was found
                if (rowIndex === -1) {
                    rowIndex = areaData.length;
                    areaData.push({
                        key: key,
                        keyString: keyString,
                        color: "white",
                        data: [],
                        points: [],
                        area: {},
                        entry: {},
                        exit: {},
                        // Group refers to groupings along the category axis.  If there are groupings it will be recorded, otherwise all is used as a default
                        group: (catCoord && data[i][catCoord + "Field"] && data[i][catCoord + "Field"].length >= 2 ? data[i][catCoord + "Field"][0] : "All")
                    });
                }
                // Add this row to the relevant data
                areaData[rowIndex].data.push(data[i]);
            }

            // Sort the area data itself based on the order series array - this matters for stacked areas and default color
            // consistency with colors usually awarded in terms of prominence
            if (orderedSeriesArray) {
                areaData.sort(function (a, b) {
                    return dimple._arrayIndexCompare(orderedSeriesArray, a.key, b.key);
                });
            }

            // Create a set of area data grouped by the aggregation field
            for (i = 0; i < areaData.length; i += 1) {
                // Sort the points so that areas are connected in the correct order
                areaData[i].data.sort(dimple._getSeriesSortPredicate(chart, series, orderedSeriesArray));
                // Get points here, this is so that as well as drawing the line with them, we can also
                // use them for the baseline
                for (j = 0; j < areaData[i].data.length; j += 1) {
                    areaData[i].points.push({
                        x: coord("x", areaData[i].data[j]),
                        y: coord("y", areaData[i].data[j])
                    });
                    // if there is a category axis, add the points to a distinct set.  Set these to use the origin value
                    // this will be updated with the last value in each case as we build the areas
                    if (catCoord) {
                        if (!catPoints[areaData[i].group]) {
                            catPoints[areaData[i].group] = {};
                        }
                        catPoints[areaData[i].group][areaData[i].points[areaData[i].points.length - 1][catCoord]] = series[valCoord]._origin;
                    }
                }
                points = areaData[i].points;
                // If this is a step interpolation we need to add in some extra points to the category axis
                // This is a little tricky but we need to add a new point duplicating the last category value.  In order
                // to place the point we need to calculate the gap between the last x and the penultimate x and apply that
                // gap again.
                if (series.interpolation === "step" && points.length > 1 && catCoord) {
                    if (series.x._hasCategories()) {
                        points.push({
                            x : 2 * points[points.length - 1].x - points[points.length - 2].x,
                            y : points[points.length - 1].y
                        });
                        catPoints[areaData[i].group][points[points.length - 1][catCoord]] = series[valCoord]._origin;
                    } else if (series.y._hasCategories()) {
                        points = [{
                            x : points[0].x,
                            y : 2 * points[0].y - points[1].y
                        }].concat(points);
                        catPoints[areaData[i].group][points[0][catCoord]] = series[valCoord]._origin;
                        // The prepend above breaks the reference so it needs to be reapplied here.
                        areaData[i].points = points;
                    }
                }
            }

            // catPoints needs to be lookup, but also accessed sequentially so we need to create an array of keys
            for (cat in catPoints) {
                if (catPoints.hasOwnProperty(cat)) {
                    allPoints[cat] = [];
                    for (catVal in catPoints[cat]) {
                        if (catPoints[cat].hasOwnProperty(catVal)) {
                            allPoints[cat].push(parseFloat(catVal));
                        }
                    }
                    // Sort the points as integers
                    allPoints[cat].sort(sortByVal);
                }
            }

            // Create the areas
            for (i = 0; i < areaData.length; i += 1) {
                points = areaData[i].points;
                group = areaData[i].group;
                basePoints = [];
                finalPointArray = [];
                // If this should have colour gradients, add them
                if (graded) {
                    dimple._addGradient(areaData[i].key, "fill-area-gradient-" + areaData[i].keyString, (series.x._hasCategories() ? series.x : series.y), data, chart, duration, "fill");
                }
                // All points will only be populated if there is a category axis
                if (allPoints[group] && allPoints[group].length > 0) {
                    // Iterate the point array because we need to fill in zero points for missing ones, otherwise the areas
                    // will cross where an upper area has no value and a lower value has a spike Issue #7
                    for (j = 0, k = 0; j < allPoints[group].length; j += 1) {
                        // We are only interested in points between the first and last point of this areas data (i.e. don't fill ends - important
                        // for grouped area charts).  We have to use a strange criteria here.  If there are no group gaps on a grouped area
                        // chart the end point of one series will clash with the start point of another, therefore we have to ignore fill-in's within
                        // a couple of pixels of the start and end points
                        if (allPoints[group][j] >= points[0][catCoord] && allPoints[group][j] <= points[points.length - 1][catCoord]) {
                            // Get a base point, this needs to go on the base points array as well as filling in gaps in the point array.
                            // Create a point using the coordinate on the category axis and the last recorded value
                            // position from the dictionary
                            basePoint = {};
                            basePoint[catCoord] = allPoints[group][j];
                            basePoint[valCoord] = catPoints[group][allPoints[group][j]];
                            // add the base point
                            basePoints.push(basePoint);
                            // handle missing points
                            if (points[k][catCoord] > allPoints[group][j]) {
                                // If there is a missing point we need to in fill
                                finalPointArray.push(basePoint);
                            } else {
                                // They must be the same
                                finalPointArray.push(points[k]);
                                // Use this to update the dictionary to the new value coordinate
                                catPoints[areaData[i].group][allPoints[group][j]] = points[k][valCoord];
                                k += 1;
                            }
                        }
                    }
                } else {
                    // If there is no category axis we need to apply some custom logic.  In order to avoid
                    // really jagged areas the default behaviour will be to draw from the left most point then rotate a line
                    // clockwise until it hits another point and continue from each point until back to where we started.  This
                    // means it will not connect every point, but it will contain every point:
                    // E.g.
                    //                     D
                    //         C
                    //      A      B     E
                    //         F      G
                    //      H
                    //
                    // Would draw A -> C -> D -> E -> G -> H -> A
                    //
                    // This may not be what everyone wants so if there is a series order specified we will just join
                    // the points in that order instead.  This will not allow users to skip points and therefore not achieve
                    // the default behaviour explicitly.
                    if (series._orderRules && series._orderRules.length > 0) {
                        finalPointArray = points.concat(points[0]);
                    } else {
                        // Find the leftmost point
                        points = points.sort(sortByX);
                        finalPointArray.push(points[0]);
                        lastAngle = 0;
                        // Iterate until the first and last points match
                        do {
                            lastAngle = addNextPoint(points, finalPointArray, lastAngle);
                        } while (finalPointArray.length <= points.length && (finalPointArray[0].x !== finalPointArray[finalPointArray.length - 1].x || finalPointArray[0].y !== finalPointArray[finalPointArray.length - 1].y));
                    }
                }

                // Reverse the base points so that they are in the correct order for the path
                basePoints = basePoints.reverse();

                // Get the points that this area will appear
                p = getArea(interpolation, "_previousOrigin")(finalPointArray);
                b = getArea((interpolation === "step-after" ? "step-before" : (interpolation === "step-before" ? "step-after" : interpolation)), "_previousOrigin")(basePoints);
                l = getArea("linear", "_previousOrigin")(finalPointArray);
                areaData[i].entry = p + (b && b.length > 0 ? "L" + b.substring(1) : "") + (l && l.length > 0 ? "L" + l.substring(1, l.indexOf("L")) : 0);

                p = getArea(interpolation)(finalPointArray);
                b = getArea(interpolation === "step-after" ? "step-before" : (interpolation === "step-before" ? "step-after" : interpolation))(basePoints);
                l = getArea("linear")(finalPointArray);
                areaData[i].update = p + (b && b.length > 0 ? "L" + b.substring(1) : "") + (l && l.length > 0 ? "L" + l.substring(1, l.indexOf("L")) : 0);

                p = getArea(interpolation, "_origin")(finalPointArray);
                b = getArea((interpolation === "step-after" ? "step-before" : (interpolation === "step-before" ? "step-after" : interpolation)), "_origin")(basePoints);
                l = getArea("linear", "_origin")(finalPointArray);
                areaData[i].exit = p + (b && b.length > 0 ? "L" + b.substring(1) : "") + (l && l.length > 0 ? "L" + l.substring(1, l.indexOf("L")) : 0);

                // Add the color in this loop, it can't be done during initialisation of the row because
                // the areas should be ordered first (to ensure standard distribution of colors
                areaData[i].color = chart.getColor(areaData[i].key.length > 0 ? areaData[i].key[areaData[i].key.length - 1] : "All");

            }

            if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
                chart._tooltipGroup.remove();
            }

            if (series.shapes === null || series.shapes === undefined) {
                theseShapes = chart._group.selectAll("." + className).data(areaData);
            } else {
                theseShapes = series.shapes.data(areaData, function (d) { return d.key; });
            }

            // Add
            theseShapes
                .enter()
                .append("path")
                .attr("id", function (d) { return d.key; })
                .attr("class", function (d) { return className + " dimple-line " + d.keyString; })
                .attr("d", function (d) { return d.entry; })
                .on('mouseenter', function(d) {
                    setActiveLine(d.key[0]);
                })
                .call(function () {
                    // Apply formats optionally
                    if (!chart.noFormats) {
                        this.attr("opacity", function (d) { return (graded ? 1 : d.color.opacity); })
                            .attr("fill", function (d) { return (graded ? "url(#fill-area-gradient-" + d.keyString + ")" : d.color.fill); })
                            .attr("stroke", function (d) { return (graded ? "url(#stroke-area-gradient-" + d.keyString + ")" : d.color.stroke); })
                            .attr("stroke-width", series.lineWeight);
                    }
                })
                .each(function (d) {
                    // Pass line data to markers
                    d.markerData = d.data;
                    drawMarkers(d);
                });

            if (chart.svg.select('g.timePointSelect.remove')[0][0] !== null) {
                chart.svg.selectAll('path.dimple-line').classed('grayed', true);
                //show point for new added series/line
                xVal = chart.svg.select('circle.stayVisible').node().cx.baseVal.value;
                points = chart.svg.selectAll('circle')[0].filter(function(item) {
                    return xVal === item.cx.baseVal.value;
                });
                chart.svg.selectAll(points).style('opacity', 1).classed('stayVisible', true);
            }

            if (!chart.svg.select('line.verticalLine').node()) {
                // vertical line
                chart.svg
                    .on('mousemove', showTooltipWithLine)
                    .on('mouseleave', hideTooltipWithLine);

                chart.svg.select('path.dimple-line')
                    .on('mousemove', showTooltipWithLine)
                    .on('mouseleave', hideTooltipWithLine);

                grid = chart.svg.select('g').node().getBBox();
                xAxis = chart.svg.select('g.dimple-axis').node().getBBox();

                chart.svg.select('g').append('line')
                    .attr({
                        'x1': -1,
                        'y1': grid.y + (typeof chart.y === 'number' ? chart.y : 30) - (chart.timePointSelectable ? 18 : 0),
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

