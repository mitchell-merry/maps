d3.json('http://localhost:3000/LVP_SUB.geojson').then((data) => {
    data.features = data.features.map(function(f) {
        return turf.rewind(f,{reverse:true});
    });

    const width = 800, height = 800;
    var projection = d3.geoEquirectangular();
    var geoGenerator = d3.geoPath().projection(projection);
    projection.fitSize([width, height], data);

    var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
    var g = svg.append("g");
    
    g.selectAll("path").data(data.features).enter().append('path').attr('d', geoGenerator);

    const handleZoom = (e) => d3.select('g').attr('transform', e.transform);

    svg.call(d3.zoom().on('zoom', handleZoom));
});