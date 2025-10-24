// ======================================================
// Visualization: Audio Genome (DNA Helix)
// Changes: no danceability, energy drives pulse, no glow,
// torsion = 0.2, dataset = temp_dataset.csv
// ======================================================

class AudioGenomeHelix {
    constructor(selector, config = {}) {
        this.selector = selector;
        this.width = config.width || 1000;
        this.height = config.height || 150;
        this.speed = 0.02;
        this.torsion = 0.2;  // smoother, less frequent twists
        this.counter = 0;

        // --- Feature scales ---
        this.colorScale = d3.scaleSequential()
            .domain([0.1, 0.85])
            .interpolator(d3.interpolateRgbBasis([
                "#001a70", "#007bff", "#00ff9d", "#ccff00"
            ]));

        this.lineWidthScale = d3.scaleLinear().domain([0, 1]).range([5, 1]);
        this.pulseSpeedScale = d3.scaleLinear().domain([0.4, 1]).range([1, 7]);
        this.pulseAmpScale = d3.scaleLinear().domain([0.4, 1]).range([0.4, 1.7]);

        // --- SVG Setup ---
        this.svg = d3.select(this.selector)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height + 150) // more vertical room for legend
            .style("display", "block")
            .style("margin", "auto");

        // Background
        this.svg.append("rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("fill", "#0e1624");

        this.container = this.svg.append("g");

        // Geometry scales
        this.x = d3.scaleLinear().range([10, this.width - 10]);
        this.y = d3.scaleLinear().range([this.height - 10, 10]);
        this.z = d3.scaleLinear().range([10, 2]);

        // Year axis group
        this.xAxisGroup = this.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${this.height + 8})`)
            .style("opacity", 0.7);

        // Tooltip
        this.tooltip = d3.select("body")
            .append("div")
            .attr("class", "helix-tooltip")
            .style("position", "absolute")
            .style("padding", "8px 12px")
            .style("background", "rgba(15, 20, 35, 0.9)")
            .style("color", "#eaeef7")
            .style("border-radius", "6px")
            .style("font-size", "13px")
            .style("line-height", "1.4")
            .style("pointer-events", "none")
            .style("opacity", 0);

        this.loadData();
    }

    async loadData() {
        const raw = await d3.csv("/data/processed/temp_dataset.csv", d3.autoType);
        raw.forEach(d => d.year = new Date(d.date).getFullYear());

        const grouped = d3.rollups(
            raw,
            v => ({
                year: v[0].year,
                energy: d3.mean(v, d => d.energy),
                valence: d3.mean(v, d => d.valence),
                acousticness: d3.mean(v, d => d.acousticness)
            }),
            d => d.year
        ).map(([, v]) => v);

        this.featureData = grouped.sort((a, b) => a.year - b.year);
        this.numX = this.featureData.length;

        this.drawLegend();
        this.start();
    }

    generateData() {
        this.counter++;
        const data = d3.range(this.numX).map((d) => {
            const f = this.featureData[d];
            const t = d * this.torsion - this.speed * this.counter;
            return [
                { x: d, y: Math.cos(t), z: Math.sin(t), f },
                { x: d, y: Math.cos(t - Math.PI), z: Math.sin(t - Math.PI), f }
            ];
        });

        const flat = data.flat();
        this.x.domain(d3.extent(flat, (d) => d.x));
        this.y.domain(d3.extent(flat, (d) => d.y));
        this.z.domain(d3.extent(flat, (d) => d.z));
        return data;
    }

    draw() {
        if (!this.featureData) return;
        const data = this.generateData();
        const groups = this.container.selectAll("g").data(data);
        groups.exit().remove();

        const enterGroups = groups.enter()
            .append("g")
            .each((d, i, nodes) => {
                const g = d3.select(nodes[i]);
                g.selectAll("circle")
                    .data(d)
                    .enter()
                    .append("circle");
                g.append("line")
                    .style("cursor", "pointer")
                    .on("mousemove", (event, d) => this.showTooltip(event, d[0].f))
                    .on("mouseleave", () => this.hideTooltip());
            });

        const allGroups = enterGroups.merge(groups);
        const time = this.counter * 0.05;

        allGroups.each((d, i, nodes) => {
            const inverted = (d[0].y < d[1].y) ? 1 : -1;
            const group = d3.select(nodes[i]);
            const f = d[0].f;

            const color = this.colorScale(f.valence);
            const lineWidth = this.lineWidthScale(f.acousticness);
            const pulse = Math.sin(time * this.pulseSpeedScale(f.energy) + i) * 0.5 + 1;
            const radius = 3 * this.pulseAmpScale(f.energy) * pulse;

            group.selectAll("circle")
                .data(d)
                .attr("cx", (d) => this.x(d.x))
                .attr("cy", (d) => this.y(d.y))
                .attr("r", radius)
                .attr("fill", color)
                .attr("fill-opacity", 0.8)
                .attr("stroke", color)
                .attr("stroke-opacity", 0.5);

            group.select("line")
                .attr("x1", this.x(d[0].x))
                .attr("x2", this.x(d[0].x))
                .attr("y1", this.y(d[1].y) + inverted * this.z(d[1].z))
                .attr("y2", this.y(d[0].y) - inverted * this.z(d[0].z))
                .attr("stroke", color)
                .attr("stroke-width", lineWidth)
                .attr("opacity", 0.9);
        });

        const tickStep = Math.max(1, Math.floor(this.numX / 8));
        const tickIndices = d3.range(0, this.numX, tickStep);
        const axis = d3.axisBottom(this.x)
            .tickValues(tickIndices)
            .tickFormat(i => (this.featureData && this.featureData[i]) ? this.featureData[i].year : '');
        this.xAxisGroup.call(axis);
        this.xAxisGroup.selectAll('path, line').attr('stroke', '#444').attr('opacity', 0.6);
        this.xAxisGroup.selectAll('text').attr('fill', '#888').attr('font-size', '11px');
    }

    showTooltip(event, f) {
        const html = `
      <strong>Year:</strong> ${f.year}<br>
      <strong>Energy:</strong> ${f.energy.toFixed(2)}<br>
      <strong>Valence:</strong> ${f.valence.toFixed(2)}<br>
      <strong>Acousticness:</strong> ${f.acousticness.toFixed(2)}
    `;
        this.tooltip
            .html(html)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 20) + "px")
            .transition()
            .duration(100)
            .style("opacity", 1);
    }

    hideTooltip() {
        this.tooltip.transition().duration(150).style("opacity", 0);
    }

    drawLegend() {
        const legendWidth = 300;
        const legendHeight = 15;
        const legendMarginTop = this.height + 55; // moved lower

        const defs = this.svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "valence-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        const stops = d3.range(0.1, 0.86, 0.15).map(t => ({
            offset: `${((t - 0.4) / 0.6) * 100}%`,
            color: this.colorScale(t)
        }));

        gradient.selectAll("stop")
            .data(stops)
            .enter()
            .append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color)
            .attr("stop-opacity", 0.8);

        this.svg.append("rect")
            .attr("x", this.width / 2 - legendWidth / 2)
            .attr("y", legendMarginTop)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#valence-gradient)")
            .style("fill-opacity", 0.72)
            .style("stroke", "#333")
            .style("stroke-width", 0.5)
            .style("rx", 4);

        this.svg.append("text")
            .attr("x", this.width / 2 - legendWidth / 2 - 80)
            .attr("y", legendMarginTop + legendHeight / 1.2)
            .text("Sad / Mellow")
            .attr("fill", "#ccc")
            .attr("font-size", "12px");

        this.svg.append("text")
            .attr("x", this.width / 2 + legendWidth / 2 + 10)
            .attr("y", legendMarginTop + legendHeight / 1.2)
            .text("Happy / Bright")
            .attr("fill", "#ccc")
            .attr("font-size", "12px");

        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', legendMarginTop + legendHeight + 18)
            .attr('text-anchor', 'middle')
            .text('Thicker lines = More Acoustic   •   Thinner lines = More Electric')
            .attr('fill', '#ccc')
            .attr('font-size', '11px');

        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', legendMarginTop + legendHeight + 34)
            .attr('text-anchor', 'middle')
            .text('Faster Pulsing = More Energy   •   Slower Pulsing = Less Energy')
            .attr('fill', '#ccc')
            .attr('font-size', '11px');
    }

    start() {
        if (!this.featureData) {
            requestAnimationFrame(() => this.start());
            return;
        }
        this.timer = d3.interval(() => this.draw(), 25);
    }

    stop() {
        if (this.timer) this.timer.stop();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new AudioGenomeHelix("#vis-dna");
});
