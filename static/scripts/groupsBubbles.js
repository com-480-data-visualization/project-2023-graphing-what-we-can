import {
  getPreDonationIncome,
  getDonationPercentage,
  getAfterDonationIncome
} from "./utility.js";

export {
  drawGroups,
  createEventListenerForGroups
};

//Fetch json dataset 
const response = await fetch("static/data/income_centiles.json");
const INCOME_CENTILES = await response.json();

// Constants 
const NB_CIRCLES = 194;
const SIZE_CIRCLE = 16;
const width = 2300;
const height = 1200;
const WORLD_POPULATION = 7764951032
const POP_PER_CIRCLE = Math.ceil(WORLD_POPULATION / NB_CIRCLES)
const COLOR_POOR = "#cc4115";
const COLOR_RICH = "#F5D9D0";

// Define the forces for circle positioning
const forceXCombine = d3
  .forceX(d => (d.group === "richer" ? width / 4 : 3 * (width / 4)))
  .strength(0.06);
const forceYCombine = d3.forceY(height / 2).strength(0.06);

// Create the global simulation
const simulation = d3
  .forceSimulation()
  .force("charge", d3.forceManyBody().strength(-(SIZE_CIRCLE + 1)))
  .force("x", forceXCombine)
  .force("y", forceYCombine)
  .force("collision", d3.forceCollide().radius(d => d.r + 0.5))
  .stop();

//initialize global variables 
let [proportionGroupPoorer, proportionGroupRicher] = [0.0, 0.0]
let nbCirclesPoorer = 0;
let nbCirclesRicher = 0;
let dataCirclesPoorer = [];
let dataCirclesRicher = [];
let mergedData = [];

//initially at ten 
let percentage = 10.0;

// Useful Function for generating the circles
const generateData = (group, count) =>
  d3.packSiblings(d3.range(count).map(() => ({
      r: SIZE_CIRCLE,
      group
  })));




// This function is called after the user has pressed on calculate and scrolled down
function drawGroups() {

  console.log("drawGroups");

  // Add main text 
  d3.select("#bubbleGroup-container")
      .append("p")
      .attr("id", "group_bubbles-text")
      .attr("class", "font-bold text-3xl")
      .html(`By choosing to donate <u class="font-bold no-underline">${parseFloat(percentage).toFixed(0)}</u>% of your income...`);

  // Find the group proportions
  [proportionGroupPoorer, proportionGroupRicher] = findGroupProportions();

  // Calculate the number of circles for the poorer and richer groups
  nbCirclesPoorer = Math.ceil(NB_CIRCLES * proportionGroupPoorer);
  nbCirclesRicher = Math.ceil(NB_CIRCLES * proportionGroupRicher);

  //Generate the data for the circles
  dataCirclesPoorer = generateData("poorer", nbCirclesPoorer);
  dataCirclesRicher = generateData("richer", nbCirclesRicher);

  mergedData = [...dataCirclesPoorer, ...dataCirclesRicher];



  // Create the SVG element
  const svg = d3
      .select("#bubbleGroup-container")
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("background", "rgb(250 244 244)")
      .attr("stroke", "currentColor")
      .attr("stroke-width", 1.5)
      .attr("id", "bubblegroups-svg");

  // Add text for each group 
  const title_poorer_text = svg.append("text")
      .attr("id", "title_poorer_text")
      .attr("class", "title-bubble-group")
      .text(d => `${(proportionGroupPoorer * 100).toFixed(1)}% of people would be poorer than you`)
      .attr("x", 3 * (width / 4))
      .attr("y", height / 8)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", "50px")
      .attr("fill", "black");

  var title_richer_text = svg.append("text")
      .attr("id", "title_richer_text")
      .attr("class", "title-bubble-group")
      .text(d => `${(proportionGroupRicher * 100).toFixed(1)}% of people would be richer than you`)
      .attr("x", 1 * (width / 4))
      .attr("y", height / 8)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", "50px")
      .attr("fill", "black");




  // Join circles and set initial attributes
  const joinCircles = data =>
      svg
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("r", d => d.r - 0.25);

  // Draw the circles
  const circles = joinCircles(mergedData);


  // Update circle positions on simulation tick
  simulation.nodes(mergedData).on("tick", () => {
      circles.attr("cx", d => d.x).attr("cy", d => d.y);
      circles.attr("fill", d => (d.group === "poorer" ? COLOR_POOR : COLOR_RICH));
  });

  // Start the simulation
  simulation
      .nodes(mergedData)
      .force("x", forceXCombine)
      .force("y", forceYCombine)
      .alphaTarget(0.5)
      .restart();

  // add legend
  add_legend();

}


