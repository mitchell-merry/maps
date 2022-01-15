import express from "express";
const app = express();
const port = 3000;

app.get('/data', (req, res) => {
  res.sendFile('data/LVP_SUB_FIXED.geojson', { root: '.' })
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});

app.use(express.static('public'));
app.use(express.static('data'));