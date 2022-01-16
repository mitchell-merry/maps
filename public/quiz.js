const WIDTH = 800, HEIGHT = 800;
const GUESS_CLASS_NAMES = ["guess-correct", "guess-one", "guess-two", "guess-wrong"];
const DATASET = "KH_PNP_DISTRICTS";

// UI & Page elements
let svg, g, tooltip, guessText, timeText;

// Quiz Data
let propName = undefined;
let allItems = [];

// Current quiz attempt info
let currentItemName = undefined;
let currentItemElement = undefined;
let incorrectAttempts = 0;
let remainingItems = [];
let guessedItems = 0;
let incorrectGuessesTotal = 0;
let isQuizComplete = false;

// Time
let startTime = 0;
let timeInterval = null;

// Flashing
let flashingAnswer = false;
let flashingInterval = null;
let flashTime = 1000;

const quizComplete = () => {
    clearInterval(timeInterval);
    isQuizComplete = true;
    console.log(formatTime(Date.now() - startTime, true))
    
    // Clear UI
    guessText.text('');
    tooltip.text('');
}

const generateNewGuess = () => {
    // Complete
    if(remainingItems.length === 0) quizComplete();
    // Not complete
    else {
        // Generate the next item
        currentItemName = remainingItems[Math.floor(Math.random()*remainingItems.length)];
        
        // Update UI
        let clickString = `${guessedItems}/${allItems.length} Click on ${currentItemName}`;
        guessText.text(clickString);
        tooltip.text(clickString);
        
        // Remove the chosen item
        remainingItems = remainingItems.filter(i => i !== currentItemName);
    }
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
    
    clearInterval(timeInterval);
    startTime = Date.now();
    let updateTime = () => {
        timeText.text(formatTime(Date.now() - startTime, false));
    };
    updateTime();
    timeInterval = setInterval(updateTime, 1000);
    

    // Clear the guess classes
    svg.selectAll("path")._groups[0].forEach(f => f.classList.remove(...GUESS_CLASS_NAMES));

    currentItemName = currentItemElement = undefined;
    incorrectAttempts = incorrectGuessesTotal = guessedItems = 0;
    remainingItems = [...allItems];
    isQuizComplete = false;

    generateNewGuess();
}

const onMouseMove = (e) => {
    let x = e.clientX || e.sourceEvent.clientX;
    let y = e.clientY || e.sourceEvent.clientY;
    if(y < 0) y = -80;
    tooltip.attr('x', x).attr('y', y+30); 
};

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
    timeText = svg.append("text").attr('id', 'time-text').attr('x', WIDTH-80).attr('y', 50).text("0:00");

    // Elements
    g.selectAll("path")
        .data(geoJSON.features)
        .enter()
        .append('path')
        .attr('d', geoGenerator)
        .on('mousedown', onClick);

    // Handle zooming and panning
    svg.call(d3.zoom()
        .on('zoom', (e) => {
            g.attr('transform', e.transform);
            onMouseMove(e);
        })
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

// Helper functions
function formatTime(ms, includeMillis=false) {
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / 1000 / 60));
    ms = ms % 1000;
  
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    ms = (ms < 10) ? "00" + ms : (ms < 100 ? "0" + ms : ms); 

    return minutes + ":" + seconds + (includeMillis ? `.${ms%1000}` : '');
  }