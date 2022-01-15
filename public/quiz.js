

d3.json('http://localhost:3000/LVP_SUB.geojson').then((data) => {
    // Fix data!!! Winding something or other. Idk I took this from someone named Andrew. Thanks Andrew.
    data.features = data.features.map((f) => turf.rewind(f,{reverse:true}));

    // Get the names, i.e. the quiz.
    let names = data.features.map(f => f.properties["SSC_NAME_2016"]);
    let currentGuess = undefined;

    const width = 800, height = 800;
    var projection = d3.geoEquirectangular();
    var geoGenerator = d3.geoPath().projection(projection);
    projection.fitSize([width, height], data);

    var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
    var g = svg.append("g");
    var to_guess = svg.append("text").attr('x', 50).attr('y', 50);

    const generateNewGuess = () => {
        currentGuess = names[Math.floor(Math.random()*names.length)];
        to_guess.text(currentGuess);
        names = names.filter(i => i !== currentGuess);
    }

    const onClick = (e) => {
        const guess = e.path[0].__data__.properties["SSC_NAME_2016"];
        
        if(guess === currentGuess) generateNewGuess();
        else console.log("WRONG, FUCKER! THAT WAS " + guess);
    }

    g.selectAll("path")
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', geoGenerator)
        .on('click', onClick);

    const handleZoom = (e) => g.attr('transform', e.transform);
    svg.call(d3.zoom().on('zoom', handleZoom));

    generateNewGuess();
});