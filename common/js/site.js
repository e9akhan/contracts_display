// function getHeightAndWidth(element) {
//   let w = element.clientWidth;
//   let h = screen.height;

//   // Resize height to be a square if and only if the aspect ratio indicates
//   // that the device is not a mobile phone
//   if (w < 768) {
//     if (h > w * 3) {
//       h = w;
//     }
//   } else {
//     h = w < 1200 ? w * 0.50 : 640;
//   }
//   return { width: w, height: h };
// }

// function resizeCover() {
//   let div = document.getElementById("above-the-fold");
//   let xyz = document.getElementById("xyz");
//   if (xyz == null) {
//     return;
//   }
//   let abc = xyz
//     .getElementsByClassName("container-xl")[0]
//     .getElementsByClassName("d-flex")[0];

//   let size = getHeightAndWidth(div);
//   let h = size.height;
//   div.style.minHeight = h + "px";
//   xyz.style.minHeight = h + "px";
//   abc.style.minHeight = (h - 80) + "px";
// }

// function resizeSplash() {
//   let div = document.getElementById("splash");
//   let size = getHeightAndWidth(div);
//   div.style.minHeight = size.height + "px";
// }

// document.addEventListener("DOMContentLoaded", function () {
//   resizeCover();
//   resizeSplash();
//   window.onresize = function () {
//     resizeCover();
//     resizeSplash();
//   }
// });


class ChartRenderer {
  constructor(containerId, aspectRatio = 16 / 9) {
    this.containerId = containerId;
    this.aspectRatio = aspectRatio;
    this.data = [];
  }

  setData(data) {
    // parse dates and convert numbers
    const parseDate = d3.timeParse("%Y-%m-%d");
    console.log(typeof data);
    this.data = data.map(d => ({
      date: parseDate(d.refdate),
      price: +d.price,
      volume: +d.volume
    }));
  }

  render () {
    const containerEl = document.getElementById(this.containerId);

    if (!containerEl) {
      console.error(`Container ${this.containerId} not found`);
      return;
    }

    const rect = containerEl.getBoundingClientRect();
    const margin = {top: 10, bottom: 20, right: 10, left: 30};

    const width = rect.width;
    const height = width / this.aspectRatio;

    const chartWidth = width;
    const chartHeight = height;

    const barWidth = (chartWidth - margin.left - margin.right) / this.data.length - 2;

    // split areas
    const lineHeight = chartHeight * 0.66;
    const barHeight = chartHeight * 0.34;

    // Define a time formatter for the x-axis
    const formatYear = d3.timeFormat("%Y"); // e.g., 2023
    const formatMonthYear = d3.timeFormat("%b %Y"); // e.g., Feb 2023

    const container = d3.select(containerEl);
    container.selectAll("*").remove();

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    // scales include margins in range
    const x = d3.scaleTime()
      .domain(d3.extent(this.data, d => d.date))
      .range([margin.left, chartWidth - margin.right]);

    const yLine = d3.scaleLinear()
      .domain([0, d3.max(this.data, d => d.price)])
      .range([lineHeight - margin.bottom, margin.top]);

    const yBar = d3.scaleLinear()
      .domain([0, d3.max(this.data, d => d.volume)])
      .range([chartHeight - margin.bottom, chartHeight - barHeight + margin.top]);

    // line chart
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => yLine(d.price))
      .curve(d3.curveStep);;

    svg.append("path")
      .datum(this.data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    // bars
    svg.selectAll("rect")
      .data(this.data)
      .enter()
      .append("rect")
      .attr("x", (d, i) => margin.left + i * (barWidth + 2))
      .attr("y", d => yBar(d.volume))
      .attr("width", barWidth)
      .attr("height", d => yBar(0) - yBar(d.volume))
      .attr("fill", "orange");

    // axes
    svg.append("g")
      .attr("transform", `translate(0,${lineHeight - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(formatMonthYear));

    svg.append("g")
      .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(formatMonthYear));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yLine));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yBar).ticks(4).tickFormat(d3.format(".2s")));
  }
}