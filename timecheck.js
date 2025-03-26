#!/usr/bin/env node
const now = new Date(); console.log("Current time:", now.toLocaleString()); console.log("Hour:", now.getHours()); console.log("Is daytime (1pm-7pm):", now.getHours() >= 13 && now.getHours() < 19);
