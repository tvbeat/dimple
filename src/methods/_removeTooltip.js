    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_removeTooltip.js
    /*jslint unparam: true */
    dimple._removeTooltip = function (e, shape, chart, series) {
        if (typeof series.removeTooltip === 'function') {
            series.removeTooltip();

        }

        var verticalLine = chart.svg.select('.verticalLine');
        if (verticalLine) {
            verticalLine
                .style("transform", "translate(-16px,0px)");
        }
    };
    /*jslint unparam: false */
