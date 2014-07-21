    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_showBarTooltip.js
    dimple._showBarTooltip = function (e, shape, chart, series) {

        // The margin between the text and the box
        var textMargin = 5,
            // The margin between the ring and the popup
            popupMargin = 10,
           // The popup animation duration in ms
            animDuration = 750,
            // Collect some facts about the highlighted bar
            selectedShape = d3.select(shape),
            x = parseFloat(selectedShape.attr("x")),
            y = parseFloat(selectedShape.attr("y")),
            width = parseFloat(selectedShape.attr("width")),
            height = parseFloat(selectedShape.attr("height")),
            opacity = selectedShape.attr("opacity"),
            fill = selectedShape.attr("fill"),
            dropDest = series._dropLineOrigin(),

            // The running y value for the text elements
            yRunning = 0,
            // The maximum bounds of the text elements
            w = 0,
            h = 0,
            // Values to shift the popup
            position,
            translateX,
            translateY,
            offset;

        if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
            chart._tooltipGroup.remove();
        }
        chart._tooltipGroup = chart.svg.append("g");

        offset = (series._isStacked() ? 1 : width / 2);

        // Shift the popup around to avoid overlapping the svg edge
        if (x + width + textMargin + popupMargin + w < parseFloat(chart.svg.node().getBBox().width)) {
            // Draw centre right
            translateX = (x + width + textMargin + popupMargin);
            translateY = (y + (height / 2) - ((yRunning - (h - textMargin)) / 2));
        } else if (x - (textMargin + popupMargin + w) > 0) {
            // Draw centre left
            translateX = (x - (textMargin + popupMargin + w));
            translateY = (y + (height / 2) - ((yRunning - (h - textMargin)) / 2));
        } else if (y + height + yRunning + popupMargin + textMargin < parseFloat(chart.svg.node().getBBox().height)) {
            // Draw centre below
            translateX = (x + (width / 2) - (2 * textMargin + w) / 2);
            translateX = (translateX > 0 ? translateX : popupMargin);
            translateX = (translateX + w < parseFloat(chart.svg.node().getBBox().width) ? translateX : parseFloat(chart.svg.node().getBBox().width) - w - popupMargin);
            translateY = (y + height + 2 * textMargin);
        } else {
            // Draw centre above
            translateX = (x + (width / 2) - (2 * textMargin + w) / 2);
            translateX = (translateX > 0 ? translateX : popupMargin);
            translateX = (translateX + w < parseFloat(chart.svg.node().getBBox().width) ? translateX : parseFloat(chart.svg.node().getBBox().width) - w - popupMargin);
            translateY = (y - yRunning - (h - textMargin));
        }

        if (typeof series.showTooltip === 'function') {
            position = [translateX, translateY];
            series.showTooltip(e, shape, chart, series, position, i);
        }
    };