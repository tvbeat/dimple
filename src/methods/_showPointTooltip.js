 // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_showPointTooltip.js
    dimple._showPointTooltip = function (e, shape, chart, series, positionArray, updatePosition) {
        // The margin between the text and the box
        var textMargin = 0,
            // The margin between the ring and the popup
            popupMargin = 30,
            // Collect some facts about the highlighted bubble
            // selectedShape = d3.select(shape),
            // cx = parseFloat(selectedShape.attr("cx")),
            // cy = parseFloat(selectedShape.attr("cy")),
            // r = parseFloat(selectedShape.attr("r")),
            cx,
            cy,
            r = 4,
            // The running y value for the text elements
            y = 0,
            // The maximum bounds of the text elements
            w = 350,
            h = 0,
            // position,
            translateX,
            translateY;

        if (positionArray) {
            cx = positionArray[0];
            cy = positionArray[1];
        }

        // if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
        //     chart._tooltipGroup.remove();
        // }
        // chart._tooltipGroup = chart.svg.append("g");

        // Shift the popup around to avoid overlapping the svg edge
        if (cx + r + textMargin + popupMargin + w < parseFloat(chart.svg.select('g').node().getBBox().width)) {
            // Draw centre right
            translateX = (cx + r + textMargin + popupMargin);
            translateY = (cy - ((y - (h - textMargin)) / 2));
        } else if (cx - r - (textMargin + popupMargin + w) > 0) {
            // Draw centre left
            translateX = (cx - r - (textMargin + popupMargin + w) - 30);
            translateY = (cy - ((y - (h - textMargin)) / 2));
        } else if (cy + r + y + popupMargin + textMargin < parseFloat(chart.svg.node().getBBox().height)) {
            translateX = (cx + r + textMargin + popupMargin);
            translateY = (cy - ((y - (h - textMargin)) / 2));
            // Draw centre below
            // translateX = (cx - (2 * textMargin + w) / 2);
            // translateX = (translateX > 0 ? translateX : popupMargin);
            // translateX = (translateX + w < parseFloat(chart.svg.select('g').node().getBBox().width) ? translateX : parseFloat(chart.svg.select('g').node().getBBox().width) - w - popupMargin);
            // translateY = (cy + r + 2 * textMargin);
        } else {
            translateX = (cx + r + textMargin + popupMargin);
            translateY = (cy - ((y - (h - textMargin)) / 2));
            // Draw centre above
            // translateX = (cx - (2 * textMargin + w) / 2);
            // translateX = (translateX > 0 ? translateX : popupMargin);
            // translateX = (translateX + w < parseFloat(chart.svg.select('g').node().getBBox().width) ? translateX : parseFloat(chart.svg.select('g').node().getBBox().width) - w - popupMargin);
            // translateY = (cy - y - (h - textMargin));
        }

        if (typeof series.showTooltip === 'function') {
            if (updatePosition === true) {
                series.updateTooltipPosition([translateX, translateY]);
            } else {
                series.showTooltip(e, [translateX, translateY]);
            }
        }
    };