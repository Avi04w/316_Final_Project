class BubblePlayerViz {
  constructor({ selector, data, centerSelector }) {
    this.svg = d3.select(selector);
    this.centerEl = document.querySelector(centerSelector);
    this.data = data;
    this.init();
    this.render();
    this.attachResizeHandler();
  }

  init() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.tooltip = d3.select("#bubble-tooltip");
    this.hideTimeout = null;

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);

    const rect = this.centerEl.getBoundingClientRect();
    this.centerX = this.width / 2;
    this.centerY = window.scrollY + rect.top + rect.height / 2;

    this.nodes = [
      { id: "center", isCenter: true, fx: this.centerX, fy: this.centerY }, // invisible node to push nodes away
      ...this.data
    ];

    this.simulation = d3.forceSimulation(this.nodes)
      .force("charge", d3.forceManyBody().strength(-60))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collision", d3.forceCollide().radius(d => d.value))
      .on("tick", () => this.ticked());
  }

  render() {
    this.circles = this.svg.selectAll("circle")
      .data(this.nodes.filter(d => !d.isCenter), d => d.id)
      .join("circle")
      .attr("r", d => d.tempo / 1.4)
      .attr("fill", (_d, i) => d3.schemeCategory10[i % 10])
      .attr("opacity", 0.8)
      .attr("class", "bubble-viz-bubble")
      .on("mouseover", (event, d) => this.showTooltip(event, d))
      .on("mousemove", (event) => this.moveTooltip(event))
      .on("mouseleave", () => this.hideTooltip());;

    this.labels = this.svg.selectAll("text")
      .data(this.nodes.filter(d => !d.isCenter), d => d.id)
      .join("text")
      .text("▶")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("class", "unselectable bubble-viz-bubble");
  }

  ticked() {
    this.circles
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    this.labels
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  }

  updateData(newData) {
    this.simulation.stop();

    this.data = newData;
    this.nodes = [
      { id: "center", isCenter: true, fx: this.centerX, fy: this.centerY },
      ...this.data
    ];

    this.simulation = d3.forceSimulation(this.nodes)
      .force("charge", d3.forceManyBody().strength(-40))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collision", d3.forceCollide().radius(d => d.value))
      .on("tick", () => this.ticked());

    this.render();
  }

  attachResizeHandler() {
    window.addEventListener("resize", () => {
      this.simulation.stop();
      this.svg.selectAll("*").remove();
      this.init();
      this.render();
    });
  }

  showTooltip(event, d) {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.tooltip
      .style("opacity", 1)
      .html(`
        <strong>${d.track_name}</strong><br>
        Popularity: ${d.tempo}
      `);
    this.moveTooltip(event);
  }

  moveTooltip(event) {
    const [x, y] = d3.pointer(event);
    this.tooltip
      .style("left", `${x + 50}px`)
      .style("top", `${y + 400}px`);
  }

  hideTooltip() {
    this.hideTimeout = setTimeout(() => {
      this.tooltip.transition()
        .duration(100)
        .style("opacity", 0);
    }, 50);
  }
}

d3.csv("data/processed/temp_dataset.csv").then((data) => {
  new BubblePlayerViz({
    selector: "#bubble-viz",
    centerSelector: "#hook",
    data: data.slice(0, 10)
  });
})
