import assert from "node:assert/strict";
import test from "node:test";

import { animateCount } from "../landing/src/lib/motion.js";

test("hero counters never render negative values from an early frame timestamp", () => {
  const scheduled = [];
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => {
    scheduled.push(callback);
    return scheduled.length;
  };

  try {
    const node = {
      dataset: {
        count: "99.98",
        countDecimals: "2",
        countSuffix: "%"
      },
      textContent: ""
    };

    animateCount(node);
    scheduled.shift()(0);

    assert.equal(node.textContent, "0.00%");
  } finally {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  }
});
