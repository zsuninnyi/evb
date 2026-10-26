console.log("worker idle");

const keepAlive = setInterval(() => {}, 60_000);

const stop = () => {
  clearInterval(keepAlive);
  console.log("worker stopped");
  process.exit(0);
};

process.on("SIGTERM", stop);
process.on("SIGINT", stop);
