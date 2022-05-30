let WIDTH = 800, HEIGHT = 800;
const SHOWTIME = false;
const GUESS_CLASS_NAMES = ["guess-correct", "guess-one", "guess-two", "guess-wrong"];
const DATASET = "2021_ELB_region.geojson";

// UI & Page elements
let quiz = d3.select("#quiz");
let svg, g_elements, g_labels, tooltip, guessText, timeText;
let path;

// Quiz Data
let propName = undefined;
let allItems = [];
let fullscreen = false;

// Current quiz attempt info
let currentItemName = undefined;
let currentItemElement = undefined;
let incorrectAttempts = 0;
let remainingItems = [];
let guessedItems = 0;
let incorrectGuessesTotal = 0, guessCount = 0;
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
    if(SHOWTIME) console.log(formatTime(Date.now() - startTime, true))
    console.log(Math.floor((1-incorrectGuessesTotal/guessCount)*100));
    
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

const updateTooltipPosition = (e) => {
    let x = e.clientX || e.sourceEvent.clientX;
    let y = (e.clientY || e.sourceEvent.clientY) + 30;

    if(y < 0) y = -80;
    
    let { width, height } = tooltip.node().getBoundingClientRect();

    if(x + width + 10 > WIDTH) x = WIDTH - width - 10;
    if(y + height > HEIGHT) y = HEIGHT - height;

    tooltip.attr('x', x).attr('y', y);
}

const updateSize = (width, height) => {
    if(!svg) return;

    WIDTH = width, HEIGHT = height;
    svg.attr("width", width).attr("height", height);
}

const createLabel = (f, name) => {
    // Make label appear
    let label = g_labels.append("text").text(name).attr('class', 'element-label');
    
    // Centre it on the element
    let [labelX, labelY] = path.centroid(f);
    console.log(labelX, labelY);

    // get its computed size
    let w = label.node().getBBox().width;
    let h = label.node().getBBox().height;
    console.log(w, h) 
    label.attr('x', labelX - w/2).attr('y', labelY + h/2); // centre it slightly better

    setTimeout(() => label.remove(), 2000); // make it disappear after 2 seconds
}

const onClick = (e) => {
    // Only left clicks count as clicks.
    if(e.button !== 0) return;
    const feature = e.path[0].__data__;
    const guess = feature.properties[propName];
    
    // Correct guess
    if(guess === currentItemName) {
        // Update class of path
        e.path[0].classList.add(GUESS_CLASS_NAMES[incorrectAttempts > 3 ? 3 : incorrectAttempts]);
        incorrectAttempts = 0;
        flashingAnswer = false;
        guessedItems++;
        guessCount++;
        clearInterval(flashingInterval);

        generateNewGuess();
        updateTooltipPosition(e);
    }
    // Clicked on an element that has already been selected
    else if(!remainingItems.includes(guess)) {
        createLabel(feature, guess);
    }
    // Incorrect guess
    else {
        createLabel(feature, guess);
        console.log("WRONG, FUCKER! THAT WAS " + guess);
        
        guessCount++;
        incorrectGuessesTotal++;

        // Increment failed attempts
        if(incorrectAttempts < 4) incorrectAttempts++;
        
        // Start flashing!!
        if (incorrectAttempts === 3 && !flashingAnswer) {
            currentItemElement = svg.selectAll("path").nodes().find(f => f.__data__.properties[propName] === currentItemName);
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
    if(SHOWTIME) {
        let updateTime = () => {
            timeText.text(formatTime(Date.now() - startTime, false));
        };
    
        updateTime();
        timeInterval = setInterval(updateTime, 1000);
    }
    

    // Clear the guess classes
    svg.selectAll("path").nodes().forEach(f => f.classList.remove(...GUESS_CLASS_NAMES));

    currentItemName = currentItemElement = undefined;
    incorrectAttempts = incorrectGuessesTotal = guessedItems = 0;
    remainingItems = [...allItems];
    isQuizComplete = false;

    generateNewGuess();
}

const onMouseMove = (e) => {
    updateTooltipPosition(e);
};

const onKeyDown = (e) => {
    // R
    if(e.keyCode === 82) resetQuiz();
    // F
    else if(e.keyCode === 70) {
        if(fullscreen) updateSize(800, 800);
        else updateSize(quiz.node().getBoundingClientRect().width, quiz.node().getBoundingClientRect().height);

        fullscreen = !fullscreen;
    }
};

window.onresize = (e) => {
    if(!svg || !quiz) return;
    
    if(fullscreen) updateSize(quiz.node().getBoundingClientRect().width, quiz.node().getBoundingClientRect().height)
}

/* Initialise quiz with geoJSON data */
const setupQuiz = (geoJSON) => {
    
    // Fix data!!! Winding something or other. Idk I took this from someone named Andrew. Thanks Andrew.
    geoJSON.features = geoJSON.features.map((f) => turf.rewind(f,{reverse:true}));

    // Set the propName and items
    propName = geoJSON.metadata.propName;
    allItems  = geoJSON.features.map(f => f.properties[propName]);
    
    // Do math
    var projection = geoJSON.metadata.projection === "mercator" ? d3.geoMercator() : d3.geoEquirectangular();
    path = d3.geoPath().projection(projection);
    projection.fitSize([WIDTH, HEIGHT], geoJSON);

    // Setup the svg element
    svg = quiz.append("svg").attr("width", WIDTH).attr("height", HEIGHT);
    g_elements = svg.append("g").attr("class", "elements");
    g_labels = svg.append("g").attr("class", "labels");
    guessText = svg.append("text").attr('id', 'guess-text').attr('x', 50).attr('y', 50);
    tooltip = svg.append("text").attr('id', 'tooltip').attr('y', -160);
    timeText = svg.append("text").attr('id', 'time-text').attr('x', WIDTH-80).attr('y', 50);

    // Elements
    g_elements.selectAll("path")
        .data(geoJSON.features)
        .enter()
        .append('path')
        .attr('d', path)
        // .on('click', onClick);
        .on('mousedown', onClick);

    // Handle zooming and panning
    svg.call(d3.zoom()
        .on('zoom', (e) => {
            g_elements.attr('transform', e.transform);
            
            g_labels.attr('transform', e.transform);
            onMouseMove(e);
        })
        // Only zoom with middle mouse, only pan with left click. Not sure if this is wanted
        .filter((e) => e.button === 0 || e.button === 1)
        // .filter((e) => e.type === "wheel" ? e.button === 0 : e.button === 1)
    );

    svg.on("dblclick.zoom", null) // no double click to zoom
    svg.on("mousemove", onMouseMove);
    svg.on("mouseout", (e) => tooltip.attr('x', -50).attr('y', -150));
    d3.select("body").on("keydown", onKeyDown);

    // Reset quiz (start it)
    resetQuiz();
};

let loading = quiz.append("p").text("Loading...");

// Get dataset and setup quiz
d3.json(`./${DATASET}.geojson`).then(setupQuiz).then(() => loading.remove());

// Helper functions
function formatTime(ms, includeMillis=false) {
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / 1000 / 60));
    ms = ms % 1000;
  
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    ms = (ms < 10) ? "00" + ms : (ms < 100 ? "0" + ms : ms); 

    return minutes + ":" + seconds + (includeMillis ? `.${ms%1000}` : '');
  }