// Function called on main with slider interaction 
function createEventListenerForGroups() {
  const sliderElement = document.getElementById("slider");
  console.log(simulation)
  sliderElement.noUiSlider.on('update', (values, handle) => {
      update_groups()
  })
}



// Find the proportions of poorer and richer based on income and donation
function findGroupProportions() {
  let income = 0;

  const sliderE = document.getElementById("slider");
  //Take into account the case when the slider is not active
  if (!sliderE.classList.contains("active")) {
      income = getPreDonationIncome() * (0.90);
  } else {
      income = getAfterDonationIncome();
  }
  // Get closest centile from the dataset
  let closestCentile = INCOME_CENTILES.reduce(
      (closest, current) =>
      current.international_dollars > income &&
      Math.abs(current.international_dollars - income) >= Math.abs(closest.international_dollars - income) ?
      closest : current, INCOME_CENTILES[0]);

  // Get the proportions
  let proportionGroupPoorer = closestCentile.percentage / 100;
  let proportionGroupRicher = 1 - proportionGroupPoorer;
  return [proportionGroupPoorer, proportionGroupRicher]
}

// Process after slider interaction
function update_groups() {
  let [proportionGroupPoorer, proportionGroupRicher] = findGroupProportions()
  // Calculate the number of circles for the poorer and richer groups
  let newRich = nbCirclesPoorer - Math.ceil(NB_CIRCLES * proportionGroupPoorer);
  let newPoor = nbCirclesRicher - Math.ceil(NB_CIRCLES * proportionGroupRicher);
  // update the total
  nbCirclesRicher += newRich;
  nbCirclesPoorer += newPoor;

  // Update the group assignment of circles
  if (newPoor > 0) {
      let richIndices = mergedData
          .map((d, i) => (d.group === "richer" ? i : -1))
          .filter(index => index !== -1);
      richIndices.slice(0, newPoor).forEach(index => {
          mergedData[index].group = "poorer";
      });
  } else if (newRich > 0) {
      let poorIndices = mergedData
          .map((d, i) => (d.group === "poorer" ? i : -1))
          .filter(index => index !== -1);
      poorIndices.slice(0, newRich).forEach(index => {
          mergedData[index].group = "richer";
      });
  }

  // Update the simulation with new forces and restart it
  simulation
      .nodes(mergedData)
      .force("x", forceXCombine)
      .force("y", forceYCombine)
      .alphaTarget(0.5)
      .restart();

  // Update texts
  d3.select("#title_richer_text").text(d => `${(proportionGroupRicher * 100).toFixed(1)}% of people would be richer than you`);
  d3.select("#title_poorer_text").text(d => `${(proportionGroupPoorer * 100).toFixed(1)}% of people would be poorer than you`);
  percentage = getDonationPercentage()
  d3.select("#group_bubbles-text")
      .html(`By choosing to donate <u class="font-bold no-underline">${percentage}</u>% of your income...`);
}

// Add legend
function add_legend() {

  const legend = d3.select("#bubblegroups-svg")
      .append("g")
      .attr("class", "legend")
      .attr("transform", "translate(50, 900)");

  // Add legend title
  legend
      .append("text")
      .attr("class", "legend-title")
      .attr("x", 0)
      .attr("y", 0)
      .text("Legend")
      .attr("color", "black")
      .attr("font-size", "7vh");

  // Add legend circles
  const legendCircles = legend
      .selectAll(".legend-circle")
      .data([{
          r: 16,
          group: "poorer"
      }, {
          r: 16,
          group: "richer"
      }])
      .join("circle")
      .attr("class", "legend-circle")
      .attr("cx", 20)
      .attr("cy", (_, i) => 60 + i * 40)
      .attr("r", d => d.r)
      .attr("fill", d => (d.group == "poorer" ? COLOR_POOR : COLOR_RICH));

  // Add legend labels
  const nb_people_bubble = "40 million"
  const legendLabels = legend
      .selectAll(".legend-label")
      .data([{
          group: "poorer",
          label: nb_people_bubble + " poorer people"
      }, {
          group: "richer",
          label: nb_people_bubble + " richer people"
      }])
      .enter()
      .append("text")
      .attr("class", "legend-label")
      .attr("x", 50)
      .attr("y", (_, i) => 74 + i * 40)
      .text(d => d.label)
      .attr("fill", "black")
      .attr("font-size", "40px")
      .attr("color", "black");
}