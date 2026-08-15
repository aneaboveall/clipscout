import assert from "node:assert/strict";
import test from "node:test";
import { parseQueries, SearchInputError } from "../lib/search-utils";
import { searchStockVideos } from "../lib/search-service";

test("keeps a single African fintech search as one group", async () => {
  const queries = parseQueries("African fintech");
  const response = await searchStockVideos(queries, { page: 1, perPage: 20 });
  assert.deepEqual(queries, ["African fintech"]);
  assert.deepEqual(response.groups.map((group) => group.query), ["African fintech"]);
});

test("deduplicates and trims comma-separated searches", () => {
  assert.deepEqual(parseQueries("African fintech, African fintech, , money transfer"), ["African fintech", "money transfer"]);
});

test("keeps the five-shot B-roll brief in independent groups", async () => {
  const input = "African fintech, person using phone, money transfer, Lagos street, happy customer";
  const queries = parseQueries(input);
  assert.deepEqual(queries, [
    "African fintech",
    "person using phone",
    "money transfer",
    "Lagos street",
    "happy customer",
  ]);

  const response = await searchStockVideos(queries, { page: 1, perPage: 20 });
  assert.deepEqual(response.groups.map((group) => group.query), queries);
  assert.ok(response.groups.every((group) => Array.isArray(group.results)));
});

test("enforces the ten-query limit", () => {
  const input = Array.from({ length: 11 }, (_, index) => `shot ${index + 1}`).join(",");
  assert.throws(
    () => parseQueries(input),
    (error) => error instanceof SearchInputError && error.message === "Maximum 10 searches at once.",
  );
});

test("rejects an empty search", () => {
  assert.throws(
    () => parseQueries(" , , "),
    (error) => error instanceof SearchInputError && error.message === "Enter at least one search term.",
  );
});

test("returns successful provider results when another provider fails", async () => {
  const response = await searchStockVideos(
    ["money transfer"],
    { page: 1, perPage: 20 },
    [
      {
        id: "pexels",
        name: "Pexels",
        available: true,
        async search() { throw new Error("Pexels rate limit reached."); },
      },
      {
        id: "pixabay",
        name: "Pixabay",
        available: true,
        async search() {
          return {
            results: [{ id: "1", provider: "Pixabay", title: "Money transfer", thumbnailUrl: "https://example.test/thumb.jpg" }],
            hasMore: false,
          };
        },
      },
    ],
  );
  assert.equal(response.groups[0].results.length, 1);
  assert.match(response.providers.pexels.error ?? "", /rate limit/i);
  assert.equal(response.providers.pixabay.error, undefined);
});
