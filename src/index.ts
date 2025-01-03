import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.send("Hello World!");
    const b = 1 + 1;
    if (b === 2) {
        console.log("aaa");
    }
});

app.listen(3000, () => {
    console.log("Started server at: http://localhost:3000");
});
