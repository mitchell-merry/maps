const WIDTH = 800, HEIGHT = 800;
const GUESS_CLASS_NAMES = ["guess-correct", "guess-one", "guess-two", "guess-wrong"];
const DATASET = "RPK_PRECINCTS";

// UI & Page elements
let svg, g, tooltip, guessText;

let propName = undefined;
let allItems = [];
let remainingItems = [];
let guessedItems = 0;
let incorrectGuessesTotal = 0;

let currentItemName = undefined;
let currentItemElement = undefined;
let incorrectAttempts = 0;

let flashingAnswer = false;
let flashingInterval = null;
let flashTime = 1000;

const generateNewGuess = () => {
    currentItemName = remainingItems[Math.floor(Math.random()*remainingItems.length)];
    let clickString = `${guessedItems}/${allItems.length} Click on ${currentItemName}`;
    if(allItems.length === guessedItems) clickString = "";
    guessText.text(clickString);
    tooltip.text(clickString);
    remainingItems = remainingItems.filter(i => i !== currentItemName);
};

const onClick = (e) => {
    // Only left clicks count as clicks.
    if(e.button !== 0) return;

    const guess = e.path[0].__data__.properties[propName];
    // Correct guess
    if(guess === currentItemName) {
        // Update class of path
        e.path[0].classList.add(GUESS_CLASS_NAMES[incorrectAttempts]);
        incorrectAttempts = 0;
        flashingAnswer = false;
        guessedItems++;
        clearInterval(flashingInterval);

        generateNewGuess();
    }
    // Clicked on an element that has already been selected
    else if(!remainingItems.includes(guess)) {
        console.log("That's " + guess);
    }
    // Incorrect guess
    else {
        console.log("WRONG, FUCKER! THAT WAS " + guess);
        currentItemElement = Array.from(svg.selectAll("path")._groups[0]).find(f => f.__data__.properties[propName] === currentItemName);

        // Increment failed attempts
        if(incorrectAttempts < 4) incorrectAttempts++;
        
        // Start flashing!!
        if (incorrectAttempts === 3 && !flashingAnswer) {
            flashingAnswer = true;

            let flash = () => currentItemElement.classList.toggle(GUESS_CLASS_NAMES[3]);
            flash();

            flashingInterval = setInterval(flash, flashTime);
        }
    }
};

const resetQuiz = () => {
    clearInterval(flashingInterval);
    flashingAnswer = false;

    currentItemName = currentItemElement = undefined;
    incorrectAttempts = incorrectGuessesTotal = guessedItems = 0;
    remainingItems = [...allItems];

    // Clear the guess classes
    svg.selectAll("path")._groups[0].forEach(f => f.classList.remove(...GUESS_CLASS_NAMES));

    generateNewGuess();
}

const onMouseMove = (e) => { tooltip.attr('x', e.clientX).attr('y', e.clientY+30); };

const onKeyDown = (e) => {
    // Alt+R
    if(e.altKey && e.keyCode === 82) resetQuiz();
};

/* Initialise quiz with geoJSON data */
const setupQuiz = (geoJSON) => {
    // Fix data!!! Winding something or other. Idk I took this from someone named Andrew. Thanks Andrew.
    geoJSON.features = geoJSON.features.map((f) => turf.rewind(f,{reverse:true}));

    // Set the propName and items
    propName = geoJSON.metadata.propName;
    allItems  = geoJSON.features.map(f => f.properties[propName]);
    
    // Do math
    var projection = geoJSON.metadata.projection === "mercator" ? d3.geoMercator : d3.geoEquirectangular();
    var geoGenerator = d3.geoPath().projection(projection);
    projection.fitSize([WIDTH, HEIGHT], geoJSON);

    // Setup the svg element
    svg = d3.select("#map").append("svg").attr("width", WIDTH).attr("height", HEIGHT);
    g = svg.append("g");
    guessText = svg.append("text").attr('id', 'guess-text').attr('x', 50).attr('y', 50);
    tooltip = svg.append("text").attr('id', 'tooltip');

    // Elements
    g.selectAll("path")
        .data(geoJSON.features)
        .enter()
        .append('path')
        .attr('d', geoGenerator)
        .on('mousedown', onClick);

    // Handle zooming and panning
    svg.call(d3.zoom()
        .on('zoom', (e) => g.attr('transform', e.transform))
        // Only zoom with middle mouse, only pan with left click. Not sure if this is wanted
        .filter((e) => e.type === "wheel" ? e.button === 0 : e.button === 1)
    );

    svg.on("dblclick.zoom", null) // no double click to zoom
    svg.on("mousemove", onMouseMove);
    svg.on("mouseout", (e) => tooltip.attr('x', -50).attr('y', -50));
    d3.select("body").on("keydown", onKeyDown);

    // Reset quiz (start it)
    resetQuiz();
};

// Get dataset and setup quiz
d3.json(`http://localhost:3000/${DATASET}.geojson`).then(setupQuiz);