export {drawCrowd};

function onLevelofPyramid(index){
    return Math.floor(( -1 + Math.sqrt(1 + 8 * index) ) / 2) + 1;
}

function indexInRow(index){
    return index - (onLevelofPyramid(index) * (onLevelofPyramid(index) - 1) / 2);
}

function drawCrowd(people) {
    const margin = {top: 0, right: 0, bottom: 0, left: 0};
	const width = 600 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const crowdContainer = d3.select("#root").append("div").attr("id", "crowd-container");

    // Adding the svg element
    let svg = d3.select("#crowd-container")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("id", "crowd-svg");

    // Adding a group element for the crowd
    let crowd = svg.append("g").attr("class", "crowd");

    let r = 24;
    let epsilon = -10;
    let start_x = width / 2;
    let start_y = height - r;
    let x = (2 * r + epsilon) / Math.sqrt(2);
    const colors = ["yellow", "orange", "red", "pink", "purple"]
    
    const circles = crowd.selectAll("circle")
        .data(d3.range(people))
        .enter()
        .append("circle")
        .attr("id", "crowd-circle")
        .attr("cx", function(d, i) {
            let level = onLevelofPyramid(i);
            let rowIndex = indexInRow(i);
            let a = (2 * r + epsilon) * level;
            let distBtwCircles = Math.sqrt(2 * Math.pow(a, 2)) / level;
            // console.log("Index", i , "Level", level, "Row index", rowIndex, "a",a, "distBtwCircles", distBtwCircles);
            return start_x - level * x + rowIndex * distBtwCircles;
            })
        .attr("cy", function(d, i) {
            // console.log("Index", i , "Level", onLevelofPyramid(i), "Y", start_y - (onLevelofPyramid(i) * x));
            let level = onLevelofPyramid(i) - 1;
            return start_y - (level * x) - epsilon * level;
        })
        .attr("r", 0)
        .sort(function(a, b) { // Add this sort function
            return onLevelofPyramid(b) - onLevelofPyramid(a);
        })
        .style("z-index", function(d, i) { // Add this style function
            return -onLevelofPyramid(i); // zIndex should be negative of the level
        })
        .style("fill", function () {
            return `var(--${colors[Math.floor(Math.random() * colors.length)]})`
        })
        .style("stroke", "var(--black)")
        .style("stroke-width", 1)
        .transition()
        .duration(500)
        .delay(function(d, i) {
            let level = onLevelofPyramid(i);
            let rowIndex = indexInRow(i);
            return (people - level * (level + 1) / 2 - rowIndex) * 100;
        })
        .attr("r", r);
}