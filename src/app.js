const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { PORT } = require("./config/env");
const { errorHandler } = require("./middlewares/error.middleware");
const authRouter = require("./modules/auth/auth.router");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
