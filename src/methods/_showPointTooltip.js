    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_showPointTooltip.js
    dimple._showPointTooltip = function (e, shape, chart, series, positionArray) {
        // The margin between the text and the box
        var textMargin = 5,
            // The margin between the ring and the popup
            popupMargin = 10,
            // The popup animation duration in ms
            animDuration = 750,
            // Collect some facts about the highlighted bubble
            selectedShape = d3.select(shape),
            cx = parseFloat(selectedShape.attr("cx")),
            cy = parseFloat(selectedShape.attr("cy")),
            r = parseFloat(selectedShape.attr("r")),
            fill = selectedShape.attr("stroke"),

            // The running y value for the text elements
            y = 0,
            // The maximum bounds of the text elements
            w = 0,
            h = 0,
            position,
            translateX,
            translateY;

        if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
            chart._tooltipGroup.remove();
        }
        chart._tooltipGroup = chart.svg.append("g");

        // Add a ring around the data point
        chart._tooltipGroup.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", r)
            .attr("opacity", 0)
            .style("fill", "none")
            .style("stroke", fill)
            .style("stroke-width", 1)
            .transition()
            .duration(animDuration / 2)
            .ease("linear")
            .attr("opacity", 1)
            .attr("r", r + series.lineWeight + 2)
            .style("stroke-width", 2);


        // Shift the popup around to avoid overlapping the svg edge
        if (cx + r + textMargin + popupMargin + w < parseFloat(chart.svg.node().getBBox().width)) {
            // Draw centre right
            translateX = (cx + r + textMargin + popupMargin);
            translateY = (cy - ((y - (h - textMargin)) / 2));
        } else if (cx - r - (textMargin + popupMargin + w) > 0) {
            // Draw centre left
            translateX = (cx - r - (textMargin + popupMargin + w));
            translateY = (cy - ((y - (h - textMargin)) / 2));
        } else if (cy + r + y + popupMargin + textMargin < parseFloat(chart.svg.node().getBBox().height)) {
            // Draw centre below
            translateX = (cx - (2 * textMargin + w) / 2);
            translateX = (translateX > 0 ? translateX : popupMargin);
            translateX = (translateX + w < parseFloat(chart.svg.node().getBBox().width) ? translateX : parseFloat(chart.svg.node().getBBox().width) - w - popupMargin);
            translateY = (cy + r + 2 * textMargin);
        } else {
            // Draw centre above
            translateX = (cx - (2 * textMargin + w) / 2);
            translateX = (translateX > 0 ? translateX : popupMargin);
            translateX = (translateX + w < parseFloat(chart.svg.node().getBBox().width) ? translateX : parseFloat(chart.svg.node().getBBox().width) - w - popupMargin);
            translateY = (cy - y - (h - textMargin));
        }

        if (typeof series.showTooltip === 'function') {
            if (positionArray) {
                position = positionArray;
            } else {
                position = [translateX, translateY];
            }

            series.showTooltip(e, shape, chart, series, position);
        }
    };