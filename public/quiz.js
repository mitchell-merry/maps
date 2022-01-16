const WIDTH = 800, HEIGHT = 800;
const GUESS_CLASS_NAMES = ["guess-correct", "guess-one", "guess-two", "guess-wrong"];
const DATASET = "RPK_PRECINCTS";

let propName = undefined;
let items = [];

let currentItemName = undefined;
let currentItemElement = undefined;
let incorrectAttempts = 0;

let flashingAnswer = false;
let flashingInterval = null;
let flashTime = 1000;

const generateNewGuess = () => {
    currentItemName = items[Math.floor(Math.random()*items.length)];
    d3.select('#guess-text').text(currentItemName);
    items = items.filter(i => i !== currentItemName);
}

const onClick = (e) => {
    const guess = e.path[0].__data__.properties[propName];
    
    if(guess === currentItemName) {

        // Update class of path
        e.path[0].classList.add(GUESS_CLASS_NAMES[incorrectAttempts]);
        incorrectAttempts = 0;
        flashingAnswer = false;
        clearInterval(flashingInterval);

        generateNewGuess();
    }
    else if(!items.includes(guess)) {
        console.log("That's " + guess);
    }
    else {
        console.log("WRONG, FUCKER! THAT WAS " + guess);
        currentItemElement = Array.from(d3.select("#map svg").selectAll("path")._groups[0]).find(f => f.__data__.properties[propName] === currentItemName);

        // Increment failed attempts
        if(incorrectAttempts < 4) incorrectAttempts++;
        
        if (incorrectAttempts === 3 && !flashingAnswer) {
            flashingAnswer = true;

            let flash = () => currentItemElement.classList.toggle(GUESS_CLASS_NAMES[3]);
            flash();
            flashingInterval = setInterval(flash, flashTime);

        }
    }
}

const setupQuiz = (geoJSON) => {
    // Fix data!!! Winding something or other. Idk I took this from someone named Andrew. Thanks Andrew.
    geoJSON.features = geoJSON.features.map((f) => turf.rewind(f,{reverse:true}));

    // Set the propName and items
    propName = geoJSON.metadata.propName;
    items = geoJSON.features.map(f => f.properties[propName]);
    
    // Do math
    var projection = geoJSON.metadata.projection === "mercator" ? d3.geoMercator : d3.geoEquirectangular();
    var geoGenerator = d3.geoPath().projection(projection);
    projection.fitSize([WIDTH, HEIGHT], geoJSON);

    // Setup the svg element
    var svg = d3.select("#map").append("svg").attr("width", WIDTH).attr("height", HEIGHT);
    var g = svg.append("g");
    svg.append("text").attr('id', 'guess-text').attr('x', 50).attr('y', 50);

    // Elements
    g.selectAll("path")
        .data(geoJSON.features)
        .enter()
        .append('path')
        .attr('d', geoGenerator)
        .on('mousedown', onClick);

    // Handle zooming and panning
    svg.call(d3.zoom().on('zoom', (e) => g.attr('transform', e.transform)));
    svg.on("dblclick.zoom", null) // no double click to zoom

    // Start the quiz with the first guess
    generateNewGuess();
};

// Get dataset and setup quiz
d3.json(`http://localhost:3000/${DATASET}.geojson`).then(setupQuiz);